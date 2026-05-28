export interface BaseRequest {
    auth?: string;
}

type Value = string | number | boolean | null | { [key: string]: Value } | Value[];

export interface BaseResponse<T> {
    success: boolean;
    data?: Record<string, Value | T | Array<T | Value>> | Array<T | Value>;
    message?: string;
}
