/**
 * BP: 반입 요청 승인 페이지
 * - 요청 상세 확인
 * - 작업계획서 업로드
 * - EP 회사 선택
 * - 승인 또는 반려
 */

import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";
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

export default function EntryRequestBpApprove() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const [targetEpCompanyId, setTargetEpCompanyId] = useState("");
  const [workPlanUrl, setWorkPlanUrl] = useState("");
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // 요청 상세 조회 (V2 - 장비/인력 정보 포함)
  const { data: request, isLoading } = trpc.entryRequestsV2.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  // EP 회사 목록 조회
  const { data: epCompanies } = trpc.companies.listByType.useQuery({
    companyType: 'ep'
  });

  // 승인 mutation
  const approveMutation = trpc.entryRequestsV2.bpApprove.useMutation({
    onSuccess: () => {
      toast.success("승인되었습니다. EP 회사에 전달되었습니다.");
      setLocation('/entry-requests');
    },
    onError: (error) => {
      toast.error(error.message || "승인 처리에 실패했습니다.");
    },
  });

  // 반려 mutation
  const rejectMutation = trpc.entryRequestsV2.bpReject.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 반려되었습니다.");
      setLocation('/entry-requests');
    },
    onError: (error) => {
      toast.error(error.message || "반려 처리에 실패했습니다.");
    },
  });

  const handleApprove = () => {
    if (!targetEpCompanyId) {
      toast.error("EP 회사를 선택해주세요.");
      return;
    }

    if (!workPlanUrl.trim()) {
      toast.error("작업계획서를 업로드해주세요.");
      return;
    }

    approveMutation.mutate({
      id: id!,
      targetEpCompanyId,
      workPlanUrl,
      comment,
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">반입 요청 승인</h1>
        <p className="text-muted-foreground mt-2">
          요청 번호: {request.request_number}
        </p>
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
                <Label className="text-muted-foreground">요청 회사</Label>
                <p className="font-medium">{request.owner_company?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">요청자</Label>
                <p className="font-medium">{request.owner_user?.name}</p>
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
                    <span className="text-sm text-muted-foreground">
                      {item.requestType === 'equipment_with_worker' && '장비 + 운전자'}
                      {item.requestType === 'equipment_only' && '장비만'}
                      {item.requestType === 'worker_only' && '인력만'}
                    </span>
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

        {/* 승인 처리 */}
        <Card>
          <CardHeader>
            <CardTitle>승인 처리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* EP 회사 선택 */}
            <div>
              <Label htmlFor="ep-company">시행사 (EP) 선택 *</Label>
              <Select value={targetEpCompanyId} onValueChange={setTargetEpCompanyId}>
                <SelectTrigger id="ep-company" className="mt-2">
                  <SelectValue placeholder="EP 회사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {epCompanies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 작업계획서 업로드 */}
            <div>
              <Label htmlFor="work-plan">작업계획서 업로드 *</Label>
              <div className="mt-2 space-y-2">
                <Input
                  id="work-plan"
                  type="url"
                  value={workPlanUrl}
                  onChange={(e) => setWorkPlanUrl(e.target.value)}
                  placeholder="작업계획서 URL을 입력하세요"
                />
                <p className="text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 inline mr-1" />
                  작업계획서를 먼저 업로드하고 URL을 입력해주세요.
                </p>
              </div>
            </div>

            {/* 코멘트 */}
            <div>
              <Label htmlFor="comment">코멘트 (선택)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="추가 의견을 입력하세요"
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
            className="flex-1"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                승인 및 EP에 전달
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

