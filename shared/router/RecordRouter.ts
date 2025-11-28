import { FormFieldImpl, RecordImpl } from "../impl";
import { BaseRequest, BaseResponse, BaseRouterInstance } from "../lib/decorator";

export class RecordRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/record";
    router = [
        {
            name: "history",
            path: "/history",
            method: "get",
            handler: Function,
        },
        {
            name: "submit",
            path: "/submit",
            method: "post",
            handler: Function,
        },
        {
            name: "all",
            path: "/all",
            method: "post",
            handler: Function,
        },
    ];

    history: (query: RecordGetQuery) => Promise<RecordGetResponse>;
    submit: (request: RecordUpdateRequest) => Promise<RecordUpdateResponse>;
    all: (request: RecordAllQuery) => Promise<RecordAllResponse>;

    constructor(
        inject: Function,
        functions?: {
            history: (query: RecordGetQuery) => Promise<RecordGetResponse>;
            submit: (request: RecordUpdateRequest) => Promise<RecordUpdateResponse>;
            all: (request: RecordAllQuery) => Promise<RecordAllResponse>;
        },
    ) {
        super();
        inject(this, functions);
    }
}

export interface RecordGetQuery extends BaseRequest {
    id: string;
    code?: string;
}

export interface RecordAllQuery extends BaseRequest {
    form_name: string;
    page: number;
}

export interface RecordAllResponse extends BaseResponse {
    data?: {
        records: Array<{
            item_id: string;
            code: string;
            data: Array<RecordImpl>;
        }>;
        total: number;
    };
}

export interface RecordGetResponse extends BaseResponse {
    data?: {
        item_id: string;
        code: string;
        form_name: string;
        fields: FormFieldImpl[];
        records: RecordImpl[];
    };
}

export interface RecordUpdateRequest extends BaseRequest {
    item_id: string;
    field_id: string;
    field_value: number | string | boolean;
}

export interface RecordUpdateResponse extends BaseResponse {}
