import { FormFieldImpl } from "../impl";
import { FieldType } from "../impl/field";
import { BaseRequest, BaseRouterInstance } from "../lib/decorator";

export class FormFieldRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/field";
    router = [
        {
            name: "list",
            path: "/list",
            method: "get",
            handler: Function
        },
        {
            name: "save",
            path: "/save",
            method: "post",
            handler: Function
        },
        {
            name: "delete",
            path: "/delete",
            method: "post",
            handler: Function
        },
    ]

    list: (query: FormFieldListQuery, callback?: Function) => Promise<FormFieldListResponse>
    save: (request: FormFieldBodyRequest, callback?: Function) => Promise<FormFieldSaveResponse>
    del: (request: FormFieldDeleteRequest, callback?: Function) => Promise<FormFieldDeleteResponse>

    constructor(inject: Function, functions?: {
        list: (query: FormFieldListQuery) => Promise<FormFieldListResponse>,
        save: (request: FormFieldBodyRequest) => Promise<FormFieldSaveResponse>
        del: (request: FormFieldDeleteRequest) => Promise<FormFieldDeleteResponse>
    }) { super(); inject(this, functions); }
}

export interface FormFieldListQuery extends BaseRequest {
    page: number;
}

export interface FormFieldListResponse {
    list: FormFieldImpl[];
    total: number;
}

export interface FormFieldBodyRequest extends BaseRequest {
    form_name: string;
    field_name: string;
    field_type: FieldType;
}

export interface FormFieldSaveResponse {
    success: boolean;
}

export interface FormFieldDeleteRequest extends BaseRequest {
    field_id: string;
    creater: string;
}

export interface FormFieldDeleteResponse {
    success: boolean;
}