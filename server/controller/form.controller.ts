import {
    FormCreateRequest,
    FormCreateResponse,
    FormUpdateRequest,
    FormUpdateResponse,
    FormDeleteRequest,
    FormDeleteResponse,
    FormListQuery,
    FormListResponse,
    FormRouterInstance,
} from "../../shared/router/FormRouter";
import { inject } from "../lib/inject";
import { getIdentifyByVerify } from "../service/auth.service";
import { createField, getFormBriefList, getFormList, updateFormName } from "../service/field.service";

async function list(query: FormListQuery): Promise<FormListResponse> {
    const { page, auth } = query;
    if (!page || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    const list = await getFormBriefList();
    return { success: true, data: { list, total: list.length } };
}

async function create(query: FormCreateRequest): Promise<FormCreateResponse> {
    const { form_name, auth } = query;
    if (!form_name || !auth) {
        return { success: false, message: "参数错误" };
    }
    const user = getIdentifyByVerify(auth);
    if (!user) {
        return { success: false };
    }
    const forms = await getFormList();
    if (forms.includes(form_name)) {
        return { success: false };
    }

    const success = !!(await createField({
        form_name: form_name,
        field_name: "new",
        field_type: "text",
        required: false,
        disabled: false,
    }));
    return { success };
}

async function update(query: FormUpdateRequest): Promise<FormUpdateResponse> {
    const { form_name, new_name } = query;
    if (!form_name || !new_name) return { success: false };

    const success = await updateFormName(form_name, new_name);
    return { success };
}

async function del(query: FormDeleteRequest): Promise<FormDeleteResponse> {
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

export const formController = new FormRouterInstance(inject, { list, create, update, del });
