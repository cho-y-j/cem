import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json({
      status: "ok",
      message: "Test endpoint working",
      timestamp: new Date().toISOString(),
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        hasSupabase: !!process.env.SUPABASE_URL,
        nodeVersion: process.version
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Test endpoint error",
      message: error.message,
      stack: error.stack
    });
  }
}
