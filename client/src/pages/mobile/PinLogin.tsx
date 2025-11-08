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

/**
 * 모바일 로그인 페이지
 * - 이메일 + 비밀번호 로그인
 * - 자동 로그인 지원
 */
export default function PinLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

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

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      console.log('[PinLogin] Login success:', data);
      toast.success(`환영합니다, ${data.user.name}님!`);

      if (rememberMe) {
        // 토큰 저장 (자동 로그인)
        localStorage.setItem('authToken', data.token || '');
        console.log('[PinLogin] Token saved for auto-login');
      }

      // 역할에 따라 적절한 페이지로 리다이렉션
      const userRole = data.user.role?.toLowerCase();
      let redirectTo = "/";

      if (userRole === "worker") {
        redirectTo = "/mobile/worker";
      } else if (userRole === "inspector") {
        redirectTo = "/mobile/inspector";
      }
      // admin, owner, bp, ep는 대시보드(/)로 이동

      setTimeout(() => {
        console.log(`[PinLogin] Redirecting to ${redirectTo} (role: ${userRole})`);
        setLocation(redirectTo);
      }, 100);
    },
    onError: (error) => {
      console.error('[PinLogin] Login error:', error);
      toast.error(error.message || "로그인에 실패했습니다");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요");
      return;
    }

    loginMutation.mutate({ email, password });
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




