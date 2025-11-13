/**
 * EP: 반입 요청 최종 승인 페이지
 * - 요청 상세 확인
 * - 작업계획서 확인
 * - 최종 승인 또는 반려
 */

import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Download, FileText, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function EntryRequestEpApprove() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  
  // 반입 검사/안전교육/건강검진 정보 (전체 요청에 대해)
  const [entryInspectionCompleted, setEntryInspectionCompleted] = useState(false);
  const [entryInspectionFile, setEntryInspectionFile] = useState<File | null>(null);
  const [safetyTrainingCompleted, setSafetyTrainingCompleted] = useState(false);
  const [safetyTrainingFile, setSafetyTrainingFile] = useState<File | null>(null);
  const [healthCheckCompleted, setHealthCheckCompleted] = useState(false);
  const [healthCheckFile, setHealthCheckFile] = useState<File | null>(null);
  
  // 파일을 base64로 변환하는 헬퍼 함수
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // 요청 상세 조회 (V2 - 장비/인력 정보 포함)
  const { data: request, isLoading } = trpc.entryRequestsV2.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  // 이미 완료된 검사/교육 정보가 있으면 초기 상태 설정
  useEffect(() => {
    if (request) {
      if (request.entry_inspection_completed_at) {
        setEntryInspectionCompleted(true);
      }
      if (request.safety_training_completed_at) {
        setSafetyTrainingCompleted(true);
      }
      if (request.health_check_completed_at) {
        setHealthCheckCompleted(true);
      }
    }
  }, [request]);

  // 승인 mutation
  const approveMutation = trpc.entryRequestsV2.epApprove.useMutation({
    onSuccess: () => {
      toast.success("최종 승인되었습니다. 반입이 허가되었습니다.");
      setLocation('/entry-requests');
    },
    onError: (error) => {
      toast.error(error.message || "승인 처리에 실패했습니다.");
    },
  });

  // 반려 mutation
  const rejectMutation = trpc.entryRequestsV2.epReject.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 반려되었습니다.");
      setLocation('/entry-requests');
    },
    onError: (error) => {
      toast.error(error.message || "반려 처리에 실패했습니다.");
    },
  });

  const handleApprove = async () => {
    // 파일을 base64로 변환
    let entryInspectionFileData: string | undefined;
    let safetyTrainingFileData: string | undefined;
    let healthCheckFileData: string | undefined;
    
    if (entryInspectionFile) {
      try {
        entryInspectionFileData = await fileToBase64(entryInspectionFile);
      } catch (error) {
        toast.error("반입 검사 확인서 업로드에 실패했습니다.");
        return;
      }
    }
    
    if (safetyTrainingFile) {
      try {
        safetyTrainingFileData = await fileToBase64(safetyTrainingFile);
      } catch (error) {
        toast.error("안전교육 서류 업로드에 실패했습니다.");
        return;
      }
    }
    
    if (healthCheckFile) {
      try {
        healthCheckFileData = await fileToBase64(healthCheckFile);
      } catch (error) {
        toast.error("건강검진 서류 업로드에 실패했습니다.");
        return;
      }
    }
    
    approveMutation.mutate({
      id: id!,
      comment,
      entryInspectionCompleted: entryInspectionCompleted,
      entryInspectionFile: entryInspectionFileData,
      safetyTrainingCompleted: safetyTrainingCompleted,
      safetyTrainingFile: safetyTrainingFileData,
      healthCheckCompleted: healthCheckCompleted,
      healthCheckFile: healthCheckFileData,
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    rejectMutation.mutate({
      id: id!,
      reason: rejectReason,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto py-8">
        <p>반입 요청을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">최종 승인</h1>
          <p className="text-muted-foreground mt-2">
            요청 번호: {request.request_number}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          BP 승인 완료
        </Badge>
      </div>

      <div className="space-y-6">
        {/* 요청 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>요청 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">요청 회사 (Owner)</Label>
                <p className="font-medium">{request.owner_company?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">요청자</Label>
                <p className="font-medium">{request.owner_user?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">협력사 (BP)</Label>
                <p className="font-medium">{request.target_bp_company?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">BP 승인자</Label>
                <p className="font-medium">{request.bp_approved_user?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">반입 시작일</Label>
                <p className="font-medium">{request.requested_start_date}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">반입 종료일</Label>
                <p className="font-medium">{request.requested_end_date}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">반입 목적</Label>
              <p className="mt-2 whitespace-pre-wrap">{request.purpose}</p>
            </div>
            {request.bp_comment && (
              <div>
                <Label className="text-muted-foreground">BP 코멘트</Label>
                <p className="mt-2 whitespace-pre-wrap">{request.bp_comment}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 작업계획서 */}
        <Card>
          <CardHeader>
            <CardTitle>작업계획서</CardTitle>
          </CardHeader>
          <CardContent>
            {request.bp_work_plan_url ? (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium">작업계획서.pdf</p>
                    <p className="text-sm text-muted-foreground">
                      BP에서 업로드한 작업계획서
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(request.bp_work_plan_url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  다운로드/보기
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">작업계획서가 업로드되지 않았습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 장비/인력 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>장비 및 인력 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {request.items?.map((item: any, index: number) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">항목 {index + 1}</span>
                    <Badge variant="secondary">
                      {item.requestType === 'equipment_with_worker' && '장비 + 운전자'}
                      {item.requestType === 'equipment_only' && '장비만'}
                      {item.requestType === 'worker_only' && '인력만'}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {item.itemType === 'equipment' && (
                      <p className="text-sm">
                        🚜 장비: {item.itemName} ({item.equipTypeName})
                      </p>
                    )}
                    {item.itemType === 'worker' && (
                      <p className="text-sm">
                        👷 인력: {item.itemName} ({item.workerTypeName})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* EP가 수행하는 검사 및 교육 */}
        <Card>
          <CardHeader>
            <CardTitle>검사 및 교육 완료 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 반입 검사 (장비 항목이 있는 경우) */}
            {request.items?.some((item: any) => item.itemType === 'equipment') && (
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="entry-inspection"
                    checked={entryInspectionCompleted}
                    onCheckedChange={(checked) => setEntryInspectionCompleted(checked === true)}
                  />
                  <Label htmlFor="entry-inspection" className="font-semibold">
                    반입 검사 완료 (외부검사업체 직원 확인)
                  </Label>
                </div>
                {/* 이미 완료된 경우 정보 표시 */}
                {request.entry_inspection_completed_at && (
                  <div className="ml-6 mb-2 p-2 bg-green-50 rounded text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      <span>완료일: {new Date(request.entry_inspection_completed_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {request.entry_inspection_file_url && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(request.entry_inspection_file_url, '_blank')}
                        >
                          <FileText className="h-3 w-3 mr-2" />
                          반입 검사 확인서 보기
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="ml-6 space-y-2">
                  <Label htmlFor="entry-inspection-file" className="text-sm text-muted-foreground">
                    반입 검사 확인서 첨부 (선택)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="entry-inspection-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setEntryInspectionFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {entryInspectionFile && (
                      <p className="text-xs text-muted-foreground">
                        ✓ {entryInspectionFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 안전교육 및 건강검진 (인력 항목이 있는 경우) */}
            {request.items?.some((item: any) => item.itemType === 'worker') && (
              <>
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="safety-training"
                      checked={safetyTrainingCompleted}
                      onCheckedChange={(checked) => setSafetyTrainingCompleted(checked === true)}
                    />
                    <Label htmlFor="safety-training" className="font-semibold">
                      안전교육 완료
                    </Label>
                  </div>
                  {/* 이미 완료된 경우 정보 표시 */}
                  {request.safety_training_completed_at && (
                    <div className="ml-6 mb-2 p-2 bg-green-50 rounded text-sm">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span>완료일: {new Date(request.safety_training_completed_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                      {request.safety_training_file_url && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(request.safety_training_file_url, '_blank')}
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            안전교육 서류 보기
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="safety-training-file" className="text-sm text-muted-foreground">
                      안전교육 서류 첨부 (선택)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="safety-training-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setSafetyTrainingFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {safetyTrainingFile && (
                        <p className="text-xs text-muted-foreground">
                          ✓ {safetyTrainingFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="health-check"
                      checked={healthCheckCompleted}
                      onCheckedChange={(checked) => setHealthCheckCompleted(checked === true)}
                    />
                    <Label htmlFor="health-check" className="font-semibold">
                      배치전 건강검진 완료
                    </Label>
                  </div>
                  {/* 이미 완료된 경우 정보 표시 */}
                  {request.health_check_completed_at && (
                    <div className="ml-6 mb-2 p-2 bg-green-50 rounded text-sm">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span>완료일: {new Date(request.health_check_completed_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                      {request.health_check_file_url && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(request.health_check_file_url, '_blank')}
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            건강검진 서류 보기
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="health-check-file" className="text-sm text-muted-foreground">
                      건강검진 서류 첨부 (선택)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="health-check-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setHealthCheckFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {healthCheckFile && (
                        <p className="text-xs text-muted-foreground">
                          ✓ {healthCheckFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 최종 승인 처리 */}
        <Card>
          <CardHeader>
            <CardTitle>최종 승인 처리</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="comment">코멘트 (선택)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="최종 승인 의견을 입력하세요"
                className="mt-2"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 버튼 */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/entry-requests')}
            className="flex-1"
          >
            취소
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1">
                <XCircle className="h-4 w-4 mr-2" />
                반려
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>반입 요청 반려</AlertDialogTitle>
                <AlertDialogDescription>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="반려 사유를 입력하세요"
                    rows={4}
                    className="mt-4"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "처리 중..." : "반려 확정"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                최종 승인 (반입 허가)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

