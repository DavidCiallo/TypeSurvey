export function encodeBase64(str: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const binString = String.fromCodePoint(...data);
    return btoa(binString);
}

export function decodeBase64(base64: string) {
    const binString = atob(base64);
    const data = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const decoder = new TextDecoder();
    return decoder.decode(data);
}
