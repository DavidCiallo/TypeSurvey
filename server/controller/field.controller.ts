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
import { inject } from "../lib/inject";
import { getIdentifyByVerify } from "../service/auth.service";
import { createField, getFieldList, updateSingleField } from "../service/field.service";

async function list(query: FormFieldListQuery): Promise<FormFieldListResponse> {
    const { form_name, page, auth } = query;
    if (!form_name || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    const list = await getFieldList(form_name);
    list.sort((a, b) => (a.position || 0) - (b.position || 0));
    return { success: true, data: { list: list.slice(10 * (page - 1), 10 * page), total: list.length } };
}

async function create(query: FormFieldCreateRequest): Promise<FormFieldCreateResponse> {
    const { form_name, field_name, field_type, auth } = query;
    if (!form_name || !field_name || !field_type || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    const success = !!(await createField({ form_name, field_name, field_type, disabled: false, required: false }));
    return { success };
}

async function update(query: FormFieldUpdateRequest): Promise<FormFieldUpdateResponse> {
    const { field_id, field_name, field_type, position, disabled, required, comment, auth } = query;
    if (!field_id || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
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
    if (position) {
        const success = await updateSingleField(field_id, "position", position);
        if (!success) return { success: false };
    }
    if (typeof required === "boolean") {
        const success = await updateSingleField(field_id, "required", required);
        if (!success) return { success: false };
    }
    if (typeof disabled === "boolean") {
        const success = await updateSingleField(field_id, "disabled", disabled);
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
    const { auth } = query;
    if (!auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    return { success: true };
}

export const fieldController = new FormFieldRouterInstance(inject, { list, create, update, del });
