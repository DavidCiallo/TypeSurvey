package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"log"
	"os"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// Exact replication of server/methods/crypto.ts so tokens, passwords and
// verification links created by the Bun server keep working:
//   key  = SHA256(SECRET)
//   iv   = SHA256("cfrs-iv-" + SECRET)[:16]
//   enc  = AES-256-CBC( nonceHexSuffix + reverse(plaintext) ) -> hex
// where nonceHexSuffix is the last `noncelen` hex chars of 128 random bytes.

var (
	cryptoKey []byte
	cryptoIV  []byte
	nonceLen  = 4

	// tokenMACKey is derived from SECRET but is independent of cryptoKey, so
	// the token MAC never shares key material with the (unauthenticated)
	// AES-CBC legacy token format.
	tokenMACKey []byte
)

// minSecretLen is the shortest SECRET accepted at boot.
const minSecretLen = 16

func initCrypto() {
	secret := os.Getenv("SECRET")
	insecureOK := envBool("ALLOW_INSECURE_SECRET", false)

	if len(secret) < minSecretLen {
		if !insecureOK {
			if secret == "" {
				log.Fatalf("[FATAL] SECRET is not set. Every token, password hash and share link is " +
					"derived from it, and a per-boot fallback would silently invalidate all sessions on " +
					"restart. Set SECRET in the environment (see .env.example). " +
					"Set ALLOW_INSECURE_SECRET=1 to start anyway with an ephemeral secret (development only).")
			}
			log.Fatalf("[FATAL] SECRET is too short (%d characters, minimum %d). "+
				"Use a long random value (e.g. `openssl rand -hex 32`). "+
				"Set ALLOW_INSECURE_SECRET=1 to start anyway (development only).",
				len(secret), minSecretLen)
		}
		if secret == "" {
			secret = randomHex(minSecretLen)
			log.Printf("[WARN] SECRET is not set — using an ephemeral random secret. " +
				"All issued tokens become invalid on the next restart.")
		} else {
			log.Printf("[WARN] SECRET is shorter than %d characters — this weakens every "+
				"credential derived from it.", minSecretLen)
		}
	}

	nonceLen = envInt("NONCE_LENGTH", 4)
	k := sha256.Sum256([]byte(secret))
	cryptoKey = k[:]
	iv := sha256.Sum256([]byte("cfrs-iv-" + secret))
	cryptoIV = iv[:16]

	mac := sha256.Sum256([]byte("typesurvey-token-v2|" + secret))
	tokenMACKey = mac[:]
}

// randomHex returns n cryptographically random bytes, hex-encoded.
func randomHex(n int) string {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		log.Fatalf("[FATAL] crypto/rand is unavailable: %v", err)
	}
	return hex.EncodeToString(buf)
}

func pkcs7Pad(data []byte, blockSize int) []byte {
	pad := blockSize - len(data)%blockSize
	out := make([]byte, len(data)+pad)
	copy(out, data)
	for i := len(data); i < len(out); i++ {
		out[i] = byte(pad)
	}
	return out
}

func pkcs7Unpad(data []byte) []byte {
	if len(data) == 0 {
		return nil
	}
	pad := int(data[len(data)-1])
	if pad == 0 || pad > len(data) {
		return nil
	}
	return data[:len(data)-pad]
}

func reverseString(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

func aesEncrypt(plain string) string {
	nonceRaw := make([]byte, 128)
	rand.Read(nonceRaw)
	nonceHex := hex.EncodeToString(nonceRaw)
	nonce := nonceHex[len(nonceHex)-nonceLen:]

	block, err := aes.NewCipher(cryptoKey)
	if err != nil {
		return ""
	}
	data := pkcs7Pad([]byte(nonce+reverseString(plain)), aes.BlockSize)
	out := make([]byte, len(data))
	cipher.NewCBCEncrypter(block, cryptoIV).CryptBlocks(out, data)
	return hex.EncodeToString(out)
}

func aesDecrypt(encrypted string) (string, bool) {
	raw, err := hex.DecodeString(encrypted)
	if err != nil || len(raw) == 0 || len(raw)%aes.BlockSize != 0 {
		return "", false
	}
	block, err := aes.NewCipher(cryptoKey)
	if err != nil {
		return "", false
	}
	out := make([]byte, len(raw))
	cipher.NewCBCDecrypter(block, cryptoIV).CryptBlocks(out, raw)
	unpadded := pkcs7Unpad(out)
	if unpadded == nil {
		return "", false
	}
	plain := string(unpadded)
	if len(plain) < nonceLen {
		return "", false
	}
	return reverseString(plain[nonceLen:]), true
}

func hashGenerate(data string) string {
	sum := sha256.Sum256([]byte(data))
	return hex.EncodeToString(sum[:])
}

// codeGenerate mirrors crypto.ts: 1000 + (sum of UTF-16 code units, seeded
// with 1) * noncelen % 9000 — used for record access codes.
func codeGenerate(originalData string) string {
	sum := 1
	for _, r := range originalData {
		sum += int(r)
	}
	return strconv.Itoa(1000 + (sum*nonceLen)%9000)
}

// ---------- password hashing ----------

// bcryptCost is the work factor used for new password hashes.
const bcryptCost = 12

// bcryptInput folds inputs longer than bcrypt's 72-byte limit into a fixed
// size digest, so the whole password contributes instead of being silently
// truncated at 72 bytes.
func bcryptInput(password string) []byte {
	if len(password) > 72 {
		sum := sha256.Sum256([]byte(password))
		return []byte(hex.EncodeToString(sum[:]))
	}
	return []byte(password)
}

// hashPassword returns a bcrypt hash for a new or changed password.
// It returns "" on failure; callers must treat that as an error.
func hashPassword(password string) string {
	b, err := bcrypt.GenerateFromPassword(bcryptInput(password), bcryptCost)
	if err != nil {
		return ""
	}
	return string(b)
}

// verifyPassword accepts bcrypt hashes, and the legacy unsalted SHA-256 hex
// form so accounts created before bcrypt keep working until they log in.
func verifyPassword(stored, password string) bool {
	if stored == "" {
		return false
	}
	if strings.HasPrefix(stored, "$2") {
		return bcrypt.CompareHashAndPassword([]byte(stored), bcryptInput(password)) == nil
	}
	return subtle.ConstantTimeCompare([]byte(stored), []byte(hashGenerate(password))) == 1
}

// isLegacyPasswordHash reports whether stored uses the old unsalted SHA-256
// format and should be re-hashed on the next successful login.
func isLegacyPasswordHash(stored string) bool {
	return stored != "" && !strings.HasPrefix(stored, "$2")
}
