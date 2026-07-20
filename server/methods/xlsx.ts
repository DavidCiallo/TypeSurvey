import { FieldType } from "../../shared/impl/field";
import { Chunk } from "../../shared/modules/file/file.interface";
import xlsx from "xlsx";

export async function assembly(chunks: Array<Chunk>): Promise<Buffer<ArrayBuffer> | null> {
    if (chunks.length === 0) {
        return null;
    }
    const sorted = chunks.sort((a, b) => a.chunk_site - b.chunk_site);
    const buffers = sorted.map((i) => Buffer.from(i.chunk_data, "base64"));
    const binaryData = Buffer.concat(buffers);
    if (binaryData.length === 0) {
        return null;
    }
    return binaryData;
}

export async function analyzeXlsx(buffer: Buffer<ArrayBuffer>) {
    const workbook = xlsx.read(buffer, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Format Date cells to yyyy-mm-dd manually for reliability
    for (const key of Object.keys(worksheet)) {
        if (key[0] === "!") continue;
        const cell = worksheet[key];
        if (cell && cell.t === "d" && cell.v instanceof Date) {
            const d = cell.v;
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            cell.w = `${yyyy}-${mm}-${dd}`;
        }
    }

    const rawData = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: false,
    }).map((row) => row as string[]);

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
    const noEmptyCells = cells.filter((i) => i !== null).map(String);
    if (noEmptyCells.length === 0) {
        return { type: "text", sub: [] };
    }
    const set = new Set(noEmptyCells);

    // Single unique value -> checkbox
    if (set.size === 1) {
        return { type: "checkbox", sub: Array.from(set) };
    }

    // Low cardinality short values -> select
    if (noEmptyCells.every((i) => i.length < 8) && noEmptyCells.length / set.size > 10) {
        return { type: "select", sub: Array.from(set) };
    }

    // Email detection
    if (noEmptyCells.every((i) => /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(i))) {
        return { type: "email", sub: [] };
    }

    // Number detection
    if (noEmptyCells.every((i) => !isNaN(Number(i)) && i.trim() !== "")) {
        return { type: "number", sub: [] };
    }

    // Date detection (yyyy-mm-dd, yyyy/mm/dd, dd-mm-yyyy, etc.)
    const datePattern = /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})$/;
    if (noEmptyCells.every((i) => datePattern.test(i.trim()))) {
        return { type: "date", sub: [] };
    }

    // Time detection (HH:mm, HH:mm:ss)
    const timePattern = /^\d{1,2}:\d{2}(:\d{2})?$/;
    if (noEmptyCells.every((i) => timePattern.test(i.trim()))) {
        return { type: "time", sub: [] };
    }

    // Long text -> textarea
    const avgLen = noEmptyCells.reduce((sum, i) => sum + i.length, 0) / noEmptyCells.length;
    if (avgLen > 50) {
        return { type: "textarea", sub: [] };
    }

    // Mixed or unrecognized types -> fallback to text
    return { type: "text", sub: [] };
}
