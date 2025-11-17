import { FormFieldImpl, RecordImpl } from "../impl";
import { BaseRequest, BaseResponse, BaseRouterInstance } from "../lib/decorator";

export class RecordRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/record";
    router = [
        {
            name: "get",
            path: "/get",
            method: "get",
            handler: Function,
        },
        {
            name: "submit",
            path: "/submit",
            method: "post",
            handler: Function,
        },
    ];

    get: (query: RecordGetQuery, callback?: Function) => Promise<RecordGetResponse>;
    submit: (request: RecordUpdateRequest, callback?: Function) => Promise<RecordUpdateResponse>;

    constructor(
        inject: Function,
        functions?: {
            get: (query: RecordGetQuery) => Promise<RecordGetResponse>;
            submit: (request: RecordUpdateRequest) => Promise<RecordUpdateResponse>;
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
