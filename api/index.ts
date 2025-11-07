import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";
import express from "express";

// Express 앱 생성 (Vercel serverless 함수용)
const app = express();

// Body parser 설정
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// OAuth 라우트 등록
try {
  registerOAuthRoutes(app);
} catch (error) {
  console.error("[API] Failed to register OAuth routes:", error);
}

// tRPC API 미들웨어
try {
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
} catch (error) {
  console.error("[API] Failed to setup tRPC:", error);
}

// 루트 경로 헬스체크
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ERMS API is running" });
});

// 전역 에러 핸들러
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API] Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message || "An unexpected error occurred",
  });
});

// 404 핸들러
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested resource was not found",
  });
});

// Vercel serverless 함수 핸들러
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel은 /api로 요청을 전달하므로 /api를 제거하여 Express가 /로 처리하도록 함
  if (req.url?.startsWith("/api")) {
    req.url = req.url.substring(4) || "/";
  }

  // 모든 응답이 JSON 형식인지 보장
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    return originalJson(body);
  };

  try {
    // Express 앱을 요청/응답에 연결
    await new Promise<void>((resolve) => {
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error("[API] Express error:", err);
          // 에러가 발생해도 JSON 응답 보장
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.status(500).json({
              error: "Internal server error",
              message: err.message || "An unexpected error occurred",
              stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            });
          }
        }
        resolve();
      });
    });
  } catch (error: any) {
    console.error("[API] Handler error:", error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: "Internal server error",
        message: error.message || "An unexpected error occurred",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
}
