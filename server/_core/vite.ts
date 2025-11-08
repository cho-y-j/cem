import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // 프로덕션에서는 빌드된 파일이 루트 디렉토리에 있음 (package.json의 build 스크립트: cp -r dist/* .)
  // process.cwd()를 사용하여 현재 작업 디렉토리(프로젝트 루트)를 가져옴
  const projectRoot = process.cwd();
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(projectRoot, "dist")
      : projectRoot; // 프로덕션에서는 루트 디렉토리
  
  console.log(`[Static] Serving from: ${distPath}`);
  console.log(`[Static] NODE_ENV: ${process.env.NODE_ENV}`);
  
  // index.html 파일 존재 여부 확인
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(
      `[Static] ERROR: Could not find index.html at: ${indexPath}`
    );
    console.error(
      `[Static] Current working directory: ${projectRoot}`
    );
    console.error(
      `[Static] Directory contents: ${fs.existsSync(distPath) ? fs.readdirSync(distPath).join(", ") : "directory does not exist"}`
    );
    // 에러를 던지지 않고 계속 진행 (서버가 시작되도록)
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send(`
        <html>
          <body>
            <h1>404 - Build files not found</h1>
            <p>Expected index.html at: ${indexPath}</p>
            <p>Current directory: ${projectRoot}</p>
            <p>Please make sure the build completed successfully.</p>
          </body>
        </html>
      `);
    }
  });
}
