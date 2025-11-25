import crypto from "crypto";

const secret = process.env.SECRET || Date.now().toString(36);
const noncelen = Number(process.env.NONCE_LENGTH) || 4;

if (secret.length < 16 || noncelen < 6) {
    console.warn("Missing SECRET or NONCE_LENGTH in environment variables or too weak");
}

const secretKey = crypto.createHash("sha256").update(secret).digest();
const iv = crypto.randomBytes(16);

export function aesEncrypt(originalData: string): string {
    const nonce = crypto.randomBytes(128).toString("hex").slice(-noncelen);
    const dataToEncrypt = nonce + originalData.split("").reverse().join("");
    const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
    let encryptedData = cipher.update(dataToEncrypt, "utf8", "hex");
    encryptedData += cipher.final("hex");
    return encryptedData;
}

export function aesDecrypt(encryptedData: string): string | null {
    try {
        const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
        let decryptedData = decipher.update(encryptedData, "hex", "utf8");
        decryptedData += decipher.final("utf8");
        return decryptedData.slice(noncelen).split("").reverse().join("");
    } catch {
        return null;
    }
}

export function hashGenerate(originalData: string): string {
    return crypto.createHash("sha256").update(originalData).digest("hex");
}

export function codeGenerate(originalData: string): string {
    return String(1000 + (([...originalData].reduce((a, c) => a + c.charCodeAt(0), 1) * noncelen) % 9000));
}
