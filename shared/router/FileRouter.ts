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
    ];

    readxlsx: (query: FileXlsxRequest, callback?: Function) => Promise<FileXlsxResponse>;

    constructor(
        inject: Function,
        functions?: {
            readxlsx: (query: FileXlsxRequest) => Promise<FileXlsxResponse>;
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

export interface FileXlsxRequest extends BaseRequest {
    file: Chunk;
}

export interface FileXlsxResponse extends BaseResponse {
    data?: {};
}
