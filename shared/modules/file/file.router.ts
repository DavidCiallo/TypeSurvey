import {
    FileXlsxRequest, FileXlsxResponse,
    FileConfirmRequest, FileConfirmResponse,
    FileUploadRequest, FileUploadResponse,
    FilePreviewRequest, FilePreviewResponse,
} from "./file.interface";

export const fileRoutes = {
    base: "/api",
    prefix: "/file",
    readxlsx: { path: "/readxlsx", request: {} as FileXlsxRequest,    response: {} as FileXlsxResponse },
    confirm:  { path: "/confirm",  request: {} as FileConfirmRequest, response: {} as FileConfirmResponse },
    preview:  { path: "/preview",  request: {} as FilePreviewRequest, response: {} as FilePreviewResponse },
    upload:   { path: "/upload",   request: {} as FileUploadRequest,  response: {} as FileUploadResponse },
} as const;
