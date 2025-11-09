import { FormCreateRequest, FormCreateResponse, FormUpdateRequest, FormUpdateResponse, FormDeleteRequest, FormDeleteResponse, FormListQuery, FormListResponse, FormRouterInstance } from "../../shared/router/FormRouter";
import { inject, injectws } from "../lib/inject";
import { createField, getFormList, updateFormName } from "../service/field.service";

async function list(query: FormListQuery): Promise<FormListResponse> {
    if (!query.form_name) return { list: [], total: 0 };
    const list = await getFormList();
    return { list, total: list.length };
}

async function create(query: FormCreateRequest): Promise<FormCreateResponse> {
    const { form_name } = query;
    if (!form_name) {
        return { success: false };
    }

    const forms = await getFormList();
    if (forms.includes(form_name)) {
        return { success: false };
    }

    const success = await createField({
        form_name: form_name,
        field_name: "new",
        field_type: "text"
    })
    return { success };
}

async function update(query: FormUpdateRequest): Promise<FormUpdateResponse> {
    const { origin_name, new_name } = query;
    if (!origin_name || !new_name) return { success: false };

    const success = await updateFormName(origin_name, new_name);
    return { success };
}

async function del(query: FormDeleteRequest): Promise<FormDeleteResponse> {

    return { success: false };
}

export const authController = new FormRouterInstance(inject, { list, create, update, del });