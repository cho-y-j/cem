import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Fingerprint, Trash2, Smartphone, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { startRegistration } from '@simplewebauthn/browser';

/**
 * 모바일 생체 인증 설정 페이지
 * Worker가 지문/얼굴 인식을 등록하고 관리
 */
export default function BiometricSetup() {
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const utils = trpc.useUtils();

  // 등록된 크레덴셜 목록 조회
  const { data: credentials, isLoading, refetch } = trpc.webauthn.myCredentials.useQuery();

  // 등록 뮤테이션
  const registerMutation = trpc.webauthn.registerCredential.useMutation({
    onSuccess: () => {
      toast.success("생체 인증이 등록되었습니다!");
      refetch();
    },
    onError: (error) => {
      toast.error(`등록 실패: ${error.message}`);
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = trpc.webauthn.deleteCredential.useMutation({
    onSuccess: () => {
      toast.success("생체 인증이 삭제되었습니다.");
      refetch();
    },
    onError: (error) => {
      toast.error(`삭제 실패: ${error.message}`);
    },
  });

  // 생체 인증 등록 핸들러
  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      // 1. 서버에서 등록 옵션 가져오기
      const options = await utils.webauthn.generateRegistrationChallenge.fetch();

      // 2. 브라우저 WebAuthn API 호출 (생체 인식 스캔)
      toast.info("생체 인증을 진행해주세요 (지문 또는 얼굴 인식)");
      const registrationResponse = await startRegistration(options);

      // 3. 서버로 크레덴셜 전송 및 검증
      const deviceName = navigator.userAgent.includes('iPhone') ? 'iPhone' :
                        navigator.userAgent.includes('Android') ? 'Android' :
                        navigator.userAgent.includes('Mac') ? 'Mac' :
                        'Unknown Device';

      await registerMutation.mutateAsync({
        response: registrationResponse,
        deviceName,
      });
    } catch (error: any) {
      console.error('[BiometricSetup] Registration error:', error);
      console.error('[BiometricSetup] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      if (error.name === 'NotAllowedError') {
        toast.error("생체 인증이 취소되었습니다.");
      } else if (error.name === 'NotSupportedError') {
        toast.error("이 기기는 생체 인증을 지원하지 않습니다.");
      } else if (error.message?.includes('origin') || error.message?.includes('RP ID')) {
        toast.error(
          `등록 실패: 서버 설정 오류\n${error.message}\n\n관리자에게 문의하세요.`,
          { duration: 5000 }
        );
      } else {
        toast.error(`등록 실패: ${error.message || '알 수 없는 오류'}`);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // 크레덴셜 삭제 핸들러
  const handleDelete = async (credentialId: string) => {
    if (!confirm("이 생체 인증을 삭제하시겠습니까?")) {
      return;
    }

    await deleteMutation.mutateAsync({ credentialId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/mobile/worker")}
          className="mb-4"
        >
          ← 뒤로
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">생체 인증 설정</h1>
        <p className="text-sm text-gray-600 mt-1">
          지문 또는 얼굴 인식으로 빠르고 안전하게 출근하세요
        </p>
      </div>

      {/* WebAuthn 지원 확인 */}
      {!window.PublicKeyCredential && (
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            이 브라우저는 생체 인증을 지원하지 않습니다. Chrome, Safari 등 최신 브라우저를 사용해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 등록 안내 */}
      {(!credentials || credentials.length === 0) && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              생체 인증을 등록하세요
            </CardTitle>
            <CardDescription className="text-indigo-700">
              생체 인증을 등록하면 PIN 입력 없이 빠르게 출근할 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* 등록 버튼 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            onClick={handleRegister}
            disabled={isRegistering || registerMutation.isPending || !window.PublicKeyCredential}
            className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700"
            size="lg"
          >
            <Fingerprint className="h-6 w-6 mr-2" />
            {isRegistering || registerMutation.isPending ? "등록 중..." : "새 생체 인증 등록"}
          </Button>
        </CardContent>
      </Card>

      {/* 등록된 기기 목록 */}
      {credentials && credentials.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            등록된 기기 ({credentials.length}개)
          </h2>

          <div className="space-y-3">
            {credentials.map((credential: any) => (
              <Card key={credential.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Smartphone className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {credential.deviceName || "Unknown Device"}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          등록일: {new Date(credential.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                        {credential.lastUsedAt && (
                          <div className="text-sm text-gray-500">
                            마지막 사용: {new Date(credential.lastUsedAt).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">활성화됨</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(credential.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 안내사항 */}
      <Card className="mt-6 bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-700">안내사항</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• 생체 인증은 기기에 저장된 지문 또는 얼굴 정보를 사용합니다.</p>
          <p>• 서버에는 공개키만 저장되며, 생체 정보는 전송되지 않습니다.</p>
          <p>• 여러 기기를 등록할 수 있습니다.</p>
          <p>• 기기를 분실한 경우 즉시 삭제해주세요.</p>
        </CardContent>
      </Card>
    </div>
  );
}
