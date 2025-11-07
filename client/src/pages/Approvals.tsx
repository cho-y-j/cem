import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Download, Loader2, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/DocumentUpload";

export default function Approvals() {
  const { user } = useAuth();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [workOrderUrl, setWorkOrderUrl] = useState("");

  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.docsCompliance.list.useQuery();

  const adminApproveMutation = trpc.docsCompliance.adminApprove.useMutation({
    onSuccess: () => {
      toast.success("승인되었습니다.");
      utils.docsCompliance.list.invalidate();
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const bpApproveMutation = trpc.docsCompliance.bpApprove.useMutation({
    onSuccess: () => {
      toast.success("승인되었습니다.");
      utils.docsCompliance.list.invalidate();
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const epApproveMutation = trpc.docsCompliance.epApprove.useMutation({
    onSuccess: () => {
      toast.success("최종 승인되었습니다.");
      utils.docsCompliance.list.invalidate();
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const rejectMutation = trpc.docsCompliance.reject.useMutation({
    onSuccess: () => {
      toast.success("반려되었습니다.");
      utils.docsCompliance.list.invalidate();
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error) => toast.error("반려 실패: " + error.message),
  });

  const attachWorkOrderMutation = trpc.docsCompliance.attachWorkOrder.useMutation({
    onSuccess: () => {
      toast.success("작업지시서가 첨부되었습니다.");
      utils.docsCompliance.list.invalidate();
      setWorkOrderDialogOpen(false);
      setWorkOrderUrl("");
    },
    onError: (error) => toast.error("첨부 실패: " + error.message),
  });

  const handleApprove = (doc: any) => {
    if (user?.role === "admin" && doc.workflowStage === "bp_upload") {
      adminApproveMutation.mutate({ id: doc.id });
    } else if (user?.role === "bp" && doc.workflowStage === "admin_approved") {
      bpApproveMutation.mutate({ id: doc.id });
    } else if (user?.role === "ep" && doc.workflowStage === "bp_approved") {
      epApproveMutation.mutate({ id: doc.id });
    }
  };

  const handleReject = () => {
    if (!selectedDoc || !rejectReason.trim()) {
      toast.error("반려 사유를 입력하세요.");
      return;
    }
    rejectMutation.mutate({ id: selectedDoc.id, reason: rejectReason });
  };

  const handleAttachWorkOrder = () => {
    if (!selectedDoc || !workOrderUrl) {
      toast.error("작업지시서를 업로드하세요.");
      return;
    }
    attachWorkOrderMutation.mutate({ id: selectedDoc.id, workOrderFileUrl: workOrderUrl });
  };

  const getWorkflowBadge = (doc: any) => {
    const stage = doc.workflowStage || "bp_upload";
    
    if (stage === "bp_upload") {
      return <Badge variant="secondary">관리자 승인 대기</Badge>;
    } else if (stage === "admin_approved") {
      return <Badge variant="default" className="bg-blue-100 text-blue-700">협력사 승인 대기</Badge>;
    } else if (stage === "bp_approved") {
      return <Badge variant="default" className="bg-purple-100 text-purple-700">시행사 승인 대기</Badge>;
    } else if (stage === "ep_approved") {
      return <Badge variant="default" className="bg-green-100 text-green-700">최종 승인</Badge>;
    } else if (stage === "rejected") {
      return <Badge variant="destructive">반려</Badge>;
    }
    return <Badge variant="secondary">{stage}</Badge>;
  };

  const canApprove = (doc: any) => {
    if (user?.role === "admin" && doc.workflowStage === "bp_upload") return true;
    if (user?.role === "bp" && doc.workflowStage === "admin_approved") return true;
    if (user?.role === "ep" && doc.workflowStage === "bp_approved") return true;
    return false;
  };

  const needsWorkOrder = (doc: any) => {
    return user?.role === "bp" && doc.workflowStage === "admin_approved" && !doc.workOrderFileUrl;
  };

  const myPendingDocs = documents?.filter((doc) => canApprove(doc)) || [];
  const allPendingDocs = documents?.filter((doc) => doc.workflowStage !== "ep_approved" && doc.workflowStage !== "rejected") || [];
  const approvedDocs = documents?.filter((doc) => doc.workflowStage === "ep_approved") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">승인 관리</h1>
        <p className="text-muted-foreground">서류 승인 워크플로우를 관리합니다.</p>
      </div>

      <Tabs defaultValue="my" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my">내 승인 대기 ({myPendingDocs.length})</TabsTrigger>
          <TabsTrigger value="all">전체 진행중</TabsTrigger>
          <TabsTrigger value="approved">승인 완료</TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          <Card>
            <CardHeader>
              <CardTitle>내가 승인할 서류</CardTitle>
              <CardDescription>
                {user?.role === "admin" && "관리자 승인이 필요한 서류입니다."}
                {user?.role === "bp" && "협력사 승인이 필요한 서류입니다."}
                {user?.role === "ep" && "시행사 최종 승인이 필요한 서류입니다."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로딩 중...
                </div>
              ) : myPendingDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>서류 유형</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>파일명</TableHead>
                      <TableHead>업로드일</TableHead>
                      <TableHead>워크플로우</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPendingDocs.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.docType}</TableCell>
                        <TableCell>{doc.targetType === "equipment" ? "장비" : "인력"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{doc.fileName || "-"}</TableCell>
                        <TableCell>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("ko-KR") : "-"}
                        </TableCell>
                        <TableCell>{getWorkflowBadge(doc)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            {needsWorkOrder(doc) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setWorkOrderDialogOpen(true);
                                }}
                              >
                                <Upload className="mr-1 h-3 w-3" />
                                작업지시서
                              </Button>
                            )}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(doc)}
                              disabled={needsWorkOrder(doc)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              승인
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              반려
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">승인 대기 중인 서류가 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>전체 진행 중인 서류</CardTitle>
            </CardHeader>
            <CardContent>
              {allPendingDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>서류 유형</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>업로드일</TableHead>
                      <TableHead>워크플로우</TableHead>
                      <TableHead className="text-right">파일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPendingDocs.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.docType}</TableCell>
                        <TableCell>{doc.targetType === "equipment" ? "장비" : "인력"}</TableCell>
                        <TableCell>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("ko-KR") : "-"}
                        </TableCell>
                        <TableCell>{getWorkflowBadge(doc)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">진행 중인 서류가 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>승인 완료 서류</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>서류 유형</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>최종 승인일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">파일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedDocs.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.docType}</TableCell>
                        <TableCell>{doc.targetType === "equipment" ? "장비" : "인력"}</TableCell>
                        <TableCell>
                          {doc.epApprovedAt ? new Date(doc.epApprovedAt).toLocaleDateString("ko-KR") : "-"}
                        </TableCell>
                        <TableCell>{getWorkflowBadge(doc)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">승인 완료된 서류가 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 반려 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>서류 반려</DialogTitle>
            <DialogDescription>반려 사유를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>반려 사유 *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 상세히 입력하세요."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "반려"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작업지시서 첨부 다이얼로그 */}
      <Dialog open={workOrderDialogOpen} onOpenChange={setWorkOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작업지시서 첨부</DialogTitle>
            <DialogDescription>승인 전에 작업지시서를 첨부해야 합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DocumentUpload
              onUploadComplete={(url) => setWorkOrderUrl(url)}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkOrderDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAttachWorkOrder} disabled={attachWorkOrderMutation.isPending}>
              {attachWorkOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "첨부"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
