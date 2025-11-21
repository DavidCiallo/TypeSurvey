import { BaseResponse, BaseRouterInstance } from "../lib/decorator";

export class AuthRouterInstance extends BaseRouterInstance {
    base = "/api";
    prefix = "/auth";
    router = [
        {
            name: "login",
            path: "/login",
            method: "post",
            handler: Function,
        },
        {
            name: "register",
            path: "/register",
            method: "post",
            handler: Function,
        },
        {
            name: "code",
            path: "/code",
            method: "post",
            handler: Function,
        },
    ];

    login: (request: AuthBody, callback?: Function) => Promise<LoginResult>;
    register: (request: AuthBody, callback?: Function) => Promise<RegisterResult>;
    code: (request: CodeLogin, callback?: Function) => Promise<LoginResult>;

    constructor(
        inject: Function,
        functions?: {
            login: (request: AuthBody) => Promise<LoginResult>;
            register: (request: AuthBody) => Promise<RegisterResult>;
            code: (request: CodeLogin) => Promise<LoginResult>;
        },
    ) {
        super();
        inject(this, functions);
    }
}

export interface AuthBody {
    name?: string;
    email?: string;
    password?: string;
}

export interface LoginResult extends BaseResponse {
    data?: {
        token: string;
    };
}

export interface RegisterResult extends BaseResponse {}

export interface CodeLogin {
    code: string;
}
