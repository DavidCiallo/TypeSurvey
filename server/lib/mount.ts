import { Express, Request, Response } from "express";
import { BaseRouterInstance, BaseWebsocketInstance, WSMessage } from "../../shared/lib/decorator";
import { Server } from "ws";
import { WebSocketServerService } from "./webscoket";

export function mounthttp(expressApp: Express, controllers: BaseRouterInstance[]) {
    const interfaceList: Array<{ base: string, prefix: string, path: string, method: string }> = [];
    for (const controller of controllers) {
        console.log(`Controller ${controller.prefix} is registering with ${controller.router.length} routes.`);
        const { base, prefix, router } = controller;
        for (const item of router) {
            const { path, method, handler } = item;
            if (interfaceList.some(item => item.prefix === prefix && item.path === path && item.method === method)) {
                throw new Error(`Duplicate route found: ${prefix}${path} with method ${method}`);
            } else {
                interfaceList.push({ base, prefix, path, method });
            }
            if (!handler || typeof handler !== "function") {
                throw new Error(`Handler method "${method}" for route ${prefix}${path} is not valid.`);
            }
            if (!(method === "get" || method === "post" || method === "put" || method === "delete")) {
                throw new Error(`Invalid method ${method} for route ${prefix}${path}. Supported methods are: get, post, put, delete.`);
            }
            expressApp[method](`${base}${prefix}${path}`, async (req: Request, res: Response) => {
                const auth = req.headers["token"];
                switch (method) {
                    case "get":
                        res.send(await handler({ ...req.query, auth }));
                        break;
                    case "post":
                        res.send(await handler({ ...req.body, auth }));
                        break;
                }
            });
        }
    }
}

export function mountws(wss: Server, controllers: BaseWebsocketInstance[]) {
    const wsService = WebSocketServerService.getInstance();

    const allMethods = controllers.flatMap(controller => controller.methods);
    if (new Set(allMethods.map(method => method.name)).size !== allMethods.length) {
        throw new Error("There are duplicate method names in the controller.");
    } else {
        allMethods.forEach(method => {
            console.log(`Websocket [${method.name}] is registering.`);
        });
    }
    wss.on('connection', ws => {
        const clientId = wsService.addClient(ws);
        console.log(`Client ${clientId} connected.`);
        ws.on('message', async message => {
            // message的结构为name，type，payload
            // 注入方法的目的在于实现这样的流程
            // 当收到message时，获取 name，type，payload，此处的name要存在于注入方法的列表中
            // 若type为single,则立即调用注入方法，执行handle(payload)并返回结果给客户端
            // 若type为continuous,则将name，type，payload保存在listener中，等待服务器同名事件触发后，会持续返回
            const msg: WSMessage = JSON.parse(message.toString());
            const { name, payload, auth } = msg;
            if (auth && typeof payload === "object") {
                payload.auth = auth;
            }
            const { handler, type } = allMethods.find(method => method.name === name)!;
            if (!handler) {
                const result = JSON.stringify({ success: false, error: "Method not found." });
                wsService.sendMessage(clientId, result);
            } else if (type === "single") {
                const result = JSON.stringify({ success: true, name, data: await handler(payload) });
                wsService.sendMessage(clientId, result);
            } else if (type === "continuous") {
                const result = JSON.stringify({ success: true, name, data: await handler(payload) });
                wsService.sendMessage(clientId, result);
                wsService.listenEvent(clientId, name, handler, payload);
            }
        });
    });
}