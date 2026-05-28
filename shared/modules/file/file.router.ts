import {
    FileXlsxRequest, FileXlsxResponse,
    FileConfirmRequest, FileConfirmResponse,
} from "./file.interface";

export const fileRoutes = {
    base: "/api",
    prefix: "/file",
    readxlsx: { path: "/readxlsx", request: {} as FileXlsxRequest,    response: {} as FileXlsxResponse },
    confirm:  { path: "/confirm",  request: {} as FileConfirmRequest, response: {} as FileConfirmResponse },
} as const;
