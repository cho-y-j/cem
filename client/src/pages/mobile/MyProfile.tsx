import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  KeyRound,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Truck,
} from "lucide-react";

/**
 * Worker용 모바일 내정보 페이지
 * - 개인정보 수정 (이메일, 비밀번호, 핀번호)
 * - 서류 업로드 (필수 서류 매칭)
 */
export default function MyProfile() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinCode, setPinCode] = useState("");

  // Worker 정보 조회
  const { data: workerInfo } = trpc.mobile.worker.getWorkerInfo.useQuery();

  // 필수 서류 조회 (Worker 타입별)
  const { data: requiredWorkerDocs } = trpc.workerDocs.listByWorkerType.useQuery(
    { workerTypeId: workerInfo?.workerTypeId || "" },
    { enabled: !!workerInfo?.workerTypeId }
  );

  // 디버깅
  console.log('[MyProfile] Worker Info:', workerInfo);
  console.log('[MyProfile] Required Worker Docs:', requiredWorkerDocs);

  // 배정된 장비 정보 및 필수 서류 조회
  const { data: assignedEquipment } = trpc.mobile.worker.getAssignedEquipment.useQuery();
  const { data: requiredEquipmentDocs } = trpc.typeDocs.listByEquipType.useQuery(
    { equipTypeId: assignedEquipment?.equipTypeId || "" },
    { enabled: !!assignedEquipment?.equipTypeId }
  );

  // 내가 업로드한 서류 조회
  const { data: myWorkerDocs } = trpc.docsCompliance.listByTarget.useQuery(
    { targetType: "worker", targetId: workerInfo?.id || "" },
    { enabled: !!workerInfo?.id }
  );

  const { data: myEquipmentDocs } = trpc.docsCompliance.listByTarget.useQuery(
    { targetType: "equipment", targetId: assignedEquipment?.id || "" },
    { enabled: !!assignedEquipment?.id }
  );

  // Mutations
  const updateEmailMutation = trpc.users.updateEmail.useMutation({
    onSuccess: () => {
      toast.success("이메일이 변경되었습니다");
    },
    onError: (error) => {
      toast.error(error.message || "이메일 변경에 실패했습니다");
    },
  });

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

  const handleEmailUpdate = () => {
    if (!email) {
      toast.error("이메일을 입력하세요");
      return;
    }
    updateEmailMutation.mutate({ email });
  };

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

  const handleFileUpload = async (file: File, docTypeId: string, targetType: "worker" | "equipment") => {
    // TODO: 실제 파일 업로드 구현
    toast.success("서류가 업로드되었습니다 (개발 중)");
  };

  return (
    <MobileLayout title="내 정보">
      <div className="p-4 space-y-4">
        {/* 사용자 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">사용자 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">이름</span>
              <span className="font-medium">{user?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">회사</span>
              <span className="font-medium">{user?.companyName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">면허번호</span>
              <span className="font-medium">{workerInfo?.licenseNum || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* 이메일 변경 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              이메일 변경
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">새 이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <Button
              onClick={handleEmailUpdate}
              disabled={updateEmailMutation.isPending}
              className="w-full h-11"
            >
              {updateEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  변경 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  이메일 변경
                </>
              )}
            </Button>
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

        {/* 인력 필수 서류 */}
        {requiredWorkerDocs && requiredWorkerDocs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                인력 서류
              </CardTitle>
              <CardDescription className="text-xs">
                필수 제출 서류를 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {requiredWorkerDocs.map((doc) => {
                const uploaded = myWorkerDocs?.find(
                  (d) => d.docTypeId === doc.id
                );
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {doc.docName}
                        {doc.isMandatory && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      {uploaded && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          업로드 완료
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={uploaded ? "outline" : "default"}
                      className="ml-2"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf,.jpg,.jpeg,.png";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            handleFileUpload(file, doc.id, "worker");
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {uploaded ? "재업로드" : "업로드"}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* 장비 필수 서류 (배정된 장비가 있는 경우) */}
        {assignedEquipment && requiredEquipmentDocs && requiredEquipmentDocs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                장비 서류
              </CardTitle>
              <CardDescription className="text-xs">
                {assignedEquipment.regNum} - 필수 제출 서류
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {requiredEquipmentDocs.map((doc) => {
                const uploaded = myEquipmentDocs?.find(
                  (d) => d.docTypeId === doc.id
                );
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {doc.docName}
                        {doc.isMandatory && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      {uploaded && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3" />
                          업로드 완료
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={uploaded ? "outline" : "default"}
                      className="ml-2"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf,.jpg,.jpeg,.png";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            handleFileUpload(file, doc.id, "equipment");
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {uploaded ? "재업로드" : "업로드"}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* 안내 메시지 */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">서류 업로드 안내</p>
            <ul className="space-y-1 text-xs text-blue-700">
              <li>• 파일 형식: PDF, JPG, PNG</li>
              <li>• 최대 파일 크기: 10MB</li>
              <li>• 필수(*) 서류는 반드시 제출해야 합니다</li>
              <li>• 업로드한 서류는 관리자가 확인 후 승인합니다</li>
            </ul>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

