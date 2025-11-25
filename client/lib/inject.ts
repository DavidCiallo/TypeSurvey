import { BaseRouterInstance, Route } from "../../shared/lib/decorator";
import { HttpClientService } from "./webhttp";

export function inject(instance: BaseRouterInstance) {
    const http = HttpClientService.getInstance();
    const { base, prefix, router } = instance;
    router.forEach((route: Route) => {
        route.handler = null;
        const { name, path, method } = route;
        const url = base + prefix + path;

        if (method === "get") {
            instance[name] = async (query: URLSearchParams) => {
                return http.get(url, query);
            };
        } else if (method === "post") {
            instance[name] = async (body: Record<string, any>) => {
                return http.post(url, body);
            };
        }
    });
}
