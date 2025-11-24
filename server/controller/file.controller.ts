import { Chunk, FileRouterInstance, FileXlsxRequest, FileXlsxResponse } from "../../shared/router/FileRouter";
import { inject } from "../lib/inject";
import { analyzeCellType, analyzeXlsx, assembly } from "../service/file.service";

const chunkList: Array<Chunk> = [];

async function readxlsx(query: FileXlsxRequest): Promise<FileXlsxResponse> {
    const { file, auth } = query;
    const { fileid, filename, size, chunk_site, chunk_data } = file;
    chunkList.push({ fileid, filename, size, chunk_site, chunk_data });
    const chunks = chunkList.filter((chunk) => fileid === chunk.fileid);
    if (chunks.every((chunk) => chunk.chunk_site < size)) {
        return { success: false };
    }
    const buffer = await assembly(chunks);
    if (!buffer) {
        return { success: false };
    }
    const { header, data } = await analyzeXlsx(buffer);
    const result = header.map((field, index) => {
        const cells = data.map((cells) => cells[index]);
        const { type, sub } = analyzeCellType(cells);
        return { field, type, sub };
    });
    return { success: true, data: result };
}

export const fileController = new FileRouterInstance(inject, { readxlsx });
