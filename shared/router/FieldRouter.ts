import { FormFieldImpl } from "../impl";
import { FieldType } from "../impl/field";
import { BaseRequest, BaseResponse, BaseRouterInstance } from "../lib/decorator";

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
            name: "create",
            path: "/create",
            method: "post",
            handler: Function
        },
        {
            name: "update",
            path: "/update",
            method: "post",
            handler: Function
        },
        {
            name: "del",
            path: "/del",
            method: "post",
            handler: Function
        },
    ]

    list: (query: FormFieldListQuery, callback?: Function) => Promise<FormFieldListResponse>
    create: (request: FormFieldCreateRequest, callback?: Function) => Promise<FormFieldCreateResponse>
    update: (request: FormFieldUpdateRequest, callback?: Function) => Promise<FormFieldUpdateResponse>
    del: (request: FormFieldDeleteRequest, callback?: Function) => Promise<FormFieldDeleteResponse>

    constructor(inject: Function, functions?: {
        list: (query: FormFieldListQuery) => Promise<FormFieldListResponse>,
        create: (request: FormFieldCreateRequest, callback?: Function) => Promise<FormFieldCreateResponse>
        update: (request: FormFieldUpdateRequest, callback?: Function) => Promise<FormFieldUpdateResponse>
        del: (request: FormFieldDeleteRequest) => Promise<FormFieldDeleteResponse>
    }) { super(); inject(this, functions); }
}

export interface FormFieldListQuery extends BaseRequest {
    form_name: string;
    page: number;
}

export interface FormFieldListResponse {
    list: FormFieldImpl[];
    total: number;
}

export interface FormFieldCreateRequest extends BaseRequest {
    form_name: string;
    field_name: string;
    field_type: FieldType;
}

export interface FormFieldCreateResponse extends BaseResponse { }

export interface FormFieldUpdateRequest extends BaseRequest {
    field_id: string;
    field_name?: string;
    field_type?: FieldType;
    comment?: string;
}

export interface FormFieldUpdateResponse extends BaseResponse { }

export interface FormFieldDeleteRequest extends BaseRequest {
    field_id: string;
    creater: string;
}

export interface FormFieldDeleteResponse {
    success: boolean;
}