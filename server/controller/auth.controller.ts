import { AuthBody, AuthRouterInstance, CodeLogin, LoginResult, RegisterResult } from "../../shared/router/AuthRouter";
import { inject, injectws } from "../lib/inject";
import { loginUser, registerUser } from "../service/auth.service";

async function login(request: AuthBody): Promise<LoginResult> {
    const { email, password } = request;
    if (email && password) {
        return await loginUser(email, password);
    }
    return { success: false, message: "账号或密码错误" };
}

async function register(request: AuthBody): Promise<RegisterResult> {
    if (!request.email || !request.password) {
        return { success: false };
    }
    const result = await registerUser(request.name || "", request.email, request.password);
    return result;
}

async function code(request: CodeLogin): Promise<LoginResult> {
    return await loginUser(request.code, "");
}

export const authController = new AuthRouterInstance(inject, { login, register, code });
