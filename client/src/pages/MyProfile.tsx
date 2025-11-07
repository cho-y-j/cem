import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  UserCircle,
  Mail,
  Lock,
  KeyRound,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Truck,
} from "lucide-react";

/**
 * Worker용 내정보 페이지
 * - 개인정보 수정 (이메일, 비밀번호, 핀번호)
 * - 서류 업로드 (인력 서류, 장비 서류)
 */
export default function MyProfile() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pinCode, setPinCode] = useState("");

  // Worker 정보 조회 (Worker 역할인 경우만)
  const { data: workerInfo } = trpc.mobile.worker.getWorkerInfo.useQuery(
    undefined,
    { enabled: user?.role?.toLowerCase() === "worker" }
  );

  // 필수 서류 조회 (Worker 타입별)
  const { data: requiredWorkerDocs } = trpc.workerDocs.listByWorkerType.useQuery(
    { workerTypeId: workerInfo?.workerTypeId || "" },
    { enabled: !!workerInfo?.workerTypeId }
  );

  // 배정된 장비 정보 및 필수 서류 조회
  const { data: assignedEquipment } = trpc.mobile.worker.getAssignedEquipment.useQuery(
    undefined,
    { enabled: user?.role?.toLowerCase() === "worker" }
  );
  
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
    toast.success(`서류가 업로드되었습니다 (개발 중)`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCircle className="h-8 w-8" />
          내정보
        </h1>
        <p className="text-muted-foreground mt-2">
          개인정보를 관리하고 필요한 서류를 업로드하세요
        </p>
      </div>

      {/* 사용자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 정보</CardTitle>
          <CardDescription>
            현재 로그인된 계정 정보입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">이름</Label>
              <p className="font-medium">{user?.name || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">역할</Label>
              <p className="font-medium">{user?.role || "-"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">회사</Label>
              <p className="font-medium">{user?.companyName || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 이메일 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            이메일 변경
          </CardTitle>
          <CardDescription>
            로그인에 사용할 이메일 주소를 변경할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">새 이메일 주소</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            onClick={handleEmailUpdate}
            disabled={updateEmailMutation.isPending}
            className="w-full sm:w-auto"
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            비밀번호 변경
          </CardTitle>
          <CardDescription>
            보안을 위해 주기적으로 비밀번호를 변경하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="최소 6자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handlePasswordUpdate}
            disabled={updatePasswordMutation.isPending}
            className="w-full sm:w-auto"
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            PIN 번호 변경
          </CardTitle>
          <CardDescription>
            모바일 앱에서 사용할 4자리 PIN 번호를 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pinCode">새 PIN 번호 (4자리 숫자)</Label>
            <Input
              id="pinCode"
              type="password"
              placeholder="1234"
              maxLength={4}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            onClick={handlePinUpdate}
            disabled={updatePinMutation.isPending}
            className="w-full sm:w-auto"
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

      <Separator />

      {/* 인력 필수 서류 (Worker 역할인 경우만) */}
      {user?.role?.toLowerCase() === "worker" && requiredWorkerDocs && requiredWorkerDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              인력 필수 서류
            </CardTitle>
            <CardDescription>
              Admin이 정의한 필수 제출 서류를 업로드하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requiredWorkerDocs.map((doc) => {
              const uploaded = myWorkerDocs?.find((d) => d.docTypeId === doc.id);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {doc.docName}
                        {doc.isMandatory && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      {doc.hasExpiry && (
                        <span className="text-xs text-muted-foreground">(유효기간 있음)</span>
                      )}
                    </div>
                    {uploaded && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        업로드 완료
                        {uploaded.expiryDate && (
                          <span className="text-xs text-muted-foreground ml-2">
                            만료: {new Date(uploaded.expiryDate).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={uploaded ? "outline" : "default"}
                    className="ml-4"
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
                    <Upload className="mr-2 h-4 w-4" />
                    {uploaded ? "재업로드" : "업로드"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 장비 필수 서류 (배정된 장비가 있는 경우) */}
      {user?.role?.toLowerCase() === "worker" && assignedEquipment && requiredEquipmentDocs && requiredEquipmentDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              장비 필수 서류
            </CardTitle>
            <CardDescription>
              {assignedEquipment.regNum} - Admin이 정의한 필수 제출 서류
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requiredEquipmentDocs.map((doc) => {
              const uploaded = myEquipmentDocs?.find((d) => d.docTypeId === doc.id);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {doc.docName}
                        {doc.isMandatory && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      {doc.hasExpiry && (
                        <span className="text-xs text-muted-foreground">(유효기간 있음)</span>
                      )}
                    </div>
                    {uploaded && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        업로드 완료
                        {uploaded.expiryDate && (
                          <span className="text-xs text-muted-foreground ml-2">
                            만료: {new Date(uploaded.expiryDate).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={uploaded ? "outline" : "default"}
                    className="ml-4"
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
                    <Upload className="mr-2 h-4 w-4" />
                    {uploaded ? "재업로드" : "업로드"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* 안내 메시지 */}
      {user?.role?.toLowerCase() === "worker" && (
        <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">서류 업로드 안내</p>
            <ul className="space-y-1 text-blue-700">
              <li>• 파일 형식: PDF, JPG, PNG</li>
              <li>• 최대 파일 크기: 10MB</li>
              <li>• 필수(*) 서류는 반드시 제출해야 합니다</li>
              <li>• 업로드한 서류는 관리자가 확인 후 승인합니다</li>
              <li>• 유효기간이 있는 서류는 만료 전에 재업로드해주세요</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

