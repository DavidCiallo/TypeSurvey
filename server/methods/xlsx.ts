import { FieldType } from "../../shared/impl/field";
import { Chunk } from "../../shared/router/FileRouter";
import xlsx from "xlsx";

export async function assembly(chunks: Array<Chunk>): Promise<Buffer<ArrayBuffer> | null> {
    if (chunks.length === 0) {
        return null;
    }
    const base64Data = chunks
        .sort((a, b) => a.chunk_site - b.chunk_site)
        .map((i) => i.chunk_data)
        .join("");
    if (base64Data.length < chunks[0].size) {
        return null;
    }
    const binaryData = Buffer.from(base64Data, "base64");
    return binaryData;
}

export async function analyzeXlsx(buffer: Buffer<ArrayBuffer>) {
    const workbook = xlsx.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null }).map((row) => row as string[]);

    const partRawData = rawData.slice(0, 10);
    const maxcollen = Math.max(...partRawData.map((c) => c.length));
    const headerIndex = partRawData.findIndex((i) => i.filter((i) => i !== null).length >= maxcollen);

    const header = rawData[headerIndex];
    const data = rawData.slice(headerIndex + 1);

    return { header, data };
}

export function analyzeCellType(cells: Array<string | null>): { type: FieldType; sub: Array<string> } {
    if (cells.length === 0) {
        return { type: "text", sub: [] };
    }
    const noEmptyCells = cells.filter((i) => i !== null);
    const set = new Set(noEmptyCells);
    if (set.size == 1) {
        return { type: "checkbox", sub: Array.from(set) };
    }
    if (noEmptyCells.every((i) => i.length < 8) && noEmptyCells.length / set.size > 10) {
        return { type: "select", sub: Array.from(set) };
    }
    if (noEmptyCells.every((i) => i?.includes("@"))) {
        return { type: "email", sub: [] };
    }
    return { type: "text", sub: [] };
}
