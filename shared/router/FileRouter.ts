import { FieldType } from "../impl/field";
import { BaseRequest, BaseResponse, BaseRouterInstance } from "../lib/decorator";

export class FileRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/file";
    router = [
        {
            name: "readxlsx",
            path: "/readxlsx",
            method: "post",
            handler: Function,
        },
        {
            name: "confirm",
            path: "/confirm",
            method: "post",
            handler: Function,
        },
    ];

    readxlsx: (query: FileXlsxRequest) => Promise<FileXlsxResponse>;
    confirm: (query: FileConfirmRequest) => Promise<FileConfirmResponse>;
    constructor(
        inject: Function,
        functions?: {
            readxlsx: (query: FileXlsxRequest) => Promise<FileXlsxResponse>;
            confirm: (query: FileConfirmRequest) => Promise<FileConfirmResponse>;
        },
    ) {
        super();
        inject(this, functions);
    }
}

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

export interface FileXlsxRequest extends BaseRequest {
    file: Chunk;
}

export interface FileXlsxResponse extends BaseResponse {
    data?: {
        tempid: string;
        header: Array<XlsxHeader>;
        size: number;
    };
}

export interface FileConfirmRequest extends BaseRequest {
    tempid: string;
    usedata: boolean;
    fields: FieldCache[];
}

export interface FileConfirmResponse extends BaseResponse {}
