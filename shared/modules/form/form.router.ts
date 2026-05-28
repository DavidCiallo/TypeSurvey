import {
    FormListRequest, FormListResponse,
    FormCreateRequest, FormCreateResponse,
    FormUpdateRequest, FormUpdateResponse,
    FormDeleteRequest, FormDeleteResponse,
} from "./form.interface";

export const formRoutes = {
    base: "/api",
    prefix: "/form",
    list:   { path: "/list",   request: {} as FormListRequest,   response: {} as FormListResponse },
    create: { path: "/create", request: {} as FormCreateRequest, response: {} as FormCreateResponse },
    update: { path: "/update", request: {} as FormUpdateRequest, response: {} as FormUpdateResponse },
    del:    { path: "/del",    request: {} as FormDeleteRequest, response: {} as FormDeleteResponse },
} as const;
