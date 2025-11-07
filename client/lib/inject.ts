import { BaseRouterInstance, BaseWebsocketInstance, Route } from "../../shared/lib/decorator";
import { HttpClientService } from "./webhttp";
import { WebSocketClientService } from "./websocket";

export function inject(instance: BaseRouterInstance) {
    const http = HttpClientService.getInstance();
    const { base, prefix, router } = instance;
    router.forEach((route: Route) => {
        route.handler = null;
        const { name, path, method } = route;
        const url = base + prefix + path;
        if (method === "get") {
            instance[name] = async (query: URLSearchParams, callback?: Function) => {
                window.addEventListener(name, (event) => {
                    const data = (event as CustomEvent)["detail"];
                    callback && callback(data);
                })
                http.get(name, url, query);
            }
        }
        else if (method === "post") {
            instance[name] = async (body: Record<string, any>, callback?: Function) => {
                window.addEventListener(name, (event) => {
                    const data = (event as CustomEvent)["detail"];
                    callback && callback(data);
                })
                http.post(name, url, body);
            }
        }
    })
}

export function injectws(instance: BaseWebsocketInstance) {
    if (new Set(instance.methods.map(method => method.name)).size !== instance.methods.length) {
        throw new Error("There are duplicate method names in the controller.");
    }
    const host = location.host;
    const auth = localStorage.getItem("token");

    const ws = WebSocketClientService.getInstance(`wss://${host}/ws`);

    instance.methods.forEach(method => {
        const { name, type } = method;
        instance[name] = async (payload: string, callback?: Function) => {
            window.addEventListener(name, (event) => {
                const data = (event as CustomEvent)["detail"];
                callback && callback(data);
            })
            const message = JSON.stringify({ name, payload, type, auth })
            ws.sendMessage(message);
        }
    })

}