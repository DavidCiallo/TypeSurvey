import { BaseRequest, BaseResponse } from "../../lib/default/decorator";
import { FieldType } from "../../impl/field";

export class RecordHistoryRequest implements BaseRequest {
    public auth?: string;
    public id: string;
    public code?: string;

    constructor(origin: Partial<RecordHistoryRequest>) {
        if (!origin.id) throw new Error("ID is required");
        origin.auth && (this.auth = origin.auth);
        this.id = origin.id;
        this.code = origin.code;
    }

    static self(unsafe: RecordHistoryRequest) {
        return new RecordHistoryRequest(unsafe);
    }
}

export class RecordHistoryResponse implements BaseResponse<{
    item_id: string;
    code: string;
    form_name: string;
    fields: Array<{
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
    records: Array<{
        id: string;
        item_id: string;
        field_id: string;
        field_value: number | string | boolean;
        create_time: number;
        update_time: number | null;
    }>;
}> {
    public success: boolean;
    public message?: string;
    public data?: {
        item_id: string;
        code: string;
        form_name: string;
        fields: Array<{
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
        records: Array<{
            id: string;
            item_id: string;
            field_id: string;
            field_value: number | string | boolean;
            create_time: number;
            update_time: number | null;
        }>;
    };
    constructor(origin: RecordHistoryResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class RecordSubmitRequest implements BaseRequest {
    public auth?: string;
    public item_id: string;
    public field_id: string;
    public field_value: number | string | boolean;

    constructor(origin: Partial<RecordSubmitRequest>) {
        if (!origin.item_id) throw new Error("Item ID is required");
        if (!origin.field_id) throw new Error("Field ID is required");
        if (origin.field_value === undefined || origin.field_value === null) throw new Error("Field value is required");
        origin.auth && (this.auth = origin.auth);
        this.item_id = origin.item_id;
        this.field_id = origin.field_id;
        this.field_value = origin.field_value;
    }

    static self(unsafe: RecordSubmitRequest) {
        return new RecordSubmitRequest(unsafe);
    }
}

export class RecordSubmitResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: RecordSubmitResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class RecordAllRequest implements BaseRequest {
    public auth?: string;
    public form_name: string;
    public page: number;
    public search: string;

    constructor(origin: Partial<RecordAllRequest>) {
        if (!origin.form_name) throw new Error("Form name is required");
        if (origin.page === undefined || origin.page === null) throw new Error("Page is required");
        origin.auth && (this.auth = origin.auth);
        this.form_name = origin.form_name;
        this.page = origin.page;
        this.search = origin.search || "";
    }

    static self(unsafe: RecordAllRequest) {
        return new RecordAllRequest(unsafe);
    }
}

export class RecordAllResponse implements BaseResponse<{
    records: Array<{
        item_id: string;
        code: string;
        data: Array<{
            id: string;
            item_id: string;
            field_id: string;
            field_value: number | string | boolean;
            create_time: number;
            update_time: number | null;
        }>;
    }>;
    total: number;
}> {
    public success: boolean;
    public message?: string;
    public data?: {
        records: Array<{
            item_id: string;
            code: string;
            data: Array<{
                id: string;
                item_id: string;
                field_id: string;
                field_value: number | string | boolean;
                create_time: number;
                update_time: number | null;
            }>;
        }>;
        total: number;
    };
    constructor(origin: RecordAllResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
