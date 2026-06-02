import {
    LoginRequest, LoginResponse,
    RegisterRequest, RegisterResponse,
    AliveRequest, AliveResponse,
    AuthConfigRequest, AuthConfigResponse,
    CodeLoginRequest, CodeLoginResponse,
    VerifyEmailRequest, VerifyEmailResponse,
} from "./auth.interface";

export const authRoutes = {
    base: "/api",
    prefix: "/auth",
    login:    { path: "/login",    request: {} as LoginRequest,    response: {} as LoginResponse },
    alive:    { path: "/alive",    request: {} as AliveRequest,    response: {} as AliveResponse },
    register: { path: "/register", request: {} as RegisterRequest, response: {} as RegisterResponse },
    config:   { path: "/config",   request: {} as AuthConfigRequest, response: {} as AuthConfigResponse },
    code:     { path: "/code",     request: {} as CodeLoginRequest, response: {} as CodeLoginResponse },
    verify:   { path: "/verify",   request: {} as VerifyEmailRequest, response: {} as VerifyEmailResponse },
} as const;
