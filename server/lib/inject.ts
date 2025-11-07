import { BaseRouterInstance, BaseWebsocketInstance } from "../../shared/lib/decorator";

export function inject(instance: BaseRouterInstance, functions: Record<string, Function>) {
    instance.router.forEach((route) => {
        const { name, path, method } = route;
        const targetFc = functions?.[name];
        if (targetFc) {
            instance[name] = targetFc;
            route.handler = targetFc;
        } else {
            throw new Error(`${name} is not defined in functions`);
        }
    });
}

export function injectws(instance: BaseWebsocketInstance, functions: Record<string, Function>) {
    instance.methods.forEach(route => {
        const { name } = route;
        const targetFc = functions?.[name];
        if (targetFc) {
            instance[name] = targetFc;
            route.handler = targetFc;
        } else {
            throw new Error(`${name} is not defined in functions`);
        }
    });
}