import { BaseRequest, BaseResponse } from "../../lib/default/decorator";
import { FieldType } from "../../impl/field";

export class FieldListRequest implements BaseRequest {
    public auth?: string;
    public form_name: string;
    public page: number;

    constructor(origin: Partial<FieldListRequest>) {
        if (!origin.form_name) throw new Error("Form name is required");
        if (origin.page === undefined || origin.page === null) throw new Error("Page is required");
        origin.auth && (this.auth = origin.auth);
        this.form_name = origin.form_name;
        this.page = origin.page;
    }

    static self(unsafe: FieldListRequest) {
        return new FieldListRequest(unsafe);
    }
}

export class FieldListResponse implements BaseResponse<{
    list: Array<{
        id: string;
        form_name: string;
        field_name: string;
        field_type: FieldType;
        required: boolean;
        disabled: boolean;
        comment: string;
        placeholder: string;
        position: number;
        radios?: Array<{ id: string; field_id: string; radio_name: string; useful: boolean }>;
    }>;
    total: number;
}> {
    public success: boolean;
    public message?: string;
    public data?: {
        list: Array<{
            id: string;
            form_name: string;
            field_name: string;
            field_type: FieldType;
            required: boolean;
            disabled: boolean;
            comment: string;
            placeholder: string;
            position: number;
            radios?: Array<{ id: string; field_id: string; radio_name: string; useful: boolean }>;
        }>;
        total: number;
    };
    constructor(origin: FieldListResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FieldCreateRequest implements BaseRequest {
    public auth?: string;
    public form_name: string;
    public field_name: string;
    public field_type: FieldType;

    constructor(origin: Partial<FieldCreateRequest>) {
        if (!origin.form_name) throw new Error("Form name is required");
        if (!origin.field_name) throw new Error("Field name is required");
        if (!origin.field_type) throw new Error("Field type is required");
        origin.auth && (this.auth = origin.auth);
        this.form_name = origin.form_name;
        this.field_name = origin.field_name;
        this.field_type = origin.field_type;
    }

    static self(unsafe: FieldCreateRequest) {
        return new FieldCreateRequest(unsafe);
    }
}

export class FieldCreateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FieldCreateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FieldUpdateRequest implements BaseRequest {
    public auth?: string;
    public field_id: string;
    public field_name?: string;
    public field_type?: FieldType;
    public position?: number;
    public comment?: string;
    public placeholder?: string;
    public required?: boolean;
    public disabled?: boolean;

    constructor(origin: Partial<FieldUpdateRequest>) {
        if (!origin.field_id) throw new Error("Field ID is required");
        origin.auth && (this.auth = origin.auth);
        this.field_id = origin.field_id;
        this.field_name = origin.field_name;
        this.field_type = origin.field_type;
        this.position = origin.position;
        this.comment = origin.comment;
        this.placeholder = origin.placeholder;
        this.required = origin.required;
        this.disabled = origin.disabled;
    }

    static self(unsafe: FieldUpdateRequest) {
        return new FieldUpdateRequest(unsafe);
    }
}

export class FieldUpdateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FieldUpdateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FieldDeleteRequest implements BaseRequest {
    public auth?: string;
    public field_id: string;
    public creater: string;

    constructor(origin: Partial<FieldDeleteRequest>) {
        if (!origin.field_id) throw new Error("Field ID is required");
        if (!origin.creater) throw new Error("Creater is required");
        origin.auth && (this.auth = origin.auth);
        this.field_id = origin.field_id;
        this.creater = origin.creater;
    }

    static self(unsafe: FieldDeleteRequest) {
        return new FieldDeleteRequest(unsafe);
    }
}

export class FieldDeleteResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FieldDeleteResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
