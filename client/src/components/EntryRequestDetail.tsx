/**
 * 반입 요청 상세 보기 컴포넌트
 * - 요청 정보, 장비/인력 목록, 서류 미리보기
 * - Owner/EP 승인 기능
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { EnhancedPdfViewer } from "./EnhancedPdfViewer";
import {
  FileText,
  User,
  Truck,
  Calendar,
  CheckCircle,
  XCircle,
  Upload,
  Eye,
  Building2,
  Download,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface EntryRequestDetailProps {
  request: any;
  open: boolean;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  userRole?: string;
}

export function EntryRequestDetail({
  request,
  open,
  onClose,
  onApprove,
  onReject,
  userRole,
}: EntryRequestDetailProps) {
  const [workPlanFile, setWorkPlanFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // BP 승인용 state
  const [targetEpCompanyId, setTargetEpCompanyId] = useState("");
  const [bpWorkPlanFile, setBpWorkPlanFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // PDF 뷰어 상태
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewingDocuments, setViewingDocuments] = useState<any[]>([]);
  const [viewingIndex, setViewingIndex] = useState(0);

  // 상세 데이터 조회
  const { data: detailData, isLoading } = trpc.entryRequestsV2.getById.useQuery(
    { id: request?.id || '' },
    { enabled: !!request?.id && open }
  );

  // EP 회사 목록 조회 (BP 역할일 때만)
  const { data: companies } = trpc.companies.list.useQuery(
    { companyType: 'ep' },
    { enabled: userRole === "bp" && open }
  );
  const epCompanies = companies || [];

  // PDF 변환 mutation
  const convertImageMutation = trpc.pdf.convertImageToPdf.useMutation();
  const downloadPdfMutation = trpc.pdf.downloadEntryRequestPdf.useMutation();

  // BP 승인 mutation
  const utils = trpc.useUtils();
  const bpApproveMutation = trpc.entryRequestsV2.bpApprove.useMutation({
    onSuccess: () => {
      toast.success("BP 승인이 완료되고 EP에 전달되었습니다.");
      utils.entryRequestsV2.list.invalidate();
      onClose();
      // State 초기화
      setTargetEpCompanyId("");
      setBpWorkPlanFile(null);
      setComment("");
    },
    onError: (error) => {
      toast.error("BP 승인 실패: " + error.message);
    },
  });

  // BP 반려 mutation
  const bpRejectMutation = trpc.entryRequestsV2.bpReject.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 반려되었습니다.");
      utils.entryRequestsV2.list.invalidate();
      onClose();
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("반려 실패: " + error.message);
    },
  });

  // EP 최종 승인 mutation
  const epApproveMutation = trpc.entryRequestsV2.epApprove.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 최종 승인되었습니다.");
      utils.entryRequestsV2.list.invalidate();
      onClose();
      setComment("");
    },
    onError: (error) => {
      toast.error("최종 승인 실패: " + error.message);
    },
  });

  // EP 반려 mutation
  const epRejectMutation = trpc.entryRequestsV2.epReject.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 반려되었습니다.");
      utils.entryRequestsV2.list.invalidate();
      onClose();
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("반려 실패: " + error.message);
    },
  });

  if (!request) return null;

  // 상세 데이터가 있으면 사용, 없으면 기본 request 사용
  const requestData = detailData || request;

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setWorkPlanFile(e.target.files[0]);
    }
  };

  const handleBpWorkPlanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBpWorkPlanFile(e.target.files[0]);
    }
  };

  const handleApprove = () => {
    if (userRole === "owner") {
      if (!workPlanFile) {
        toast.error("작업계획서를 업로드해주세요.");
        return;
      }
      onApprove?.();
    } else if (userRole === "ep") {
      // EP 최종 승인
      epApproveMutation.mutate({
        id: requestData.id,
        comment: comment.trim() || undefined,
      });
    }
  };

  const handleBpApprove = async () => {
    if (!targetEpCompanyId) {
      toast.error("EP 회사를 선택해주세요.");
      return;
    }
    if (!bpWorkPlanFile) {
      toast.error("작업계획서 파일을 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      const base64Data = await fileToBase64(bpWorkPlanFile);

      bpApproveMutation.mutate({
        id: requestData.id,
        targetEpCompanyId,
        workPlanFile: {
          name: bpWorkPlanFile.name,
          type: bpWorkPlanFile.type,
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

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    if (userRole === "bp") {
      // BP 반려
      bpRejectMutation.mutate({
        id: requestData.id,
        reason: rejectReason.trim(),
      });
    } else if (userRole === "ep") {
      // EP 반려
      epRejectMutation.mutate({
        id: requestData.id,
        reason: rejectReason.trim(),
      });
    } else {
      // Owner는 기존 콜백 사용
      onReject?.();
    }
    setShowRejectDialog(false);
  };

  // 서류를 PDF로 변환하여 보기
  const handleViewDocument = async (fileUrl: string, docName: string, allDocs?: any[], index?: number) => {
    try {
      if (allDocs && allDocs.length > 0) {
        // 여러 서류를 한번에 보기
        const docs = allDocs.map((doc) => ({
          id: doc.id || doc.fileUrl,
          name: doc.docName || docName || "서류",
          url: doc.fileUrl || fileUrl,
        }));
        setViewingDocuments(docs);
        setViewingIndex(index || 0);
        setPdfViewerOpen(true);
        return;
      }

      // 단일 서류 보기
      setViewingDocuments([
        {
          id: "single",
          name: docName || "서류",
          url: fileUrl,
        },
      ]);
      setViewingIndex(0);
      setPdfViewerOpen(true);
    } catch (error: any) {
      console.error("[EntryRequestDetail] PDF view failed:", error);
      toast.error(error.message || "서류 보기에 실패했습니다.");
    }
  };

  // 전체 서류를 브라우저에서 보기
  const handleViewAllPdf = async () => {
    if (!requestData.id) {
      toast.error("반입 요청 ID가 없습니다.");
      return;
    }

    try {
      toast.loading("PDF 생성 중... 잠시만 기다려주세요.");

      const result = await downloadPdfMutation.mutateAsync({
        entryRequestId: requestData.id,
      });

      if (result.success && result.pdfBase64) {
        // Base64를 Blob으로 변환
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });

        // 새 탭에서 열기
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

        toast.dismiss();
        toast.success("PDF를 새 탭에서 열었습니다.");

        // 5초 후 URL 해제 (메모리 절약)
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (error: any) {
      console.error("[EntryRequestDetail] PDF view failed:", error);
      toast.dismiss();
      toast.error(error.message || "PDF 보기에 실패했습니다.");
    }
  };

  // 전체 서류를 PDF로 다운로드
  const handleDownloadAllPdf = async () => {
    if (!requestData.id) {
      toast.error("반입 요청 ID가 없습니다.");
      return;
    }

    try {
      toast.loading("PDF 생성 중... 잠시만 기다려주세요.");

      const result = await downloadPdfMutation.mutateAsync({
        entryRequestId: requestData.id,
      });

      if (result.success && result.pdfBase64) {
        // Base64를 Blob으로 변환
        const byteCharacters = atob(result.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });

        // 다운로드
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName || "반입요청서류.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.dismiss();
        toast.success("PDF 다운로드 완료!");
      }
    } catch (error: any) {
      console.error("[EntryRequestDetail] PDF download failed:", error);
      toast.dismiss();
      toast.error(error.message || "PDF 다운로드에 실패했습니다.");
    }
  };

  // 상태 배지 색상
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      owner_requested: { label: "승인 대기", variant: "secondary" },
      bp_requested: { label: "BP 요청", variant: "secondary" },
      bp_approved: { label: "BP 승인", variant: "default" },
      owner_approved: { label: "Owner 승인", variant: "default" },
      ep_approved: { label: "EP 최종 승인", variant: "default" },
      rejected: { label: "반려", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <>
      <Dialog open={open && !showRejectDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              반입 요청 상세
            </DialogTitle>
            <DialogDescription>
              요청 번호: {requestData.requestNumber || requestData.request_number || requestData.id}
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">상세 정보 로딩 중...</span>
            </div>
          )}

          <div className="space-y-6">
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">요청 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">협력업체 (BP)</div>
                      <div className="font-medium">{requestData.bpCompanyName || "정보 없음"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">요청자</div>
                      <div className="font-medium">{requestData.bpUserName || requestData.ownerName || "정보 없음"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">요청일</div>
                      <div className="font-medium">
                        {requestData.createdAt || requestData.created_at ? new Date(requestData.createdAt || requestData.created_at).toLocaleDateString() : "-"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground">상태</div>
                      <div>{getStatusBadge(requestData.status)}</div>
                    </div>
                  </div>
                </div>

                {requestData.purpose && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">투입 목적</div>
                    <div className="p-3 bg-muted rounded-md">{requestData.purpose}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {(requestData.requestedStartDate || requestData.requested_start_date) && (
                    <div>
                      <div className="text-sm text-muted-foreground">투입 예정일</div>
                      <div className="font-medium">
                        {new Date(requestData.requestedStartDate || requestData.requested_start_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {(requestData.requestedEndDate || requestData.requested_end_date) && (
                    <div>
                      <div className="text-sm text-muted-foreground">철수 예정일</div>
                      <div className="font-medium">
                        {new Date(requestData.requestedEndDate || requestData.requested_end_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* BP 작업계획서 (BP 승인 후) */}
            {(requestData.bpWorkPlanUrl || requestData.bp_work_plan_url) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">BP 작업계획서</CardTitle>
                  <CardDescription>
                    협력업체(BP)가 업로드한 작업계획서입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">작업계획서</div>
                        <div className="text-sm text-muted-foreground">
                          BP 승인 시 첨부
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(
                        requestData.bpWorkPlanUrl || requestData.bp_work_plan_url,
                        "BP 작업계획서"
                      )}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      보기
                    </Button>
                  </div>
                  {requestData.bpComment || requestData.bp_comment ? (
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground mb-1">BP 코멘트</div>
                      <div className="p-3 bg-muted rounded-md text-sm">
                        {requestData.bpComment || requestData.bp_comment}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* 장비 및 인력 목록 */}
            <Tabs defaultValue="equipment" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="equipment">
                  장비 ({requestData.items?.filter((i: any) => i.itemType === "equipment" || i.item_type === "equipment").length || 0})
                </TabsTrigger>
                <TabsTrigger value="worker">
                  인력 ({requestData.items?.filter((i: any) => i.itemType === "worker" || i.item_type === "worker").length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="equipment" className="space-y-3">
                {requestData.items?.filter((i: any) => i.itemType === "equipment" || i.item_type === "equipment").map((item: any) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Truck className="h-5 w-5 text-muted-foreground" />
                            <div className="font-semibold text-lg">
                              {item.equipmentRegNum || item.itemName || item.equipmentId}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-gray-900">
                              {item.equipTypeName || "장비 종류 없음"}
                              {item.equipTypeDescription && (
                                <span className="text-muted-foreground ml-2">({item.equipTypeDescription})</span>
                              )}
                            </div>
                            {item.specification && (
                              <div className="text-muted-foreground">규격: {item.specification}</div>
                            )}
                            {item.model && (
                              <div className="text-muted-foreground">모델: {item.model}</div>
                            )}
                            {item.manufacturer && (
                              <div className="text-muted-foreground">제조사: {item.manufacturer}</div>
                            )}
                          </div>
                        </div>
                        <DocumentStatusBadge status={item.documentStatus || "valid"} />
                      </div>

                      {/* 서류 목록 */}
                      {item.documents && item.documents.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm font-medium">서류 목록</div>
                          {item.documents.map((doc: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{doc.docName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.expiryDate && (
                                  <span className="text-xs text-muted-foreground">
                                    만료: {new Date(doc.expiryDate).toLocaleDateString()}
                                  </span>
                                )}
                                {doc.fileUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewDocument(
                                      doc.fileUrl,
                                      doc.docName || "서류",
                                      item.documents,
                                      item.documents.findIndex((d: any) => d.fileUrl === doc.fileUrl)
                                    )}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="worker" className="space-y-3">
                {requestData.items?.filter((i: any) => i.itemType === "worker" || i.item_type === "worker").map((item: any) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="font-semibold text-lg">
                              {item.workerName || item.itemName || item.workerId}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-gray-900">
                              {item.workerTypeName || "인력 유형 없음"}
                              {item.workerTypeDescription && (
                                <span className="text-muted-foreground ml-2">({item.workerTypeDescription})</span>
                              )}
                            </div>
                            {item.licenseNum && (
                              <div className="text-muted-foreground">면허번호: {item.licenseNum}</div>
                            )}
                            {item.phone && (
                              <div className="text-muted-foreground">연락처: {item.phone}</div>
                            )}
                            {item.email && (
                              <div className="text-muted-foreground">이메일: {item.email}</div>
                            )}
                          </div>
                        </div>
                        <DocumentStatusBadge status={item.documentStatus || "valid"} />
                      </div>

                      {/* 서류 목록 */}
                      {item.documents && item.documents.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm font-medium">서류 목록</div>
                          {item.documents.map((doc: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{doc.docName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.expiryDate && (
                                  <span className="text-xs text-muted-foreground">
                                    만료: {new Date(doc.expiryDate).toLocaleDateString()}
                                  </span>
                                )}
                                {doc.fileUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleViewDocument(
                                      doc.fileUrl,
                                      doc.docName || "서류",
                                      item.documents,
                                      item.documents.findIndex((d: any) => d.fileUrl === doc.fileUrl)
                                    )}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Owner 승인 (작업계획서 업로드) */}
            {userRole === "owner" && requestData.status === "bp_requested" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">작업계획서 업로드</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="workPlan">작업계획서 (필수)</Label>
                    <Input
                      id="workPlan"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    {workPlanFile && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        선택된 파일: {workPlanFile.name}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="ownerComment">코멘트 (선택)</Label>
                    <Textarea
                      id="ownerComment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="승인 코멘트를 입력하세요..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BP 승인 (작업계획서 업로드 & EP 선택) */}
            {userRole === "bp" && requestData.status === "owner_requested" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">BP 승인 및 EP 전달</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="targetEpCompanyId">
                      EP 회사 선택 <span className="text-red-500">*</span>
                    </Label>
                    <Select value={targetEpCompanyId} onValueChange={setTargetEpCompanyId}>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      서류를 검토하고 승인할 EP 회사를 선택합니다.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="bpWorkPlan">
                      작업계획서 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bpWorkPlan"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleBpWorkPlanFileChange}
                    />
                    {bpWorkPlanFile && (
                      <div className="mt-2 flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        선택된 파일: {bpWorkPlanFile.name}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      작업계획서를 첨부하여 EP에 전달합니다. (PDF, DOC, DOCX)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="bpComment">코멘트 (선택)</Label>
                    <Textarea
                      id="bpComment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="승인 관련 코멘트를 입력하세요..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* EP 최종 승인 */}
            {userRole === "ep" && requestData.status === "bp_approved" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">EP 최종 승인</CardTitle>
                  <CardDescription>모든 서류를 확인하고 최종 승인합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="epComment">코멘트 (선택)</Label>
                    <Textarea
                      id="epComment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="최종 승인 코멘트를 입력하세요..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAllPdf}
                disabled={downloadPdfMutation.isPending}
              >
                <Eye className="h-4 w-4 mr-1" />
                {downloadPdfMutation.isPending ? "생성 중..." : "전체 보기"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAllPdf}
                disabled={downloadPdfMutation.isPending}
              >
                <Download className="h-4 w-4 mr-1" />
                {downloadPdfMutation.isPending ? "생성 중..." : "다운로드"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                닫기
              </Button>

              {/* BP 승인 버튼 */}
              {userRole === "bp" && requestData.status === "owner_requested" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={bpApproveMutation.isPending || isUploading}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    반려
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBpApprove}
                    disabled={bpApproveMutation.isPending || isUploading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {bpApproveMutation.isPending || isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        {isUploading ? "업로드 중..." : "처리 중..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        승인 및 EP 전달
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Owner 승인 버튼 */}
              {userRole === "owner" && requestData.status === "bp_requested" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    반려
                  </Button>
                  <Button size="sm" onClick={handleApprove}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    승인
                  </Button>
                </>
              )}

              {/* EP 최종 승인 버튼 */}
              {userRole === "ep" && requestData.status === "bp_approved" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    반려
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    최종 승인
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 향상된 PDF 뷰어 */}
      <EnhancedPdfViewer
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documents={viewingDocuments}
        initialIndex={viewingIndex}
        title="서류 미리보기"
      />

      {/* 반려 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반입 요청 반려</DialogTitle>
            <DialogDescription>
              반려 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="rejectReason">반려 사유</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={bpRejectMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={bpRejectMutation.isPending}
            >
              {bpRejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                "반려 확정"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

