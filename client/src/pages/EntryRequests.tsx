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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, CheckCircle, XCircle, Eye, Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/DocumentUpload";

export default function EntryRequests() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [workPlanDialogOpen, setWorkPlanDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [comment, setComment] = useState("");
  const [workPlanUrl, setWorkPlanUrl] = useState("");

  const [formData, setFormData] = useState({
    equipmentId: "",
    workerId: "",
    purpose: "",
    requestedStartDate: "",
    requestedEndDate: "",
  });

  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.entryRequests.list.useQuery();
  const { data: equipment } = trpc.equipment.list.useQuery();
  const { data: workers } = trpc.workers.list.useQuery();
  const { data: documents } = trpc.docsCompliance.list.useQuery();

  const createMutation = trpc.entryRequests.create.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 등록되었습니다.");
      utils.entryRequests.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("등록 실패: " + error.message),
  });

  const ownerApproveMutation = trpc.entryRequests.ownerApprove.useMutation({
    onSuccess: () => {
      toast.success("승인되었습니다.");
      utils.entryRequests.list.invalidate();
      setApproveDialogOpen(false);
      setComment("");
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const bpApproveMutation = trpc.entryRequests.bpApprove.useMutation({
    onSuccess: () => {
      toast.success("승인되었습니다.");
      utils.entryRequests.list.invalidate();
      setWorkPlanDialogOpen(false);
      setComment("");
      setWorkPlanUrl("");
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const epApproveMutation = trpc.entryRequests.epApprove.useMutation({
    onSuccess: () => {
      toast.success("최종 승인되었습니다.");
      utils.entryRequests.list.invalidate();
      setApproveDialogOpen(false);
      setComment("");
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const rejectMutation = trpc.entryRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("반려되었습니다.");
      utils.entryRequests.list.invalidate();
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error) => toast.error("반려 실패: " + error.message),
  });

  const resetForm = () => {
    setFormData({
      equipmentId: "",
      workerId: "",
      purpose: "",
      requestedStartDate: "",
      requestedEndDate: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId || !formData.workerId) {
      toast.error("장비와 인력을 선택하세요.");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;

    if (user?.role === "owner" && selectedRequest.status === "bp_requested") {
      ownerApproveMutation.mutate({ id: selectedRequest.id, comment });
    } else if (user?.role === "ep" && selectedRequest.status === "bp_approved") {
      epApproveMutation.mutate({ id: selectedRequest.id, comment });
    }
  };

  const handleBpApprove = () => {
    if (!selectedRequest || !workPlanUrl) {
      toast.error("작업계획서를 업로드하세요.");
      return;
    }
    bpApproveMutation.mutate({
      id: selectedRequest.id,
      workPlanFileUrl: workPlanUrl,
      comment,
    });
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error("반려 사유를 입력하세요.");
      return;
    }
    rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      bp_requested: { label: "Owner 승인 대기", className: "bg-yellow-100 text-yellow-700" },
      owner_approved: { label: "BP 작업계획서 대기", className: "bg-blue-100 text-blue-700" },
      bp_approved: { label: "EP 최종 승인 대기", className: "bg-purple-100 text-purple-700" },
      ep_approved: { label: "반입 완료", className: "bg-green-100 text-green-700" },
      rejected: { label: "반려", className: "bg-red-100 text-red-700" },
    };
    const badge = badges[status] || { label: status, className: "" };
    return <Badge variant="default" className={badge.className}>{badge.label}</Badge>;
  };

  const canApprove = (req: any) => {
    if (user?.role === "owner" && req.status === "bp_requested") return true;
    if (user?.role === "bp" && req.status === "owner_approved") return true;
    if (user?.role === "ep" && req.status === "bp_approved") return true;
    return false;
  };

  const needsWorkPlan = (req: any) => {
    return user?.role === "bp" && req.status === "owner_approved";
  };

  // 장비/인력별 서류 조회
  const getDocuments = (equipmentId: string, workerId: string) => {
    const equipDocs = documents?.filter((d) => d.targetType === "equipment" && d.targetId === equipmentId) || [];
    const workerDocs = documents?.filter((d) => d.targetType === "worker" && d.targetId === workerId) || [];
    return { equipDocs, workerDocs };
  };

  const myPendingRequests = requests?.filter((req) => canApprove(req)) || [];
  const allPendingRequests = requests?.filter((req) => req.status !== "ep_approved" && req.status !== "rejected") || [];
  const approvedRequests = requests?.filter((req) => req.status === "ep_approved") || [];

  const canCreate = user?.role === "bp" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">반입 요청 관리</h1>
          <p className="text-muted-foreground">장비 및 인력 반입 요청 워크플로우를 관리합니다.</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            반입 요청
          </Button>
        )}
      </div>

      <Tabs defaultValue="my" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my">내 승인 대기 ({myPendingRequests.length})</TabsTrigger>
          <TabsTrigger value="all">전체 진행중</TabsTrigger>
          <TabsTrigger value="approved">반입 완료</TabsTrigger>
        </TabsList>

        <TabsContent value="my">
          <Card>
            <CardHeader>
              <CardTitle>내가 승인할 요청</CardTitle>
              <CardDescription>
                {user?.role === "owner" && "장비 운영사 승인이 필요한 요청입니다."}
                {user?.role === "bp" && "작업계획서 첨부가 필요한 요청입니다."}
                {user?.role === "ep" && "시행사 최종 승인이 필요한 요청입니다."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로딩 중...
                </div>
              ) : myPendingRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>요청번호</TableHead>
                      <TableHead>장비</TableHead>
                      <TableHead>인력</TableHead>
                      <TableHead>투입 예정일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPendingRequests.map((req: any) => {
                      const eq = equipment?.find((e) => e.id === req.equipmentId);
                      const worker = workers?.find((w) => w.id === req.workerId);
                      const { equipDocs, workerDocs } = getDocuments(req.equipmentId, req.workerId);

                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.requestNumber}</TableCell>
                          <TableCell>
                            {eq?.regNum || "-"}
                            <div className="text-xs text-muted-foreground">서류 {equipDocs.length}개</div>
                          </TableCell>
                          <TableCell>
                            {worker?.name || "-"}
                            <div className="text-xs text-muted-foreground">서류 {workerDocs.length}개</div>
                          </TableCell>
                          <TableCell>
                            {req.requestedStartDate
                              ? new Date(req.requestedStartDate).toLocaleDateString("ko-KR")
                              : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  // 서류 확인 다이얼로그 (추후 구현)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {needsWorkPlan(req) ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setWorkPlanDialogOpen(true);
                                  }}
                                >
                                  <Upload className="mr-1 h-3 w-3" />
                                  작업계획서
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  승인
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                반려
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">승인 대기 중인 요청이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>전체 진행 중인 요청</CardTitle>
            </CardHeader>
            <CardContent>
              {allPendingRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>요청번호</TableHead>
                      <TableHead>장비</TableHead>
                      <TableHead>인력</TableHead>
                      <TableHead>투입 예정일</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPendingRequests.map((req: any) => {
                      const eq = equipment?.find((e) => e.id === req.equipmentId);
                      const worker = workers?.find((w) => w.id === req.workerId);

                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.requestNumber}</TableCell>
                          <TableCell>{eq?.regNum || "-"}</TableCell>
                          <TableCell>{worker?.name || "-"}</TableCell>
                          <TableCell>
                            {req.requestedStartDate
                              ? new Date(req.requestedStartDate).toLocaleDateString("ko-KR")
                              : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">진행 중인 요청이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>반입 완료</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>요청번호</TableHead>
                      <TableHead>장비</TableHead>
                      <TableHead>인력</TableHead>
                      <TableHead>최종 승인일</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.map((req: any) => {
                      const eq = equipment?.find((e) => e.id === req.equipmentId);
                      const worker = workers?.find((w) => w.id === req.workerId);

                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.requestNumber}</TableCell>
                          <TableCell>{eq?.regNum || "-"}</TableCell>
                          <TableCell>{worker?.name || "-"}</TableCell>
                          <TableCell>
                            {req.epApprovedAt ? new Date(req.epApprovedAt).toLocaleDateString("ko-KR") : "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">반입 완료된 요청이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 반입 요청 등록 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반입 요청</DialogTitle>
            <DialogDescription>장비와 인력 투입을 요청합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>장비 선택 *</Label>
                <Select
                  value={formData.equipmentId}
                  onValueChange={(value) => setFormData({ ...formData, equipmentId: value })}
                >
                  <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                  <SelectContent>
                    {equipment?.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.regNum}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>인력 선택 *</Label>
                <Select
                  value={formData.workerId}
                  onValueChange={(value) => setFormData({ ...formData, workerId: value })}
                >
                  <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                  <SelectContent>
                    {workers?.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>투입 목적</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="투입 목적을 입력하세요."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>투입 예정일</Label>
                  <Input
                    type="date"
                    value={formData.requestedStartDate}
                    onChange={(e) => setFormData({ ...formData, requestedStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>철수 예정일</Label>
                  <Input
                    type="date"
                    value={formData.requestedEndDate}
                    onChange={(e) => setFormData({ ...formData, requestedEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "요청"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 승인 다이얼로그 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>승인</DialogTitle>
            <DialogDescription>승인 의견을 입력하세요 (선택사항).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>의견</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="승인 의견을 입력하세요."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleApprove}>승인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작업계획서 첨부 다이얼로그 */}
      <Dialog open={workPlanDialogOpen} onOpenChange={setWorkPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작업계획서 첨부</DialogTitle>
            <DialogDescription>작업계획서를 업로드하고 승인하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DocumentUpload onUploadComplete={(url) => setWorkPlanUrl(url)} accept=".pdf" />
            <div className="space-y-2">
              <Label>의견</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="승인 의견을 입력하세요."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkPlanDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleBpApprove} disabled={bpApproveMutation.isPending}>
              {bpApproveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "승인"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려</DialogTitle>
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
    </div>
  );
}
