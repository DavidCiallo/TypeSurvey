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

    history: (query: RecordGetQuery, callback?: Function) => Promise<RecordGetResponse>;
    submit: (request: RecordUpdateRequest, callback?: Function) => Promise<RecordUpdateResponse>;
    all: (request: RecordAllQuery, callback?: Function) => Promise<RecordAllResponse>;

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
    data: Array<{
        item_id: string;
        records: Array<RecordImpl>;
    }>;
    total: number;
}

export interface RecordGetResponse extends BaseResponse {
    check: boolean;
    item_id: string;
    code: string;
    form_name: string;
    fields: FormFieldImpl[];
    records: RecordImpl[];
}

export interface RecordUpdateRequest extends BaseRequest {
    item_id: string;
    field_id: string;
    field_value: string;
}

export interface RecordUpdateResponse extends BaseResponse {}
