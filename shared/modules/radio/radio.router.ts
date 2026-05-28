import {
    RadioCreateRequest, RadioCreateResponse,
    RadioUpdateRequest, RadioUpdateResponse,
    RadioDeleteRequest, RadioDeleteResponse,
} from "./radio.interface";

export const radioRoutes = {
    base: "/api",
    prefix: "/radio",
    create: { path: "/create", request: {} as RadioCreateRequest, response: {} as RadioCreateResponse },
    update: { path: "/update", request: {} as RadioUpdateRequest, response: {} as RadioUpdateResponse },
    del:    { path: "/del",    request: {} as RadioDeleteRequest, response: {} as RadioDeleteResponse },
} as const;
