type RouteDef<Req, Res> = { path: string; request: Req; response: Res };

type ApiClient<T> = {
    [K in keyof T]: T[K] extends RouteDef<infer Req, infer Res>
        ? (body: Req) => Promise<Res>
        : never;
};

function handle401() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_is_admin");
    localStorage.removeItem("user_roles");
    window.location.href = "/auth";
}

export function createClient<T extends { base: string; prefix: string }>(def: T): ApiClient<T> {
    const client = {} as any;
    for (const [key, val] of Object.entries(def)) {
        if (key === "base" || key === "prefix") continue;
        const route = val as any;
        const url = `${def.base}${def.prefix}${route.path}`;
        client[key] = async (body: any) => {
            const token = localStorage.getItem("access_token") || "";
            const response = await fetch(url, {
                method: "POST",
                body: JSON.stringify({ ...body, auth: body.auth || token }),
                headers: {
                    "Content-Type": "application/json",
                    Token: token,
                },
            });
            if (response.status === 401) {
                handle401();
                return { success: false, data: null, message: "登录已过期" };
            }
            return response.json();
        };
    }
    return client;
}
