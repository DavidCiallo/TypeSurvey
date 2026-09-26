import { clearAuthData } from "../methods/auth";
import { getCurrentTeamId } from "../methods/team";

type RouteDef<Req, Res> = { path: string; request: Req; response: Res };

type ApiClient<T> = {
    [K in keyof T]: T[K] extends RouteDef<infer Req, infer Res>
        ? (body: Req) => Promise<Res>
        : never;
};

function handle401() {
    clearAuthData();
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
                // team_id is attached here rather than at each call site. Every
                // form/field/record query is scoped to the team the user picked,
                // and a single call that forgot it would either fail or reach for
                // the wrong team's data. Routes that have no use for it ignore it.
                body: JSON.stringify({
                    ...body,
                    auth: body.auth || token,
                    team_id: body.team_id || getCurrentTeamId(),
                }),
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
