export class HttpClientService {
    private static instance: HttpClientService;
    private constructor() {
        // private
    }
    public static getInstance(): HttpClientService {
        if (!HttpClientService.instance) {
            HttpClientService.instance = new HttpClientService();
        }
        return HttpClientService.instance;
    }
    public async get(name: string, url: string, query: URLSearchParams) {
        const final_url = url + "?" + new URLSearchParams(query).toString();
        fetch(final_url, {
            method: "get",
            headers: { "Token": localStorage.getItem("token") || "" }
        }).then(r => r.json()).then(data => {
            const event = new CustomEvent(name, { detail: data, bubbles: true });
            window.dispatchEvent(event);
        });
    }
    public async post(name: string, url: string, body: any) {
        fetch(url, {
            method: "post",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json", "Token": localStorage.getItem("token") || "" }
        }).then(r => r.json()).then(data => {
            const event = new CustomEvent(name, { detail: data, bubbles: true });
            window.dispatchEvent(event);
        });
    }
}