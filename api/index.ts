import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 환경변수 체크
    const envCheck = {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeVersion: process.version,
    };

    // 기본 응답
    if (req.url === "/" || req.url === "/api") {
      return res.status(200).json({
        status: "ok",
        message: "ERMS API is running (minimal version)",
        timestamp: new Date().toISOString(),
        env: envCheck,
      });
    }

    // 404
    return res.status(404).json({
      error: "Not found",
      message: "Endpoint not found",
      path: req.url,
    });
  } catch (error: any) {
    console.error("[API] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
