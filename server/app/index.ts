import { config } from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

config();

// 中间件-pg
// 中间件-express
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";

// 中间件-各级路由
import { mounthttp, mountws } from "../lib/mount";
import { authController } from "../controller/auth.controller";
import { formController } from "../controller/form.controller";
import { fieldController } from "../controller/field.controller";
import { radioController } from "../controller/radio.controller";
import { recordController } from "../controller/record.controller";
import { fileController } from "../controller/file.controller";

// HTTP
const app = express();
app.use(bodyParser.json()).use(cors());
mounthttp(app, [authController, recordController, formController, fieldController, radioController, fileController]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPath = path.join(__dirname);

// HTTP-File
app.use(express.static(staticPath));
app.use((q, s, n) => (q.path.endsWith(".mjs") ? s.status(403).send("Forbidden") : n()));
app.get(/.*/, (q, s) => {
    if (q.path.startsWith("/api")) return s.status(404).json({ error: "API not found" });
    else if (q.path.startsWith("/favicon.ico")) return s.sendFile(path.join(staticPath, "favicon.ico"));
    else return s.sendFile(path.join(staticPath, "index.html"));
});

// 挂载
const server = http.createServer(app);

// WebSocket
const wss = new WebSocketServer({ server, path: "/ws" });
mountws(wss, []);

server.listen(process.env.SERVER_PORT || 3300, () => {
    console.log(`Server is running at http://localhost:${process.env.SERVER_PORT || 3300}`);
});
