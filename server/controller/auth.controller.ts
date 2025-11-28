import {
    AliveRequest,
    AliveResponse,
    AuthBody,
    AuthRouterInstance,
    CodeLogin,
    LoginResult,
    RegisterResult,
} from "../../shared/router/AuthRouter";
import { inject } from "../lib/inject";
import { getIdentifyByVerify, loginUser, registerUser } from "../service/auth.service";

async function alive(request: AliveRequest): Promise<AliveResponse> {
    const { auth } = request;
    if (auth && getIdentifyByVerify(auth)) {
        return { success: true };
    } else {
        return { success: false };
    }
}

async function login(request: AuthBody): Promise<LoginResult> {
    const { email, password } = request;
    if (email && password) {
        const { token } = await loginUser(email, password);
        if (!token) {
            return { success: false, message: "账号或密码错误" };
        }
        return { success: true, data: { token } };
    }
    return { success: false, message: "缺少参数" };
}

async function register(request: AuthBody): Promise<RegisterResult> {
    if (!request.email || !request.password) {
        return { success: false };
    }
    const result = await registerUser(request.name || "", request.email, request.password);
    return result;
}

async function code(request: CodeLogin): Promise<LoginResult> {
    const { code } = request;
    if (!code) {
        return { success: false, message: "缺少参数" };
    }
    const { token } = await loginUser(code, "");
    if (!token) {
        return { success: false, message: "无效的登录码" };
    }
    return { success: true, data: { token } };
}

export const authController = new AuthRouterInstance(inject, { alive, login, register, code });
