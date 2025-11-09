import { FormFieldCreateRequest, FormFieldCreateResponse, FormFieldDeleteRequest, FormFieldDeleteResponse, FormFieldListQuery, FormFieldListResponse, FormFieldRouterInstance, FormFieldUpdateRequest, FormFieldUpdateResponse } from "../../shared/router/FieldRouter";
import { inject, injectws } from "../lib/inject";
import { getFieldList } from "../service/field.service";

async function list(query: FormFieldListQuery): Promise<FormFieldListResponse> {
    const { form_name } = query;
    if (!form_name) return { list: [], total: 0 };
    const list = await getFieldList(form_name);
    return { list, total: list.length };
}

async function create(query: FormFieldCreateRequest): Promise<FormFieldCreateResponse> {

    return { success: true };
}

async function update(query: FormFieldUpdateRequest): Promise<FormFieldUpdateResponse> {

    return { success: true };
}

async function del(query: FormFieldDeleteRequest): Promise<FormFieldDeleteResponse> {

    return { success: true };
}


export const fieldController = new FormFieldRouterInstance(inject, { list, create, update, del });