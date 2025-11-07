import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";

interface EntryRequestApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestNumber: string;
  approvalType: "owner" | "bp" | "ep" | "reject";
  onSuccess?: () => void;
}

export default function EntryRequestApprovalDialog({
  open,
  onOpenChange,
  requestId,
  requestNumber,
  approvalType,
  onSuccess,
}: EntryRequestApprovalDialogProps) {

  const [comment, setComment] = useState("");
  const [workPlanFileUrl, setWorkPlanFileUrl] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [targetEpCompanyId, setTargetEpCompanyId] = useState("");
  const [workPlanFile, setWorkPlanFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const utils = trpc.useUtils();

  // EP 회사 목록 조회 (BP 승인 시에만)
  const { data: companies } = trpc.companies.list.useQuery(
    { companyType: 'ep' },
    { enabled: approvalType === 'bp' && open }
  );
  const epCompanies = companies || [];

  const ownerApproveMutation = trpc.entryRequests.ownerApprove.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 승인되었습니다.");
      utils.entryRequests.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setComment("");
      setWorkPlanFileUrl("");
    },
    onError: (error) => {
      toast.error("승인 실패: " + error.message);
    },
  });

  const bpApproveMutation = trpc.entryRequests.bpApprove.useMutation({
    onSuccess: () => {
      toast.success("BP 승인이 완료되고 EP에 전달되었습니다.");
      utils.entryRequests.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setComment("");
      setWorkPlanFileUrl("");
      setTargetEpCompanyId("");
      setWorkPlanFile(null);
    },
    onError: (error) => {
      toast.error("BP 승인 실패: " + error.message);
    },
  });

  const epApproveMutation = trpc.entryRequests.epApprove.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 최종 승인되었습니다.");
      utils.entryRequests.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setComment("");
    },
    onError: (error) => {
      toast.error("승인 실패: " + error.message);
    },
  });

  const rejectMutation = trpc.entryRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 반려되었습니다.");
      utils.entryRequests.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("반려 실패: " + error.message);
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleOwnerApprove = () => {
    if (!workPlanFileUrl.trim()) {
      toast.error("작업계획서 URL을 입력해주세요.");
      return;
    }

    ownerApproveMutation.mutate({
      id: requestId,
      workPlanFileUrl: workPlanFileUrl.trim(),
      comment: comment.trim() || undefined,
    });
  };

  const handleBpApprove = async () => {
    if (!targetEpCompanyId) {
      toast.error("EP 회사를 선택해주세요.");
      return;
    }

    if (!workPlanFile) {
      toast.error("작업계획서 파일을 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      const base64Data = await fileToBase64(workPlanFile);

      bpApproveMutation.mutate({
        id: requestId,
        targetEpCompanyId,
        workPlanFile: {
          name: workPlanFile.name,
          type: workPlanFile.type,
          data: base64Data,
        },
        comment: comment.trim() || undefined,
      });
    } catch (error) {
      toast.error("파일 변환 실패. 다시 시도해주세요.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEpApprove = () => {
    epApproveMutation.mutate({
      id: requestId,
      comment: comment.trim() || undefined,
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    rejectMutation.mutate({
      id: requestId,
      reason: rejectReason.trim(),
    });
  };

  const isLoading = ownerApproveMutation.isPending || bpApproveMutation.isPending || epApproveMutation.isPending || rejectMutation.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {approvalType === "reject" ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                반입 요청 반려
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                {approvalType === "owner" ? "Owner 승인" : approvalType === "bp" ? "BP 승인" : "EP 최종 승인"}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            반입 요청 번호: <span className="font-semibold">{requestNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {approvalType === "owner" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="workPlanFileUrl">
                  작업계획서 URL <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="workPlanFileUrl"
                    placeholder="https://example.com/work-plan.pdf"
                    value={workPlanFileUrl}
                    onChange={(e) => setWorkPlanFileUrl(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button variant="outline" size="icon" disabled={isLoading}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  작업계획서 파일을 업로드하고 URL을 입력해주세요.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">코멘트 (선택사항)</Label>
                <Textarea
                  id="comment"
                  placeholder="승인 관련 코멘트를 입력하세요..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {approvalType === "bp" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="targetEpCompanyId">
                  EP 회사 선택 <span className="text-red-500">*</span>
                </Label>
                <Select value={targetEpCompanyId} onValueChange={setTargetEpCompanyId} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="EP 회사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {epCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workPlanFile">
                  작업계획서 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="workPlanFile"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setWorkPlanFile(e.target.files?.[0] || null)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  {workPlanFile && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      {workPlanFile.name}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  작업계획서 파일을 첨부해주세요. (PDF, DOC, DOCX)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">코멘트 (선택사항)</Label>
                <Textarea
                  id="comment"
                  placeholder="승인 관련 코멘트를 입력하세요..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {approvalType === "ep" && (
            <div className="space-y-2">
              <Label htmlFor="comment">코멘트 (선택사항)</Label>
              <Textarea
                id="comment"
                placeholder="최종 승인 관련 코멘트를 입력하세요..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          {approvalType === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejectReason">
                반려 사유 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectReason"
                placeholder="반려 사유를 상세히 입력해주세요..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                반려 사유는 요청자에게 전달됩니다.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          {approvalType === "owner" && (
            <Button
              onClick={handleOwnerApprove}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인
                </>
              )}
            </Button>
          )}
          {approvalType === "bp" && (
            <Button
              onClick={handleBpApprove}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "파일 업로드 중..." : "처리 중..."}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인 및 EP에 전달
                </>
              )}
            </Button>
          )}
          {approvalType === "ep" && (
            <Button
              onClick={handleEpApprove}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  최종 승인
                </>
              )}
            </Button>
          )}
          {approvalType === "reject" && (
            <Button
              onClick={handleReject}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  반려
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

