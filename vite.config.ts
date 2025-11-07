import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// HTML 환경 변수 치환 플러그인
function htmlEnvPlugin(): Plugin {
  return {
    name: "html-env-replace",
    transformIndexHtml(html) {
      const appLogo = process.env.VITE_APP_LOGO || "/icon-192.png";
      const appTitle = process.env.VITE_APP_TITLE || "장비관리";
      const analyticsEndpoint = process.env.VITE_ANALYTICS_ENDPOINT || "";
      const analyticsWebsiteId = process.env.VITE_ANALYTICS_WEBSITE_ID || "";
      
      let result = html
        .replace(/%VITE_APP_LOGO%/g, appLogo)
        .replace(/%VITE_APP_TITLE%/g, appTitle);
      
      // Analytics 스크립트 조건부 추가
      if (analyticsEndpoint && analyticsWebsiteId) {
        result = result.replace(
          /<!-- Analytics script will be injected here if VITE_ANALYTICS_ENDPOINT is set -->/,
          `<script defer src="${analyticsEndpoint}/umami" data-website-id="${analyticsWebsiteId}"></script>`
        );
      } else {
        result = result.replace(
          /<!-- Analytics script will be injected here if VITE_ANALYTICS_ENDPOINT is set -->/,
          ""
        );
      }
      
      return result;
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), htmlEnvPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 쿠키 전달
            if (req.headers.cookie) {
              proxyReq.setHeader('cookie', req.headers.cookie);
            }
          });
        },
      },
    },
  },
});
