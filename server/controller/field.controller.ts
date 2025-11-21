import {
    FormFieldCreateRequest,
    FormFieldCreateResponse,
    FormFieldDeleteRequest,
    FormFieldDeleteResponse,
    FormFieldListQuery,
    FormFieldListResponse,
    FormFieldRouterInstance,
    FormFieldUpdateRequest,
    FormFieldUpdateResponse,
} from "../../shared/router/FieldRouter";
import { inject, injectws } from "../lib/inject";
import { createField, getFieldList, updateSingleField } from "../service/field.service";

async function list(query: FormFieldListQuery): Promise<FormFieldListResponse> {
    const { form_name } = query;
    if (!form_name) return { success: false, message: "参数错误" };
    const list = await getFieldList(form_name);
    return { success: true, data: { list, total: list.length } };
}

async function create(query: FormFieldCreateRequest): Promise<FormFieldCreateResponse> {
    const { form_name, field_name, field_type } = query;
    if (!form_name || !field_name || !field_type) return { success: false };
    const success = await createField({ form_name, field_name, field_type });
    return { success };
}

async function update(query: FormFieldUpdateRequest): Promise<FormFieldUpdateResponse> {
    const { field_id, field_name, field_type, comment } = query;
    if (!field_id) {
        return { success: false };
    }
    if (field_name) {
        const success = await updateSingleField(field_id, "field_name", field_name);
        if (!success) return { success: false };
    }
    if (field_type) {
        const success = await updateSingleField(field_id, "field_type", field_type);
        if (!success) return { success: false };
    }
    if (typeof comment === "string") {
        const success = await updateSingleField(field_id, "comment", comment);
        if (!success) return { success: false };
    }
    if (typeof query.placeholder === "string") {
        const success = await updateSingleField(field_id, "placeholder", query.placeholder);
        if (!success) return { success: false };
    }
    return { success: true };
}

async function del(query: FormFieldDeleteRequest): Promise<FormFieldDeleteResponse> {
    return { success: true };
}

export const fieldController = new FormFieldRouterInstance(inject, { list, create, update, del });
