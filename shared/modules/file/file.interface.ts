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
    /** Per-row choices from the conflict dialog. */
    public decisions?: ImportDecision[];

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
        this.decisions = origin.decisions;
    }

    static self(unsafe: FileConfirmRequest) {
        return new FileConfirmRequest(unsafe);
    }
}

/** One conflicting row: which existing record it hits and what to do. */
export type ImportDecision = {
    /** Sheet row index. */
    row: number;
    /** item_id of the existing record the user chose. */
    item_id: string;
    /** field_id -> true means take the new value, false keeps the old. */
    fields: Record<string, boolean>;
};

export type ImportConflictField = {
    field_id: string;
    field_name: string;
    old_value: string;
    new_value: string;
};

export type ImportConflictRow = {
    row: number;
    candidates: Array<{ item_id: string; fields: ImportConflictField[] }>;
};

export class FilePreviewRequest implements BaseRequest {
    public auth?: string;
    public tempid: string;
    public form_name: string;
    public key_fields: number[];

    constructor(origin: Partial<FilePreviewRequest>) {
        if (!origin.tempid) throw new Error("Temp ID is required");
        if (!origin.form_name) throw new Error("Form name is required");
        origin.auth && (this.auth = origin.auth);
        this.tempid = origin.tempid;
        this.form_name = origin.form_name;
        this.key_fields = origin.key_fields || [];
    }

    static self(unsafe: FilePreviewRequest) {
        return new FilePreviewRequest(unsafe);
    }
}

export class FilePreviewResponse
    implements BaseResponse<{ updates: number; creates: number; rows: ImportConflictRow[] }> {
    public success: boolean;
    public message?: string;
    public data?: { updates: number; creates: number; rows: ImportConflictRow[] };
    constructor(origin: FilePreviewResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
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
