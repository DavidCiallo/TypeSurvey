import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

config();

import { initialize } from "./initialize";
import { mounthttp, mountstatic, mountws, wshandler } from "../lib/mount";
import { authController } from "../modules/auth/auth.controller";
import { formController } from "../modules/form/form.controller";
import { fieldController } from "../modules/field/field.controller";
import { radioController } from "../modules/radio/radio.controller";
import { recordController } from "../modules/record/record.controller";
import { fileController } from "../modules/file/file.controller";
import { settingsController, appController } from "../modules/settings/settings.controller";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.join(__dirname);
const uploadsPath = path.resolve(__dirname, "../../data/uploads");

await initialize();

const mounts = [authController, recordController, formController, fieldController, radioController, fileController, settingsController, appController];

Bun.serve({
    port: Number(process.env.SERVER_PORT) || 3300,
    async fetch(req, server) {
        const url = new URL(req.url);
        const pathName = url.pathname;

        // WebSocket
        if (mountws(req, server)) return;

        // API routes
        const apiResponse = await mounthttp(req, mounts);
        if (apiResponse) return apiResponse;

        // Uploaded files
        if (pathName.startsWith("/uploads/")) {
            const filePath = path.join(uploadsPath, pathName.slice(9));
            const resolved = path.resolve(filePath);
            if (!resolved.startsWith(path.resolve(uploadsPath) + path.sep)) {
                return new Response("Forbidden", { status: 403 });
            }
            const file = Bun.file(filePath);
            if (await file.exists()) return new Response(file);
            return new Response("Not Found", { status: 404 });
        }

        // Static files
        const staticResponse = await mountstatic(staticPath, pathName);
        if (staticResponse) return staticResponse;

        // 404
        if (pathName.startsWith("/api")) {
            return new Response(JSON.stringify({ error: "API not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response("Not Found", { status: 404 });
    },
    websocket: wshandler,
});

console.log(`Server is running at http://localhost:${process.env.SERVER_PORT || 3300}`);
