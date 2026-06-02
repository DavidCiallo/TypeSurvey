import {
    AliveRequest,
    LoginRequest,
    RegisterRequest,
    AuthConfigRequest,
    VerifyEmailRequest,
    CodeLoginRequest,
} from "../../../shared/modules/auth/auth.interface";
import { authRoutes } from "../../../shared/modules/auth/auth.router";
import { getIdentifyByVerify, loginUser, preRegisterUser, completeRegistration, getAccountByEmail } from "./auth.service";
import { getSetting } from "../settings/settings.service";

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
    const domains = getSetting("allowed_domains");
    const allowed_domains = domains ? domains.split(",").map(d => d.trim()).filter(Boolean) : [];
    const fromDomains = getSetting("allowed_from_domains");
    const allowed_from_domains = fromDomains ? fromDomains.split(",").map(d => d.trim()).filter(Boolean) : [];
    const allow_register = getSetting("allow_register") !== "0";
    return { allowed_domains, allowed_from_domains, allow_register };
}

async function register(request: RegisterRequest) {
    request = RegisterRequest.self(request);
    if (getSetting("allow_register") === "0") throw "Registration has been disabled";
    const { identify } = request;
    if (!identify) throw "Register data is missing";
    const { name, email, password } = identify;
    const result = await preRegisterUser(name, email, password);
    if (!result.needsVerification) throw "Registration failed, email may already exist";
    return { needs_verification: true };
}

async function verify(request: VerifyEmailRequest) {
    request = VerifyEmailRequest.self(request);
    const { token } = request;
    if (!token) throw "Verification token is required";
    const result = await completeRegistration(token);
    if (!result) throw "Invalid or expired verification link, or email already registered";
    return { token: result.token, is_admin: result.account?.is_admin };
}

async function code(request: CodeLoginRequest) {
    if (!request.code) throw "Missing code";
    const email = request.code;
    const password = "";
    const result = await loginUser(email, password);
    if (!result.token) throw "Invalid login code";
    return { token: result.token, is_admin: result.is_admin, roles: result.roles };
}

export const authController = {
    routes: authRoutes,
    handlers: { alive, login, register, config, verify, code },
};
