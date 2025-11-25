import { BaseRequest, BaseResponse, BaseRouterInstance } from "../lib/decorator";

export class FormFieldRadioRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/radio";
    router = [
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

    create: (request: FormFieldRadioCreateRequest) => Promise<FormFieldRadioCreateResponse>;
    update: (request: FormFieldRadioUpdateRequest) => Promise<FormFieldRadioUpdateResponse>;
    del: (request: FormFieldRadioDeleteRequest) => Promise<FormFieldRadioDeleteResponse>;

    constructor(
        inject: Function,
        functions?: {
            create: (
                request: FormFieldRadioCreateRequest,
                callback?: Function,
            ) => Promise<FormFieldRadioCreateResponse>;
            update: (
                request: FormFieldRadioUpdateRequest,
                callback?: Function,
            ) => Promise<FormFieldRadioUpdateResponse>;
            del: (request: FormFieldRadioDeleteRequest) => Promise<FormFieldRadioDeleteResponse>;
        },
    ) {
        super();
        inject(this, functions);
    }
}

export interface FormFieldRadioCreateRequest extends BaseRequest {
    field_id: string;
    radio_name: string;
}

export interface FormFieldRadioCreateResponse extends BaseResponse {}

export interface FormFieldRadioUpdateRequest extends BaseRequest {
    radio_id: string;
    radio_name?: string;
    useful?: boolean;
}

export interface FormFieldRadioUpdateResponse extends BaseResponse {}

export interface FormFieldRadioDeleteRequest extends BaseRequest {
    radio_id: string;
}

export interface FormFieldRadioDeleteResponse extends BaseResponse {}
