import { nanoid } from "nanoid";
import {
    Chunk,
    FileXlsxRequest, FileConfirmRequest,
    XlsxHeader,
} from "../../../shared/modules/file/file.interface";
import { fileRoutes } from "../../../shared/modules/file/file.router";
import { analyzeCellType, analyzeXlsx, assembly } from "../../methods/xlsx";
import { createField, getFieldList } from "../form/form.service";
import { createRadio } from "../radio/radio.service";
import { insertRecords } from "../record/record.service";
import { RecordEntity } from "../../../shared/modules/record/record.entity";

const chunkList: Array<Chunk> = [];
const dataList: Array<{ tempid: string; filename: string; header: XlsxHeader[]; data: string[][] }> = [];

async function readxlsx(request: FileXlsxRequest) {
    const { file } = request;
    const { fileid, filename, size, chunk_site, chunk_data } = file;
    chunkList.push({ fileid, filename, size, chunk_site, chunk_data });
    const chunks = chunkList.filter((chunk) => fileid === chunk.fileid);
    if (chunks.every((chunk) => chunk.chunk_site < size)) throw "文件不完整";
    const buffer = await assembly(chunks);
    if (!buffer) throw "文件组装失败";
    const { header, data } = await analyzeXlsx(buffer);
    const result = header.map((field, index) => {
        const cells = data.map((cells) => cells[index]);
        const { type, sub } = analyzeCellType(cells);
        return { field, type, sub };
    });
    dataList.push({ tempid: fileid, filename, header: result, data });
    chunks.forEach((i) => (i.chunk_data = ""));
    return { tempid: fileid, header: result, size: data.length };
}

async function confirm(request: FileConfirmRequest) {
    const { tempid, fields, usedata } = request;
    const existData = dataList.find((i) => i.tempid === tempid);
    if (!existData) throw "数据不存在";
    const { header, data, filename } = existData;
    const form_name = filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "") + Math.random().toString(36).slice(4, 8);
    for (let i = 0; i < header.length; i++) {
        const field_id = await createField({
            form_name: form_name,
            field_name: fields[i].field,
            field_type: fields[i].type,
            required: false,
            disabled: !fields[i].check,
        });
        if (!field_id || !["select", "mulselect", "checkbox"].includes(fields[i].type)) {
            continue;
        }
        for (const radio_name of header[i].sub || []) {
            await createRadio({ field_id, radio_name, useful: true });
        }
    }

    const fieldMap = new Map<string, string>();
    const radioMap = new Map<string, string>();

    (await getFieldList(form_name)).map((field) => {
        fieldMap.set(field.field_name, field.id);
        field.radios?.map((radio) => {
            radioMap.set(field.id + radio.radio_name, radio.id);
        });
    });

    if (!usedata) {
        return { success: true };
    }

    const records: Omit<RecordEntity, "id" | "create_time" | "update_time" | "delete_time">[] = [];

    for (const row of data) {
        const item_id = nanoid(6);
        row.forEach((cell, index) => {
            if (!cell) return;
            const field_id = fieldMap.get(fields[index].field);
            let field_value: string | undefined;
            if (field_id && radioMap.has(field_id + cell)) {
                field_value = radioMap.get(field_id + cell)!;
            } else {
                field_value = cell;
            }
            if (field_id) records.push({ item_id, field_id, field_value });
        });
    }
    await insertRecords(records);
    return { success: true };
}

export const fileController = {
    routes: fileRoutes,
    handlers: { readxlsx, confirm },
};
