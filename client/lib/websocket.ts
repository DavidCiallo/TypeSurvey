import { toast } from "../methods/notify";

export class WebSocketClientService {
    private static instance: WebSocketClientService;
    private ws: WebSocket | null;

    private constructor(url: string) {
        this.ws = null;
        this.connect(url);
    }

    public static getInstance(url: string): WebSocketClientService {
        if (!WebSocketClientService.instance) {
            WebSocketClientService.instance = new WebSocketClientService(url);
        }
        return WebSocketClientService.instance;
    }

    private connect(url: string): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
        this.ws = new WebSocket(url);
        this.ws.onmessage = (event: MessageEvent) => {
            const { success, name, data: detail } = JSON.parse(event.data);
            if (success) {
                const event = new CustomEvent(name, { detail, bubbles: true });
                window.dispatchEvent(event);
            } else {
                toast({ title: "Error", description: "Request failed" })
            }
        };
    }

    public async sendMessage(message: string): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        }
    }
}