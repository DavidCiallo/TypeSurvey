import { nanoid } from "nanoid";
import {
    RecordHistoryRequest, RecordSubmitRequest, RecordAllRequest,
} from "../../../shared/modules/record/record.interface";
import { recordRoutes } from "../../../shared/modules/record/record.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { getFieldList, getFormNameByField } from "../form/form.service";
import { getAllRecord, getRecords, submitRecord } from "./record.service";
import { codeGenerate } from "../../methods/crypto";

async function history(request: RecordHistoryRequest) {
    request = RecordHistoryRequest.self(request);
    const { id, code } = request;
    const records = await getRecords(id);
    if (records.length) {
        const { field_id, item_id } = records[0];
        const form_name = await getFormNameByField(field_id);
        const fields = await getFieldList(form_name);
        if (!code || code !== codeGenerate(item_id)) throw "鉴权失败";
        return { form_name, item_id, code, fields, records };
    } else {
        const form_name = await getFormNameByField(request.id);
        if (!form_name) throw "表单不存在";
        const item_id = nanoid(6);
        const code = codeGenerate(item_id);
        const fields = await getFieldList(form_name);
        return { form_name, item_id, code, fields, records: [] };
    }
}

async function submit(request: RecordSubmitRequest) {
    request = RecordSubmitRequest.self(request);
    const { item_id, field_id, field_value } = request;
    if (String(field_value)?.length > 0x3e8) throw "内容过长";
    await submitRecord({ item_id, field_id, field_value });
    return {};
}

async function all(request: RecordAllRequest) {
    request = RecordAllRequest.self(request);
    const { form_name, page, search } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    const records = await getAllRecord(form_name);
    const group: Array<{
        item_id: string;
        code: string;
        data: typeof records;
    }> = [];
    for (const r of records) {
        const exist = group.findIndex(({ item_id }) => r.item_id == item_id);
        if (exist !== -1) {
            group[exist].data.push(r);
        } else {
            group.push({ item_id: r.item_id, code: codeGenerate(r.item_id), data: [r] });
        }
    }
    if (search && search.length) {
        const filter = group.filter((i) => i.data.some((r) => String(r.field_value).includes(search)));
        return {
            records: filter.slice((page - 1) * 10, page * 10),
            total: filter.length,
        };
    }
    return {
        records: group.slice((page - 1) * 10, page * 10),
        total: group.length,
    };
}

export const recordController = {
    routes: recordRoutes,
    handlers: { history, submit, all },
};
