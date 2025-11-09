import { config } from "dotenv";
import cors from "cors";
import path from "path";

config();

// 中间件-pg
// 中间件-express
import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from 'ws';

// 中间件-各级路由
import { mounthttp, mountws } from "../lib/mount";
import { authController } from "../controller/auth.controller";
import { formController } from "../controller/form.controller";
import { fieldController } from "../controller/field.controller";

const app = express();
app.use(bodyParser.json()).use(cors());

mounthttp(app, [
    authController,
    formController,
    fieldController
]);

const staticPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(staticPath));
app.use((q, s, n) => q.path.endsWith('.mjs') ? s.status(403).send('Forbidden') : n());
app.get(/.*/, (q, s) => q.path.startsWith('/api') ? s.status(404).json({ error: 'API not found' }) : s.sendFile(path.join(staticPath, 'index.html')));

app.listen(process.env.SERVER_HTTP_PORT, async () => {
    console.log(`App http listening at http://localhost:${process.env.SERVER_HTTP_PORT}`);
});

// 中间件-websocket
const wss = new WebSocketServer({ port: Number(process.env.SERVER_WS_PORT), path: '/ws' }, () => {
    console.log(`App websocket listening at ws://localhost:${process.env.SERVER_WS_PORT}`);
});
mountws(wss, [
]);
