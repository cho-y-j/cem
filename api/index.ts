import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";

// Express 앱 생성
const app = express();

// Body parser 설정
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 루트 경로 헬스체크
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ERMS API is running (Express version)",
    timestamp: new Date().toISOString(),
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeVersion: process.version,
    }
  });
});

// Catch all for debugging
app.all("*", (req, res) => {
  res.json({
    status: "catch-all",
    message: "Received request",
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    method: req.method,
  });
});

// 404 핸들러
app.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested resource was not found",
  });
});

// 전역 에러 핸들러
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API] Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message || "An unexpected error occurred",
  });
});

// Vercel serverless 함수 핸들러
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Vercel은 /api로 요청을 전달하므로 /api를 제거하여 Express가 /로 처리하도록 함
    if (req.url?.startsWith("/api")) {
      req.url = req.url.substring(4) || "/";
    }

    // Express 앱을 요청/응답에 연결
    await new Promise<void>((resolve) => {
      app(req as any, res as any, (err: any) => {
        if (err) {
          console.error("[API] Express error:", err);
          if (!res.headersSent) {
            res.status(500).json({
              error: "Internal server error",
              message: err.message,
            });
          }
        }
        resolve();
      });
    });
  } catch (error: any) {
    console.error("[API] Handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }
}
