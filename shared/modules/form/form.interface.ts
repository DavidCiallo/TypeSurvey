import { BaseRequest, BaseResponse } from "../../lib/default/decorator";

export class FormListRequest implements BaseRequest {
    public auth?: string;
    public page: number;

    constructor(origin: Partial<FormListRequest>) {
        if (!origin.page) throw new Error("Page is required");
        origin.auth && (this.auth = origin.auth);
        this.page = origin.page;
    }

    static self(unsafe: FormListRequest) {
        return new FormListRequest(unsafe);
    }
}

export class FormListResponse implements BaseResponse<{
    list: Array<{ form_name: string; records_num: number; last_submit: number }>;
    total: number;
}> {
    public success: boolean;
    public message?: string;
    public data?: {
        list: Array<{ form_name: string; records_num: number; last_submit: number }>;
        total: number;
    };
    constructor(origin: FormListResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FormCreateRequest implements BaseRequest {
    public auth?: string;
    public form_name: string;

    constructor(origin: Partial<FormCreateRequest>) {
        if (!origin.form_name) throw new Error("Form name is required");
        origin.auth && (this.auth = origin.auth);
        this.form_name = origin.form_name;
    }

    static self(unsafe: FormCreateRequest) {
        return new FormCreateRequest(unsafe);
    }
}

export class FormCreateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FormCreateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FormUpdateRequest implements BaseRequest {
    public auth?: string;
    public form_name: string;
    public new_name: string;

    constructor(origin: Partial<FormUpdateRequest>) {
        if (!origin.form_name) throw new Error("Form name is required");
        if (!origin.new_name) throw new Error("New name is required");
        origin.auth && (this.auth = origin.auth);
        this.form_name = origin.form_name;
        this.new_name = origin.new_name;
    }

    static self(unsafe: FormUpdateRequest) {
        return new FormUpdateRequest(unsafe);
    }
}

export class FormUpdateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FormUpdateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FormDeleteRequest implements BaseRequest {
    public auth?: string;
    public form_name: string;

    constructor(origin: Partial<FormDeleteRequest>) {
        if (!origin.form_name) throw new Error("Form name is required");
        origin.auth && (this.auth = origin.auth);
        this.form_name = origin.form_name;
    }

    static self(unsafe: FormDeleteRequest) {
        return new FormDeleteRequest(unsafe);
    }
}

export class FormDeleteResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FormDeleteResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
