import { FormFieldCreateRequest, FormFieldCreateResponse, FormFieldDeleteRequest, FormFieldDeleteResponse, FormFieldListQuery, FormFieldListResponse, FormFieldRouterInstance, FormFieldUpdateRequest, FormFieldUpdateResponse} from "../../shared/router/FieldRouter";
import { inject, injectws } from "../lib/inject";

async function list(query: FormFieldListQuery): Promise<FormFieldListResponse> {

    return { list: [], total: 0 };
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


export const authController = new FormFieldRouterInstance(inject, { list, create, update, del });