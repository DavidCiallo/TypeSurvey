package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strconv"
	"time"
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
)

func initCrypto() {
	secret := os.Getenv("SECRET")
	if secret == "" {
		secret = strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	nonceLen = envInt("NONCE_LENGTH", 4)
	k := sha256.Sum256([]byte(secret))
	cryptoKey = k[:]
	iv := sha256.Sum256([]byte("cfrs-iv-" + secret))
	cryptoIV = iv[:16]

	if len(secret) < 16 || nonceLen < 6 {
		os.Stderr.WriteString("Missing SECRET or NONCE_LENGTH in environment variables or too weak\n")
	}
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
