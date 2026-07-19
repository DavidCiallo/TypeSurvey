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

const chunkList: Array<Chunk> = [];
const dataList: Array<{ tempid: string; filename: string; header: XlsxHeader[]; data: string[][] }> = [];

async function readxlsx(request: FileXlsxRequest) {
    const { file } = request;
    const { fileid, filename, size, chunk_site, chunk_data } = file;
    chunkList.push({ fileid, filename, size, chunk_site, chunk_data });
    const chunks = chunkList.filter((chunk) => fileid === chunk.fileid);
    const totalReceived = chunks.reduce((sum, chunk) => sum + chunk.chunk_data.length, 0);
    if (totalReceived < size) return { tempid: "", header: [], size: 0 };
    const buffer = await assembly(chunks);
    if (!buffer) throw "文件组装失败";
    const { header, data } = await analyzeXlsx(buffer);
    const result = header.map((field, index) => {
        const cells = data.map((cells) => cells[index]);
        const { type, sub } = analyzeCellType(cells);
        return { field, type, sub };
    });
    dataList.push({ tempid: fileid, filename, header: result, data });
    for (let i = chunkList.length - 1; i >= 0; i--) {
        if (chunkList[i].fileid === fileid) {
            chunkList.splice(i, 1);
        }
    }
    return { tempid: fileid, header: result, size: data.length };
}

async function confirm(request: FileConfirmRequest) {
    const { tempid, fields, usedata, time_field_index } = request;
    const existIndex = dataList.findIndex((i) => i.tempid === tempid);
    if (existIndex === -1) throw "数据不存在";
    const existData = dataList[existIndex];
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
        if (!field_id || !["select", "mulselect", "checkbox", "checkboxgroup"].includes(fields[i].type)) {
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

    dataList.splice(existIndex, 1);

    if (!usedata) {
        return { success: true };
    }

    const BATCH_SIZE = 500;
    let batch: any[] = [];

    for (const row of data) {
        const item_id = nanoid(6);

        // Parse timestamp from selected time field
        let rowTime: number | undefined;
        if (time_field_index !== undefined && row[time_field_index]) {
            const parsed = new Date(row[time_field_index]).getTime();
            if (!isNaN(parsed)) rowTime = parsed;
        }

        for (let index = 0; index < row.length; index++) {
            const cell = row[index];
            if (!cell) continue;
            const field_id = fieldMap.get(fields[index].field);
            let field_value: string | undefined;
            if (field_id && radioMap.has(field_id + cell)) {
                field_value = radioMap.get(field_id + cell)!;
            } else {
                field_value = cell;
            }
            if (field_id) {
                const record: any = { item_id, field_id, field_value };
                if (rowTime) {
                    record.create_time = rowTime;
                    record.update_time = rowTime;
                }
                batch.push(record);
                if (batch.length >= BATCH_SIZE) {
                    await insertRecords(batch.splice(0, BATCH_SIZE));
                }
            }
        }
    }
    if (batch.length > 0) {
        await insertRecords(batch);
    }
    return { success: true };
}

export const fileController = {
    routes: fileRoutes,
    handlers: { readxlsx, confirm },
};
