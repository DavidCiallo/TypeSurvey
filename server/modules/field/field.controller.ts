import {
    FieldListRequest, FieldCreateRequest, FieldUpdateRequest,
} from "../../../shared/modules/field/field.interface";
import { fieldRoutes } from "../../../shared/modules/field/field.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { createField, getFieldList, updateSingleField } from "../form/form.service";

async function list(request: FieldListRequest) {
    request = FieldListRequest.self(request);
    const { form_name, page } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    const list = await getFieldList(form_name);
    list.sort((a, b) => (a.position || 0) - (b.position || 0));
    return { list: list.slice(10 * (page - 1), 10 * page), total: list.length };
}

async function create(request: FieldCreateRequest) {
    request = FieldCreateRequest.self(request);
    const { form_name, field_name, field_type } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    const result = await createField({ form_name, field_name, field_type, disabled: false, required: false });
    if (!result) throw "创建字段失败，可能存在同名项";
    return {};
}

async function update(request: FieldUpdateRequest) {
    request = FieldUpdateRequest.self(request);
    const { field_id, field_name, field_type, position, disabled, required, comment } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    if (field_name) {
        const success = await updateSingleField(field_id, "field_name", field_name);
        if (!success) throw "更新失败";
    }
    if (field_type) {
        const success = await updateSingleField(field_id, "field_type", field_type);
        if (!success) throw "更新失败";
    }
    if (position) {
        const success = await updateSingleField(field_id, "position", position);
        if (!success) throw "更新失败";
    }
    if (typeof required === "boolean") {
        const success = await updateSingleField(field_id, "required", required);
        if (!success) throw "更新失败";
    }
    if (typeof disabled === "boolean") {
        const success = await updateSingleField(field_id, "disabled", disabled);
        if (!success) throw "更新失败";
    }
    if (typeof comment === "string") {
        const success = await updateSingleField(field_id, "comment", comment);
        if (!success) throw "更新失败";
    }
    if (typeof request.placeholder === "string") {
        const success = await updateSingleField(field_id, "placeholder", request.placeholder);
        if (!success) throw "更新失败";
    }
    return {};
}

export const fieldController = {
    routes: fieldRoutes,
    handlers: { list, create, update },
};
