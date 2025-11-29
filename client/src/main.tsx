import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// API URL 결정: Capacitor 환경에서는 절대 URL 사용
// 
// 앱과 웹의 차이점:
// - 웹: 브라우저가 쿠키를 자동으로 관리하고 전송 (같은 도메인이면 자동)
// - 앱: Capacitor는 네이티브 HTTP 클라이언트를 사용하므로:
//   1. 쿠키가 제대로 작동하지 않을 수 있음 (도메인/경로 문제)
//   2. 절대 URL이 필요함 (상대 경로는 작동하지 않음)
//   3. Authorization 헤더를 사용해야 함 (쿠키 대신)
//
// 그래서 앱은 헤더 기반 인증, 웹은 쿠키 기반 인증을 사용합니다.
const getApiUrl = () => {
  // 환경 변수로 API URL이 설정되어 있으면 사용
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    return `${envApiUrl}/api/trpc`;
  }

  // Capacitor 환경 (모바일 앱) - 프로덕션 서버 사용
  if (Capacitor.isNativePlatform()) {
    // 프로덕션 서버 URL 사용
    return "https://cem-21tp.onrender.com/api/trpc";
  }

  // 웹 브라우저: 상대 경로 사용
  return "/api/trpc";
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      transformer: superjson,
      fetch(input, init) {
        // 모바일 앱에서는 Authorization 헤더 사용, 웹은 쿠키 사용
        const headers = new Headers(init?.headers);
        
        if (Capacitor.isNativePlatform()) {
          // 모바일 앱: localStorage에서 토큰 가져와서 Authorization 헤더에 추가
          const token = localStorage.getItem('authToken');
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
            console.log('[API] Authorization header added:', token.substring(0, 20) + '...');
          } else {
            console.warn('[API] No auth token found in localStorage');
          }
          // 모바일 앱에서 Content-Type 명시적으로 설정
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
        }
        
        const url = typeof input === 'string' ? input : input.url;
        console.log(`[API] ${init?.method || 'GET'} ${url}`);
        console.log('[API] Headers:', Object.fromEntries(headers.entries()));
        
        // Headers 객체를 일반 객체로 변환하여 전달 (일부 환경에서 Headers 객체가 제대로 전달되지 않을 수 있음)
        const headersObj: Record<string, string> = {};
        headers.forEach((value, key) => {
          headersObj[key] = value;
        });
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers: headersObj,
          // 웹에서는 쿠키 사용, 모바일에서는 헤더 사용
          credentials: Capacitor.isNativePlatform() ? "omit" : "include",
        }).catch((error) => {
          console.error('[API] Fetch error:', error);
          console.error('[API] URL:', url);
          console.error('[API] Headers:', headersObj);
          // 네트워크 에러를 더 명확하게 전달
          throw new Error(`네트워크 연결 실패: ${error.message || '서버에 연결할 수 없습니다'}`);
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
