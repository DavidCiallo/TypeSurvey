import { nanoid } from "nanoid";
import { RecordHistoryRequest, RecordSubmitRequest, RecordAllRequest, RecordDeleteRequest } from "../../../shared/modules/record/record.interface";
import { recordRoutes } from "../../../shared/modules/record/record.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { getFieldList, getFormNameByField } from "../form/form.service";
import { deleteRecordByItem, getAllRecord, getRecords, submitRecord } from "./record.service";
import { codeGenerate } from "../../methods/crypto";

async function history(request: RecordHistoryRequest) {
    const { id, code, item_id: stored_item_id } = request;
    // Try stored item_id first (for common forms where URL has field_id)
    const records = stored_item_id ? await getRecords(stored_item_id) : await getRecords(id);
    if (records.length) {
        const { field_id, item_id } = records[0];
        const form_name = await getFormNameByField(field_id);
        const fields = await getFieldList(form_name);
        if (!code || code !== codeGenerate(item_id)) throw "鉴权失败";
        return { form_name, item_id, code, fields, records };
    } else if (stored_item_id && code === codeGenerate(stored_item_id)) {
        // No records yet but valid item_id+code — reuse it
        const form_name = await getFormNameByField(id);
        if (!form_name) throw "表单不存在";
        const fields = await getFieldList(form_name);
        return { form_name, item_id: stored_item_id, code, fields, records: [] };
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
    const { item_id, field_id, field_value } = request;
    if (String(field_value)?.length > 0x3e8) throw "内容过长";
    await submitRecord({ item_id, field_id, field_value });
    return {};
}

async function all(request: RecordAllRequest) {
    const { form_name, page, search, auth } = request;
    if (!form_name || !page || page < 1 || !auth) throw "参数错误";
    const user = getIdentifyByVerify(auth);
    if (!user) throw "Unauthorized";
    return await getAllRecord(form_name, { page, pageSize: 10, search });
}

async function del(request: RecordDeleteRequest) {
    const { item_id, auth } = request;
    if (!item_id || !auth) throw "参数错误";
    const user = getIdentifyByVerify(auth);
    if (!user) throw "Unauthorized";
    await deleteRecordByItem(item_id);
    return {};
}

export const recordController = {
    routes: recordRoutes,
    handlers: { history, submit, all, del },
};
