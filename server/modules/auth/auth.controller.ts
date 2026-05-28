import {
    AliveRequest,
    LoginRequest,
    RegisterRequest,
    AuthConfigRequest,
    CodeLoginRequest,
} from "../../../shared/modules/auth/auth.interface";
import { authRoutes } from "../../../shared/modules/auth/auth.router";
import { getIdentifyByVerify, loginUser, registerUser, getAccountByEmail } from "./auth.service";

const ALL_MENUS = ["form", "field", "record"];

async function alive(request: AliveRequest) {
    request = AliveRequest.self(request);
    const { auth } = request;
    if (auth && getIdentifyByVerify(auth)) {
        const email = getIdentifyByVerify(auth)!;
        const account = await getAccountByEmail(email);
        if (account) {
            const roles = account.is_admin
                ? ALL_MENUS.map(name => ({ name, type: "menu" }))
                : [];
            return { is_admin: account.is_admin, roles };
        }
        return { is_admin: 0, roles: [] };
    } else {
        throw "Unauthorized";
    }
}

async function login(request: LoginRequest) {
    request = LoginRequest.self(request);
    const { identify } = request;
    if (!identify) throw "Authorized failed";
    const { email, password } = request.identify;
    const result = await loginUser(email, password);
    if (!result.token) throw "Invalid email or password";
    return { token: result.token, is_admin: result.is_admin, roles: result.roles };
}

async function config(_request: AuthConfigRequest) {
    return { allowed_domains: [] };
}

async function register(request: RegisterRequest) {
    request = RegisterRequest.self(request);
    const { identify } = request;
    if (!identify) throw "Register data is missing";
    const { name, email, password } = identify;
    const result = await registerUser(name, email, password);
    if (!result.success) throw "Registration failed, email may already exist";
    return {};
}

async function code(request: CodeLoginRequest) {
    if (!request.code) throw "Missing code";
    const email = request.code;
    const password = ""; // 通过 code 前缀匹配登录
    const result = await loginUser(email, password);
    if (!result.token) throw "Invalid login code";
    return { token: result.token, is_admin: result.is_admin, roles: result.roles };
}

export const authController = {
    routes: authRoutes,
    handlers: { alive, login, register, config, code },
};
