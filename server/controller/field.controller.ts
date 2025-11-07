import { FormFieldBodyRequest, FormFieldDeleteRequest, FormFieldDeleteResponse, FormFieldListQuery, FormFieldListResponse, FormFieldRouterInstance, FormFieldSaveResponse } from "../../shared/router/FieldRouter";
import { inject, injectws } from "../lib/inject"; // 假设这是您的注入工具

async function list(query: FormFieldListQuery): Promise<FormFieldListResponse> {

    return { list: [], total: 0 };
}


async function save(query: FormFieldBodyRequest): Promise<FormFieldSaveResponse> {

    return { success: true };
}

async function del(query: FormFieldDeleteRequest): Promise<FormFieldDeleteResponse> {

    return { success: true };
}

export const authController = new FormFieldRouterInstance(inject, { list, save, del });