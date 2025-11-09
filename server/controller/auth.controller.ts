import { AuthBody, AuthRouterInstance, LoginToken, RegisterResult } from "../../shared/router/AuthRouter";
import { inject, injectws } from "../lib/inject";
import { loginUser, registerUser } from "../service/auth.service";

async function login(request: AuthBody): Promise<LoginToken> {
    const { email, password} = request;
    if (email && password) {
        return await loginUser(email, password);
    }
    return { token: "", success: false };
}

async function register(request: AuthBody): Promise<RegisterResult> {
    if (!request.email || !request.password) {
        return { success: false };
    }
    const result = await registerUser(request.name || "", request.email, request.password);
    return result;
}


export const authController = new AuthRouterInstance(inject, { login, register });