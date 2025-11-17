import { nanoid } from "nanoid";
import {
    RecordGetQuery,
    RecordGetResponse,
    RecordRouterInstance,
    RecordUpdateRequest,
    RecordUpdateResponse,
} from "../../shared/router/RecordRouter";
import { inject, injectws } from "../lib/inject";
import { getFieldList, getFormNameByField } from "../service/field.service";
import { getRecords, submitRecord } from "../service/record.service";
import { codeGenerate } from "../lib/crypto";

async function get(request: RecordGetQuery): Promise<RecordGetResponse> {
    const { id, code } = request;
    const records = await getRecords(id);
    if (records.length) {
        // 查到记录，是item_id，要求用户鉴权才能获取历史记录
        const { field_id, item_id } = records[0];
        const form_name = await getFormNameByField(field_id);
        const fields = await getFieldList(form_name);
        // 鉴权不通过
        if (!code || code !== codeGenerate(item_id)) {
            return {
                check: false,
                success: true,
                form_name,
                item_id: "",
                code: "",
                fields: [],
                records: [],
            };
        } else {
            // 鉴权通过
            return {
                check: true,
                success: true,
                form_name,
                item_id,
                code,
                fields,
                records: records,
            };
        }
    } else {
        // 查不到记录，说明为新填写的表单
        const form_name = await getFormNameByField(request.id);
        const item_id = nanoid(6);
        const code = codeGenerate(item_id);
        const fields = await getFieldList(form_name);
        return {
            check: true,
            success: !!form_name,
            form_name,
            item_id: !!form_name ? item_id : "",
            code: !!form_name ? code : "",
            fields,
            records: [],
        };
    }
}

async function submit(request: RecordUpdateRequest): Promise<RecordUpdateResponse> {
    const { item_id, field_id, field_value } = request;
    const success = await submitRecord({ item_id, field_id, field_value });
    return { success };
}

export const recordController = new RecordRouterInstance(inject, { get, submit });
