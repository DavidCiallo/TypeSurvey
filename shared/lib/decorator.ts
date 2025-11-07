export interface BaseRequest {
    auth?: string;
}
export type Route = { name: string; path: string; method: string; handler: Function | null; }

export type HTTPMethodConstructor = { name: string; path: string; method: string; handler: Function | null; };
export class BaseRouterInstance {
    base: string;
    prefix: string;
    router: Array<{
        name: string;
        path: string;
        method: string;
        handler: Function | null;
    }>;
    [key: string]: string | Function | HTTPMethodConstructor[] | ((...args: any) => Promise<any>);
}

export type WSMethodConstructor = { name: string; type: string; handler: Function | null; };

export interface WSMessage { id: string, name: string, payload: boolean | number | string, type: string, auth: string }

export class BaseWebsocketInstance {
    methods: Array<WSMethodConstructor>;
    [key: string]: Function | WSMethodConstructor[] | ((...args: any) => Promise<boolean | number | string>);
}