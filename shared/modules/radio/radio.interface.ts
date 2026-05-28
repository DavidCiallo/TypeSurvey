import { BaseRequest, BaseResponse } from "../../lib/default/decorator";

export class RadioCreateRequest implements BaseRequest {
    public auth?: string;
    public field_id: string;
    public radio_name: string;

    constructor(origin: Partial<RadioCreateRequest>) {
        if (!origin.field_id) throw new Error("Field ID is required");
        if (!origin.radio_name) throw new Error("Radio name is required");
        origin.auth && (this.auth = origin.auth);
        this.field_id = origin.field_id;
        this.radio_name = origin.radio_name;
    }

    static self(unsafe: RadioCreateRequest) {
        return new RadioCreateRequest(unsafe);
    }
}

export class RadioCreateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: RadioCreateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class RadioUpdateRequest implements BaseRequest {
    public auth?: string;
    public radio_id: string;
    public radio_name?: string;
    public useful?: boolean;

    constructor(origin: Partial<RadioUpdateRequest>) {
        if (!origin.radio_id) throw new Error("Radio ID is required");
        origin.auth && (this.auth = origin.auth);
        this.radio_id = origin.radio_id;
        this.radio_name = origin.radio_name;
        this.useful = origin.useful;
    }

    static self(unsafe: RadioUpdateRequest) {
        return new RadioUpdateRequest(unsafe);
    }
}

export class RadioUpdateResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: RadioUpdateResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class RadioDeleteRequest implements BaseRequest {
    public auth?: string;
    public radio_id: string;

    constructor(origin: Partial<RadioDeleteRequest>) {
        if (!origin.radio_id) throw new Error("Radio ID is required");
        origin.auth && (this.auth = origin.auth);
        this.radio_id = origin.radio_id;
    }

    static self(unsafe: RadioDeleteRequest) {
        return new RadioDeleteRequest(unsafe);
    }
}

export class RadioDeleteResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: RadioDeleteResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
