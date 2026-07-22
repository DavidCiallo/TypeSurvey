import {
    FieldListRequest, FieldListResponse,
    FieldCreateRequest, FieldCreateResponse,
    FieldUpdateRequest, FieldUpdateResponse,
    FieldDeleteRequest, FieldDeleteResponse,
} from "./field.interface";

export const fieldRoutes = {
    base: "/api",
    prefix: "/field",
    list:   { path: "/list",   request: {} as FieldListRequest,   response: {} as FieldListResponse, apikey: true },
    create: { path: "/create", request: {} as FieldCreateRequest, response: {} as FieldCreateResponse },
    update: { path: "/update", request: {} as FieldUpdateRequest, response: {} as FieldUpdateResponse },
    del:    { path: "/del",    request: {} as FieldDeleteRequest, response: {} as FieldDeleteResponse },
} as const;
