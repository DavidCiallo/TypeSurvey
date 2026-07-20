import { BaseRequest, BaseResponse } from "../../lib/default/decorator";
import { FieldType } from "../../impl/field";

export type Chunk = {
    fileid: string;
    filename: string;
    size: number;
    chunk_site: number;
    chunk_data: string;
};

export type FieldCache = {
    check: boolean;
    field: string;
    type: FieldType;
};

export type XlsxHeader = {
    field: string;
    type: FieldType;
    sub: Array<string>;
};

export class FileXlsxRequest implements BaseRequest {
    public auth?: string;
    public file: Chunk;

    constructor(origin: Partial<FileXlsxRequest>) {
        if (!origin.file) throw new Error("File chunk is required");
        origin.auth && (this.auth = origin.auth);
        this.file = origin.file;
    }

    static self(unsafe: FileXlsxRequest) {
        return new FileXlsxRequest(unsafe);
    }
}

export class FileXlsxResponse implements BaseResponse<{
    tempid: string;
    header: Array<XlsxHeader>;
    size: number;
}> {
    public success: boolean;
    public message?: string;
    public data?: {
        tempid: string;
        header: Array<XlsxHeader>;
        size: number;
    };
    constructor(origin: FileXlsxResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FileConfirmRequest implements BaseRequest {
    public auth?: string;
    public tempid: string;
    public usedata: boolean;
    public fields: FieldCache[];
    public time_field_index?: number;

    constructor(origin: Partial<FileConfirmRequest>) {
        if (!origin.tempid) throw new Error("Temp ID is required");
        if (!origin.fields) throw new Error("Fields are required");
        origin.auth && (this.auth = origin.auth);
        this.tempid = origin.tempid;
        this.usedata = origin.usedata || false;
        this.fields = origin.fields;
        this.time_field_index = origin.time_field_index;
    }

    static self(unsafe: FileConfirmRequest) {
        return new FileConfirmRequest(unsafe);
    }
}

export class FileConfirmResponse implements BaseResponse<{}> {
    public success: boolean;
    public message?: string;
    public data?: {};
    constructor(origin: FileConfirmResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class FileUploadRequest implements BaseRequest {
    public auth?: string;
    public filename: string;
    public data: string; // base64

    constructor(origin: Partial<FileUploadRequest>) {
        if (!origin.filename) throw new Error("Filename is required");
        if (!origin.data) throw new Error("File data is required");
        origin.auth && (this.auth = origin.auth);
        this.filename = origin.filename;
        this.data = origin.data;
    }

    static self(unsafe: FileUploadRequest) {
        return new FileUploadRequest(unsafe);
    }
}

export class FileUploadResponse implements BaseResponse<{ url: string }> {
    public success: boolean;
    public message?: string;
    public data?: { url: string };
    constructor(origin: FileUploadResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
