export async function getChunks(file: File) {
    const base64String: string = await new Promise((r, j) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (!dataUrl) return j(new Error("读取文件数据失败。"));
            const base64Content = dataUrl.split(",")[1];
            r(base64Content);
        };
        reader.onerror = (error) => j(error);
        reader.readAsDataURL(file);
    });
    const random_id = Math.random().toString().slice(2, 8);
    const chunks = [];
    for (let i = 0; i < base64String.length; i += 0x18000) {
        const chunk = {
            fileid: random_id,
            filename: file.name,
            size: base64String.length,
            chunk_site: i + 0x18000,
            chunk_data: base64String.slice(i, i + 0x18000),
        };
        chunks.push(chunk);
    }
    return chunks;
}
