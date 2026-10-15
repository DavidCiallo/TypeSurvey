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
    /** Best-matching existing form for this sheet ("" = none). */
    match_form?: string;
    /** How many columns that form covers. */
    match_num?: number;
}> {
    public success: boolean;
    public message?: string;
    public data?: {
        tempid: string;
        header: Array<XlsxHeader>;
        size: number;
        match_form?: string;
        match_num?: number;
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
    /** Import into this existing form instead of the matched/new one. */
    public target_form?: string;
    /** Sheet column indexes that form the dedup key (empty = append only). */
    public key_fields?: number[];

    constructor(origin: Partial<FileConfirmRequest>) {
        if (!origin.tempid) throw new Error("Temp ID is required");
        if (!origin.fields) throw new Error("Fields are required");
        origin.auth && (this.auth = origin.auth);
        this.tempid = origin.tempid;
        this.usedata = origin.usedata || false;
        this.fields = origin.fields;
        this.time_field_index = origin.time_field_index;
        this.target_form = origin.target_form;
        this.key_fields = origin.key_fields;
    }

    static self(unsafe: FileConfirmRequest) {
        return new FileConfirmRequest(unsafe);
    }
}

/** What the import actually did, so the caller can report it. */
export type FileConfirmResult = {
    /** Rows written as new records. */
    inserted: number;
    /** Rows skipped because their key already existed. */
    skipped: number;
    /** Records the target form held before the import. */
    before: number;
    /** Records it holds now. */
    total: number;
};

export class FileConfirmResponse implements BaseResponse<FileConfirmResult> {
    public success: boolean;
    public message?: string;
    public data?: FileConfirmResult;
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
