import {
    FormListRequest, FormCreateRequest, FormUpdateRequest,
} from "../../../shared/modules/form/form.interface";
import { formRoutes } from "../../../shared/modules/form/form.router";
import { getIdentifyByVerify } from "../auth/auth.service";
import { createField, getFormBriefList, getFormList, updateFormName } from "./form.service";

async function list(request: FormListRequest) {
    request = FormListRequest.self(request);
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    const list = await getFormBriefList();
    return { list, total: list.length };
}

async function create(request: FormCreateRequest) {
    request = FormCreateRequest.self(request);
    const { form_name } = request;
    const user = getIdentifyByVerify(request.auth);
    if (!user) throw "Unauthorized";
    const forms = await getFormList();
    if (forms.includes(form_name)) throw "表单已存在";

    const result = await createField({
        form_name: form_name,
        field_name: "new",
        field_type: "text",
        required: false,
        disabled: false,
    });
    if (!result) throw "表单已存在";
    return {};
}

async function update(request: FormUpdateRequest) {
    request = FormUpdateRequest.self(request);
    const { form_name, new_name } = request;

    const result = await updateFormName(form_name, new_name);
    if (!result) throw "修改表单失败";
    return {};
}

export const formController = {
    routes: formRoutes,
    handlers: { list, create, update },
};
