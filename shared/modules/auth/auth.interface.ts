import { BaseRequest, BaseResponse } from "../../lib/default/decorator";
import { AccountEntity } from "./auth.entity";

export class LoginBody {
    public email: string;
    public password: string;

    constructor(origin: Pick<AccountEntity, "email" | "password">) {
        if (!origin.email || !origin.password) {
            throw new Error("Email and password are required");
        }
        this.email = origin.email;
        this.password = origin.password;
    }

    static self(unsafe: LoginBody) {
        return new LoginBody(unsafe);
    }
}

export class RegisterBody {
    public name: string;
    public email: string;
    public password: string;

    constructor(origin: any) {
        if (!origin.name || !origin.email || !origin.password) {
            throw new Error("Name, email and password are required");
        }
        this.name = origin.name;
        this.email = origin.email;
        this.password = origin.password;
    }

    static self(unsafe: RegisterBody) {
        return new RegisterBody(unsafe);
    }
}

export class RegisterRequest implements BaseRequest {
    public auth?: string;
    public identify: RegisterBody;

    constructor(origin: Partial<RegisterRequest>) {
        if (!origin.identify) throw new Error("Register data is required");
        this.identify = RegisterBody.self(origin.identify);
    }
    static self(unsafe: RegisterRequest) {
        return new RegisterRequest(unsafe);
    }
}

export class RegisterResponse implements BaseResponse<{ needs_verification?: boolean }> {
    public success: boolean;
    public message: string;
    public data: { needs_verification?: boolean };

    constructor(origin: RegisterResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class LoginRequest implements BaseRequest {
    public auth?: string;
    public identify: LoginBody;

    constructor(origin: Partial<LoginRequest>) {
        if (!origin.identify) throw new Error("Login data is required");
        origin.auth && (this.auth = origin.auth);
        this.identify = LoginBody.self(origin.identify);
    }

    static self(unsafe: LoginRequest) {
        return new LoginRequest(unsafe);
    }
}

export class LoginResponse implements BaseResponse<{ token: string; is_admin?: number; roles?: { name: string; type: string }[] }> {
    public success: boolean;
    public message: string;
    public data: {
        token: string;
        is_admin?: number;
        roles?: { name: string; type: string }[];
    };

    constructor(origin: LoginResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class AliveRequest implements BaseRequest {
    public auth?: string;

    constructor(origin: Partial<AliveRequest>) {
        this.auth = origin.auth;
    }

    static self(unsafe: AliveRequest) {
        return new AliveRequest(unsafe);
    }
}

export class AuthConfigRequest implements BaseRequest {
    constructor() {}
    static self(_unsafe: AuthConfigRequest) {
        return new AuthConfigRequest();
    }
}

export class AuthConfigResponse implements BaseResponse<{ allowed_domains: string[]; allowed_from_domains: string[]; allow_register: boolean }> {
    public success: boolean;
    public message: string;
    public data: { allowed_domains: string[]; allowed_from_domains: string[]; allow_register: boolean };

    constructor(origin: AuthConfigResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class AliveResponse implements BaseResponse<{ is_admin?: number; roles?: { name: string; type: string }[] }> {
    public success: boolean;
    public message: string;
    public data: { is_admin?: number; roles?: { name: string; type: string }[] };

    constructor(origin: AliveResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class VerifyEmailRequest implements BaseRequest {
    public auth?: string;
    public token: string;

    constructor(origin: Partial<VerifyEmailRequest>) {
        if (!origin.token) throw new Error("Token is required");
        this.token = origin.token;
    }
    static self(unsafe: VerifyEmailRequest) {
        return new VerifyEmailRequest(unsafe);
    }
}

export class VerifyEmailResponse implements BaseResponse<{ token: string; is_admin?: number }> {
    public success: boolean;
    public message: string;
    public data: { token: string; is_admin?: number };

    constructor(origin: VerifyEmailResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}

export class CodeLoginRequest implements BaseRequest {
    public auth?: string;
    public code: string;

    constructor(origin: Partial<CodeLoginRequest>) {
        if (!origin.code) throw new Error("Code is required");
        origin.auth && (this.auth = origin.auth);
        this.code = origin.code;
    }

    static self(unsafe: CodeLoginRequest) {
        return new CodeLoginRequest(unsafe);
    }
}

export class CodeLoginResponse implements BaseResponse<{ token: string }> {
    public success: boolean;
    public message?: string;
    public data?: { token: string };
    constructor(origin: CodeLoginResponse) {
        this.success = origin.success;
        this.message = origin.message;
        this.data = origin.data;
    }
}
