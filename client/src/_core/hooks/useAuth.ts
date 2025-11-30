import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // 모바일 앱에서는 토큰이 있을 때만 auth.me 쿼리 실행 (웹은 쿠키 사용)
  const isMobile = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('authToken');
  const shouldEnableQuery = !isMobile || hasToken; // 웹이거나 모바일에서 토큰이 있으면 실행

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: shouldEnableQuery,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const removeFcmTokenMutation = trpc.notifications.removeFcmToken.useMutation();

  const logout = useCallback(async () => {
    try {
      // 로그아웃 전 FCM 토큰 제거 시도 (실패해도 로그아웃은 진행)
      try {
        await removeFcmTokenMutation.mutateAsync();
      } catch (e) {
        console.warn('Failed to remove FCM token:', e);
      }
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // 모바일 앱에서는 localStorage에서 토큰 삭제
      if (isMobile && typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        // 로그아웃 플래그 설정 (자동 로그인 방지)
        localStorage.setItem('logoutFlag', Date.now().toString());
      }
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, removeFcmTokenMutation, utils, isMobile]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    // Skip redirect if no login URL configured (development mode)
    if (!redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
