import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { useFcmToken } from "@/hooks/useFcmToken";

/**
 * 모바일 로그인 페이지
 * - 이메일 + 비밀번호 로그인
 * - 자동 로그인 지원
 */
export default function PinLogin() {
  const [, setLocation] = useLocation();
  // 저장된 이메일 불러오기
  const [email, setEmail] = useState(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    return savedEmail || "";
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // FCM 토큰 등록 훅
  const { registerFcmToken } = useFcmToken();

  // 자동 로그인 체크
  const userQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!localStorage.getItem('authToken'),
    retry: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && userQuery.data) {
      // 토큰이 있고 사용자 정보를 가져왔으면 역할에 따라 리다이렉션
      const userRole = userQuery.data.role?.toLowerCase();
      let redirectTo = "/";

      if (userRole === "worker") {
        redirectTo = "/mobile/worker";
      } else if (userRole === "inspector") {
        redirectTo = "/mobile/inspector";
      }

      console.log(`[MobileLogin] Auto-login to ${redirectTo} (role: ${userRole})`);
      setLocation(redirectTo);
    }
  }, [setLocation, userQuery.data]);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => handleLoginSuccess(data),
    onError: (error) => handleLoginError(error),
  });

  const pinLoginMutation = trpc.authPin.loginWithEmailAndPin.useMutation({
    onSuccess: (data) => handleLoginSuccess(data),
    onError: (error) => handleLoginError(error),
  });

  const handleLoginSuccess = async (data: any) => {
    console.log('[PinLogin] Login success:', data);
    toast.success(`환영합니다, ${data.user.name}님!`);

    // 모바일 앱에서는 항상 토큰 저장 (세션 동안 사용)
    const token = data.token || '';
    if (!token) {
      console.error('[PinLogin] No token received from server!');
      // 토큰이 없으면 리다이렉션 하지 않음 (무한 루프 방지)
      toast.error('로그인 처리에 실패했습니다. (토큰 누락)');
      return;
    }

    if (token) {
      localStorage.setItem('authToken', token);
      console.log('[PinLogin] Token saved:', token.length, 'chars');

      // 로그인 성공 후 FCM 토큰 등록 시도
      registerFcmToken();
    }

    if (rememberMe) {
      localStorage.setItem('savedEmail', email);
    } else {
      localStorage.removeItem('savedEmail');
    }

    // 사용자 정보를 캐시에 직접 설정
    utils.auth.me.setData(undefined, data.user);
    await utils.auth.me.invalidate();

    // 리다이렉션
    const userRole = data.user.role?.toLowerCase();
    let redirectTo = "/";

    if (userRole === "worker") {
      redirectTo = "/mobile/worker";
    } else if (userRole === "inspector") {
      redirectTo = "/mobile/inspector";
    }

    console.log(`[PinLogin] Redirecting to ${redirectTo} (role: ${userRole})`);
    setLocation(redirectTo);
  };

  const handleLoginError = (error: any) => {
    console.error('[PinLogin] Login error:', error);
    const errorMessage = error.message || "로그인에 실패했습니다";
    if (errorMessage.includes('네트워크') || errorMessage.includes('fetch')) {
      toast.error("서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.");
    } else {
      toast.error(errorMessage);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("이메일과 비밀번호(또는 PIN)를 입력해주세요");
      return;
    }

    // 비밀번호 길이에 따라 로그인 방식 결정
    if (password.length === 4) {
      // 4자리는 PIN 로그인 시도
      console.log('[PinLogin] Attempting PIN login...');
      pinLoginMutation.mutate({ email, pin: password });
    } else {
      // 그 외는 일반 비밀번호 로그인 시도
      console.log('[PinLogin] Attempting Password login...');
      loginMutation.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">모바일 로그인</CardTitle>
          <CardDescription>
            이메일과 비밀번호로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="worker@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  autoComplete="email"
                  autoFocus
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                />
              </div>
            </div>

            {/* 로그인 유지 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label
                htmlFor="rememberMe"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                이 기기에 로그인 유지
              </label>
            </div>

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              className="w-full text-lg py-6"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>

            {/* 안내 메시지 */}
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-2 text-green-600 font-medium">
                ✅ 한 번만 로그인하면 자동으로 로그인됩니다
              </p>
              <p className="mt-4 pt-4 border-t">
                로그인 정보를 잊으셨나요?<br />
                관리자에게 문의해주세요.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}




