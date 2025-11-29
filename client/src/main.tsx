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
          }
        }
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          // 웹에서는 쿠키 사용, 모바일에서는 헤더 사용
          credentials: Capacitor.isNativePlatform() ? "omit" : "include",
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
