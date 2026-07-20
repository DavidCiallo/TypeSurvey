import {
    RecordHistoryRequest, RecordHistoryResponse,
    RecordSubmitRequest, RecordSubmitResponse,
    RecordAllRequest, RecordAllResponse,
    RecordDeleteRequest, RecordDeleteResponse,
} from "./record.interface";

export const recordRoutes = {
    base: "/api",
    prefix: "/record",
    history: { path: "/history", request: {} as RecordHistoryRequest, response: {} as RecordHistoryResponse },
    submit: { path: "/submit", request: {} as RecordSubmitRequest, response: {} as RecordSubmitResponse },
    all: { path: "/all", request: {} as RecordAllRequest, response: {} as RecordAllResponse },
    del: { path: "/del", request: {} as RecordDeleteRequest, response: {} as RecordDeleteResponse },
} as const;
