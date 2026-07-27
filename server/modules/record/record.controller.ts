import { nanoid } from "nanoid";
import { RecordHistoryRequest, RecordSubmitRequest, RecordAllRequest, RecordDeleteRequest } from "../../../shared/modules/record/record.interface";
import { recordRoutes } from "../../../shared/modules/record/record.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { getFieldList, getFormNameByField } from "../form/form.service";
import { deleteRecordByItem, getAllRecord, getRecords, submitRecord } from "./record.service";
import { codeGenerate } from "../../methods/crypto";

async function history(request: RecordHistoryRequest) {
    const { id, code, item_id: stored_item_id } = request;

    // 1. id 是 item_id（已存在的记录）→ 直接返回该记录数据
    //    这覆盖了 RecordPage 复制特定记录链接的场景。
    const records = await getRecords(id);
    if (records.length) {
        const { field_id, item_id } = records[0];
        const form_name = await getFormNameByField(field_id);
        if (!form_name) throw "表单不存在";
        if (!code || code !== codeGenerate(id)) throw "鉴权失败";
        const fields = await getFieldList(form_name);
        return { form_name, item_id, code, fields, records };
    }

    // 到这里 id 一定是 field_id。算出 URL 对应的 form。
    const url_form_name = await getFormNameByField(id);
    if (!url_form_name) throw "表单不存在";

    // 2. stored_item_id 可用且属于同一个 form → 恢复该 item 的草稿
    //    跨 form 切换时 stored_item_id 对应的字段不属于 url_form_name，自然走新建。
    if (stored_item_id && code === codeGenerate(stored_item_id)) {
        const draft = await getRecords(stored_item_id);
        const sameForm =
            draft.length > 0 &&
            (await getFormNameByField(draft[0].field_id)) === url_form_name;
        if (sameForm) {
            const fields = await getFieldList(url_form_name);
            return { form_name: url_form_name, item_id: stored_item_id, code, fields, records: draft };
        }
    }

    // 3. 否则：新记录
    const item_id = nanoid(6);
    const newCode = codeGenerate(item_id);
    const fields = await getFieldList(url_form_name);
    return { form_name: url_form_name, item_id, code: newCode, fields, records: [] };
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
