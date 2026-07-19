import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import path from "node:path";

export default defineConfig({
    html: {
        title: "简表",
        favicon: "./client/favicon.svg",
    },
    plugins: [pluginReact()],
    source: {
        entry: {
            index: "./client/index.tsx",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:3400",
                changeOrigin: true,
            },
            "/uploads": {
                target: "http://127.0.0.1:3400",
                changeOrigin: true,
            },
            "/ws": {
                target: "http://127.0.0.1:61207",
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
