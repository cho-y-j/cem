import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { startScheduler } from "./scheduler";
import { serveStatic, setupVite } from "./vite";
// FCM은 지연 로딩으로 처리 (필요할 때만 초기화)

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // CORS 설정 (모바일 앱 지원)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // 허용할 origin 목록
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'https://cem-21tp.onrender.com',
      // 개발 환경에서 모든 origin 허용 (프로덕션에서는 제한 필요)
      ...(process.env.NODE_ENV === 'development' ? ['*'] : [])
    ];
    
    // Origin이 있으면 CORS 헤더 설정
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Origin이 없으면 (같은 도메인 요청) 허용
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      // 개발 환경에서는 모든 origin 허용
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24시간
    
    // OPTIONS 요청 (preflight) 처리
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Health check endpoint for keeping Render server alive
  app.get("/ping", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "Server is alive"
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV}`);
    console.log(`[Server] PORT: ${port}`);

    // 서류 만료 알림 스케줄러 시작
    startScheduler();
  });
}

startServer().catch(console.error);
