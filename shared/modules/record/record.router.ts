import {
    RecordHistoryRequest, RecordHistoryResponse,
    RecordSubmitRequest, RecordSubmitResponse,
    RecordAllRequest, RecordAllResponse,
    RecordDeleteRequest, RecordDeleteResponse,
    RecordNoteRequest, RecordNoteResponse,
} from "./record.interface";

export const recordRoutes = {
    base: "/api",
    prefix: "/record",
    history: { path: "/history", request: {} as RecordHistoryRequest, response: {} as RecordHistoryResponse },
    submit: { path: "/submit", request: {} as RecordSubmitRequest, response: {} as RecordSubmitResponse, apikey: true },
    all: { path: "/all", request: {} as RecordAllRequest, response: {} as RecordAllResponse, apikey: true },
    del: { path: "/del", request: {} as RecordDeleteRequest, response: {} as RecordDeleteResponse },
    note: { path: "/note", request: {} as RecordNoteRequest, response: {} as RecordNoteResponse },
} as const;
