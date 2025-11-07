import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ERMS API is running (Express)",
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasSupabase: !!process.env.SUPABASE_URL,
      nodeVersion: process.version,
    }
  });
});

app.all("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.url,
  });
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Strip /api prefix
  if (req.url?.startsWith("/api")) {
    req.url = req.url.substring(4) || "/";
  }

  try {
    await new Promise<void>((resolve) => {
      app(req as any, res as any, (err: any) => {
        if (err && !res.headersSent) {
          res.status(500).json({ error: err.message });
        }
        resolve();
      });
    });
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
}
