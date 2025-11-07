/**
 * EP: 반입 요청 최종 승인 페이지
 * - 요청 상세 확인
 * - 작업계획서 확인
 * - 최종 승인 또는 반려
 */

import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Download, FileText } from "lucide-react";
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

  // 요청 상세 조회 (V2 - 장비/인력 정보 포함)
  const { data: request, isLoading } = trpc.entryRequestsV2.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

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

  const handleApprove = () => {
    approveMutation.mutate({
      id: id!,
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

