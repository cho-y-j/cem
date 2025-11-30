import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Fingerprint, Trash2, Smartphone, AlertCircle, CheckCircle2, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { startRegistration } from '@simplewebauthn/browser';
import { Capacitor } from "@capacitor/core";
import { isNativeApp, isBiometricAvailable as checkBiometricAvailable } from "@/utils/biometricAuth";

/**
 * 모바일 생체 인증 설정 페이지
 * - 네이티브 앱: 기기 설정 안내 (WebAuthn 미지원)
 * - 웹 브라우저: WebAuthn 등록/관리
 */
export default function BiometricSetup() {
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [nativeBiometricStatus, setNativeBiometricStatus] = useState<{
    available: boolean;
    biometryType: string;
    errorMessage?: string;
  } | null>(null);
  const utils = trpc.useUtils();

  // 네이티브 앱 여부 및 생체인식 상태 확인
  useEffect(() => {
    const checkEnvironment = async () => {
      const native = isNativeApp();
      setIsNative(native);

      if (native) {
        const status = await checkBiometricAvailable();
        setNativeBiometricStatus(status);
      }
    };

    checkEnvironment();
  }, []);

  // 등록된 크레덴셜 목록 조회 (웹 전용)
  const { data: credentials, isLoading, refetch } = trpc.webauthn.myCredentials.useQuery(undefined, {
    enabled: !isNative, // 네이티브 앱에서는 쿼리하지 않음
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // 등록 뮤테이션 (웹 전용)
  const registerMutation = trpc.webauthn.registerCredential.useMutation({
    onSuccess: () => {
      toast.success("생체 인증이 등록되었습니다!");
      setTimeout(() => {
        refetch();
      }, 500);
    },
    onError: (error) => {
      toast.error(`등록 실패: ${error.message}`);
    },
  });

  // 삭제 뮤테이션 (웹 전용)
  const deleteMutation = trpc.webauthn.deleteCredential.useMutation({
    onSuccess: () => {
      toast.success("생체 인증이 삭제되었습니다.");
      refetch();
    },
    onError: (error) => {
      toast.error(`삭제 실패: ${error.message}`);
    },
  });

  // 생체 인증 등록 핸들러 (웹 전용)
  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const options = await utils.webauthn.generateRegistrationChallenge.fetch();
      toast.info("생체 인증을 진행해주세요 (지문 또는 얼굴 인식)");
      const registrationResponse = await startRegistration(options);

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

  // 크레덴셜 삭제 핸들러 (웹 전용)
  const handleDelete = async (credentialId: string) => {
    if (!confirm("이 생체 인증을 삭제하시겠습니까?")) {
      return;
    }
    await deleteMutation.mutateAsync({ credentialId });
  };

  // 네이티브 앱 UI
  if (isNative) {
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

        {/* 네이티브 앱 생체인식 상태 */}
        {nativeBiometricStatus ? (
          nativeBiometricStatus.available ? (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  생체 인증 사용 가능
                </CardTitle>
                <CardDescription className="text-green-700">
                  {nativeBiometricStatus.biometryType === 'fingerprint' && '지문 인식이 설정되어 있습니다.'}
                  {nativeBiometricStatus.biometryType === 'face' && '얼굴 인식이 설정되어 있습니다.'}
                  {nativeBiometricStatus.biometryType === 'iris' && '홍채 인식이 설정되어 있습니다.'}
                  {nativeBiometricStatus.biometryType === 'none' && '생체 인식이 설정되어 있습니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-800">
                  출근 화면에서 "생체 인증으로 출근" 버튼을 눌러 사용하세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  생체 인증 설정 필요
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  {nativeBiometricStatus.errorMessage || '기기에 생체 인식이 등록되어 있지 않습니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-800 mb-4">
                  아래 안내에 따라 기기 설정에서 지문 또는 얼굴을 등록해주세요.
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* 기기 설정 안내 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              기기 설정에서 등록하기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Android</h3>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>설정 앱을 엽니다</li>
                <li>보안 또는 생체 인식 및 보안을 선택합니다</li>
                <li>지문 또는 얼굴 인식을 선택합니다</li>
                <li>화면 잠금 설정 후 생체 정보를 등록합니다</li>
              </ol>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">iPhone / iPad</h3>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>설정 앱을 엽니다</li>
                <li>Face ID 및 암호 또는 Touch ID 및 암호를 선택합니다</li>
                <li>Face ID 설정 또는 지문 추가를 선택합니다</li>
                <li>화면 안내에 따라 등록합니다</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* 재확인 버튼 */}
        <Button
          onClick={async () => {
            const status = await checkBiometricAvailable();
            setNativeBiometricStatus(status);
            if (status.available) {
              toast.success("생체 인증이 활성화되었습니다!");
            } else {
              toast.info("아직 생체 인증이 설정되지 않았습니다.");
            }
          }}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700"
        >
          <Fingerprint className="h-5 w-5 mr-2" />
          생체 인증 상태 다시 확인
        </Button>

        {/* 안내사항 */}
        <Card className="mt-6 bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">안내사항</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• 앱에서는 기기에 등록된 생체 인식을 사용합니다.</p>
            <p>• 생체 정보는 기기에만 저장되며 서버로 전송되지 않습니다.</p>
            <p>• 보안을 위해 화면 잠금 설정이 필요합니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 웹 브라우저 UI (기존 WebAuthn)
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
            {isRegistering || registerMutation.isPending
              ? "등록 중..."
              : credentials && credentials.length > 0
                ? "추가 생체 인증 등록"
                : "새 생체 인증 등록"}
          </Button>
          {credentials && credentials.length > 0 && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              ✓ {credentials.length}개의 생체 인증이 등록되어 있습니다
            </p>
          )}
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
