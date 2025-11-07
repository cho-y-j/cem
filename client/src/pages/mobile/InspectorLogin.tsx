import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export default function InspectorLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const loginMutation = trpc.authPin.loginWithEmailAndPin.useMutation({
    onSuccess: (data) => {
      toast.success(`환영합니다, ${data.user.name}님!`);
      // 로그인 성공 후 점검원 메인 화면으로 이동
      if (data.user.role === "inspector") {
        setLocation("/mobile/inspector");
      } else if (data.user.role === "worker") {
        setLocation("/mobile/worker");
      } else {
        setLocation("/");
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setPin("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    if (pin.length !== 4) {
      toast.error("PIN 코드는 4자리를 입력해주세요.");
      return;
    }

    loginMutation.mutate({ email, pin });
  };

  const handlePinInput = (value: string) => {
    // 숫자만 입력 가능
    const numericValue = value.replace(/\D/g, "");
    if (numericValue.length <= 4) {
      setPin(numericValue);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">안전점검원 로그인</CardTitle>
          <CardDescription>
            이메일과 PIN 코드로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 입력 */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                이메일
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="inspector@example.com"
                className="h-12 text-base"
                autoFocus
                disabled={loginMutation.isPending}
              />
            </div>

            {/* PIN 입력 */}
            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                PIN 코드 (4자리)
              </Label>
              <Input
                id="pin"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinInput(e.target.value)}
                placeholder="0000"
                className="text-center text-3xl tracking-widest font-mono h-16"
                maxLength={4}
                disabled={loginMutation.isPending}
              />
              <div className="flex justify-center gap-2 mt-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      i < pin.length
                        ? "bg-green-600 border-green-600"
                        : "bg-white border-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>

            {/* 도움말 */}
            <div className="text-center text-sm text-muted-foreground mt-6">
              <p>PIN 코드를 잊으셨나요?</p>
              <p className="text-xs mt-1">관리자에게 문의하세요</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
