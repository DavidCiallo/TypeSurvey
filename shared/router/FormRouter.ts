import { BaseRequest, BaseResponse, BaseRouterInstance } from "../lib/decorator";

export class FormRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/form";
    router = [
        {
            name: "list",
            path: "/list",
            method: "get",
            handler: Function,
        },
        {
            name: "create",
            path: "/create",
            method: "post",
            handler: Function,
        },
        {
            name: "update",
            path: "/update",
            method: "post",
            handler: Function,
        },
        {
            name: "del",
            path: "/del",
            method: "post",
            handler: Function,
        },
    ];

    list: (query: FormListQuery) => Promise<FormListResponse>;
    create: (request: FormCreateRequest) => Promise<FormCreateResponse>;
    update: (request: FormUpdateRequest) => Promise<FormUpdateResponse>;
    del: (request: FormDeleteRequest) => Promise<FormDeleteResponse>;

    constructor(
        inject: Function,
        functions?: {
            list: (query: FormListQuery) => Promise<FormListResponse>;
            create: (request: FormCreateRequest) => Promise<FormCreateResponse>;
            update: (request: FormUpdateRequest) => Promise<FormUpdateResponse>;
            del: (request: FormDeleteRequest) => Promise<FormDeleteResponse>;
        },
    ) {
        super();
        inject(this, functions);
    }
}

export interface FormListQuery extends BaseRequest {
    page: number;
}

export interface FormListResponse extends BaseResponse {
    data?: {
        list: Array<{
            form_name: string;
            records_num: number;
            last_submit: number;
        }>;
        total: number;
    };
}

export interface FormCreateRequest extends BaseRequest {
    form_name: string;
}

export interface FormCreateResponse extends BaseResponse {}

export interface FormUpdateRequest extends BaseRequest {
    form_name: string;
    new_name: string;
}

export interface FormUpdateResponse extends BaseResponse {}

export interface FormDeleteRequest extends BaseRequest {
    form_name: string;
    creater: string;
}

export interface FormDeleteResponse extends BaseResponse {}
