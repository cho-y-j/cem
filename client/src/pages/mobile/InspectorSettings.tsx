import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileBottomNav, { inspectorNavItems } from "@/components/mobile/MobileBottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  KeyRound,
  Loader2,
  CheckCircle,
  LogOut,
  User,
} from "lucide-react";

/**
 * Inspector용 모바일 설정 페이지
 * - 개인정보 표시
 * - 비밀번호, PIN 변경
 * - 로그아웃
 */
export default function InspectorSettings() {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinCode, setPinCode] = useState("");

  // Mutations
  const updatePasswordMutation = trpc.users.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "비밀번호 변경에 실패했습니다");
    },
  });

  const updatePinMutation = trpc.workers.updatePin.useMutation({
    onSuccess: () => {
      toast.success("PIN 번호가 변경되었습니다");
      setPinCode("");
    },
    onError: (error) => {
      toast.error(error.message || "PIN 번호 변경에 실패했습니다");
    },
  });

  const handlePasswordUpdate = () => {
    if (!password || !confirmPassword) {
      toast.error("비밀번호를 입력하세요");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }
    if (password.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }
    updatePasswordMutation.mutate({ password });
  };

  const handlePinUpdate = () => {
    if (!pinCode) {
      toast.error("PIN 번호를 입력하세요");
      return;
    }
    if (pinCode.length !== 4) {
      toast.error("PIN 번호는 4자리 숫자여야 합니다");
      return;
    }
    updatePinMutation.mutate({ pinCode });
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('authToken');
      await logout();
      toast.success("로그아웃되었습니다");
      window.location.href = "/mobile/login";
    } catch (error) {
      toast.error("로그아웃 중 오류가 발생했습니다");
    }
  };

  return (
    <MobileLayout title="설정" showBottomNav={true} navItems={inspectorNavItems}>
      <div className="p-4 space-y-4 pb-32">
        {/* 사용자 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              사용자 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">이름</span>
              <span className="font-medium">{user?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">이메일</span>
              <span className="font-medium">{user?.email || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">역할</span>
              <span className="font-medium">안전점검원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">회사</span>
              <span className="font-medium">{user?.companyName || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              비밀번호 변경
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">새 비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              onClick={handlePasswordUpdate}
              disabled={updatePasswordMutation.isPending}
              className="w-full h-11"
            >
              {updatePasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  변경 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  비밀번호 변경
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* PIN 번호 변경 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              PIN 번호 변경
            </CardTitle>
            <CardDescription className="text-xs">
              모바일 앱 로그인용 4자리 숫자
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pinCode" className="text-sm">새 PIN 번호</Label>
              <Input
                id="pinCode"
                type="password"
                placeholder="1234"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
                className="h-11 text-center text-lg tracking-widest"
              />
            </div>
            <Button
              onClick={handlePinUpdate}
              disabled={updatePinMutation.isPending}
              className="w-full h-11"
            >
              {updatePinMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  변경 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  PIN 번호 변경
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 로그아웃 버튼 */}
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full h-12 text-base"
            >
              <LogOut className="mr-2 h-5 w-5" />
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
