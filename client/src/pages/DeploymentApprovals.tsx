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
import { CheckCircle, XCircle, Loader2, Clock, MapPin, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * BP 투입 승인 관리 페이지
 * BP가 Owner의 투입 등록 요청을 승인/거부하는 페이지
 */
export default function DeploymentApprovals() {
  const { user } = useAuth();
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<any>(null);

  const [approveFormData, setApproveFormData] = useState({
    guideWorkerId: "",
    workZoneId: "",
    workType: "daily",
    dailyRate: "",
    monthlyRate: "",
    otRate: "",
    nightRate: "",
  });

  const [rejectFormData, setRejectFormData] = useState({
    reason: "",
  });

  const utils = trpc.useUtils();

  // BP 승인 대기 투입 목록 조회
  const { data: pendingDeployments = [], isLoading } = trpc.deployment.getPendingApprovals.useQuery();

  // WorkZone 목록 조회
  const { data: workZones = [] } = trpc.workZones.list.useQuery({
    isActive: true,
  });

  // 유도원 목록 조회 (BP 회사 소속 worker_type='유도원')
  const { data: allWorkers = [] } = trpc.mobile.worker.listWorkers.useQuery();
  const guideWorkers = allWorkers.filter((w: any) => w.workerType?.name === "유도원");

  // 투입 승인 mutation
  const approveMutation = trpc.deployment.approvePending.useMutation({
    onSuccess: () => {
      toast.success("투입이 승인되었습니다");
      setIsApproveOpen(false);
      resetApproveForm();
      utils.deployment.getPendingApprovals.invalidate();
      utils.deployment.list.invalidate();
    },
    onError: (error) => toast.error("투입 승인 실패: " + error.message),
  });

  // 투입 거부 mutation
  const rejectMutation = trpc.deployment.rejectPending.useMutation({
    onSuccess: () => {
      toast.success("투입이 거부되었습니다");
      setIsRejectOpen(false);
      resetRejectForm();
      utils.deployment.getPendingApprovals.invalidate();
      utils.deployment.list.invalidate();
    },
    onError: (error) => toast.error("투입 거부 실패: " + error.message),
  });

  const resetApproveForm = () => {
    setApproveFormData({
      guideWorkerId: "",
      workZoneId: "",
      workType: "daily",
      dailyRate: "",
      monthlyRate: "",
      otRate: "",
      nightRate: "",
    });
    setSelectedDeployment(null);
  };

  const resetRejectForm = () => {
    setRejectFormData({
      reason: "",
    });
    setSelectedDeployment(null);
  };

  const handleApprove = () => {
    if (!selectedDeployment) return;

    approveMutation.mutate({
      deploymentId: selectedDeployment.id,
      guideWorkerId: approveFormData.guideWorkerId || undefined,
      workZoneId: approveFormData.workZoneId || undefined,
      workType: approveFormData.workType || undefined,
      dailyRate: approveFormData.dailyRate ? parseFloat(approveFormData.dailyRate) : undefined,
      monthlyRate: approveFormData.monthlyRate ? parseFloat(approveFormData.monthlyRate) : undefined,
      otRate: approveFormData.otRate ? parseFloat(approveFormData.otRate) : undefined,
      nightRate: approveFormData.nightRate ? parseFloat(approveFormData.nightRate) : undefined,
    });
  };

  const handleReject = () => {
    if (!selectedDeployment) return;

    rejectMutation.mutate({
      deploymentId: selectedDeployment.id,
      reason: rejectFormData.reason || undefined,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">투입 승인 관리</h1>
        <p className="text-muted-foreground">
          Owner가 등록한 투입 요청을 검토하고 승인/거부합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 중인 투입</CardTitle>
          <CardDescription>
            단가를 확인하고 유도원 및 작업 구역을 지정한 후 승인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">로딩 중...</span>
            </div>
          ) : pendingDeployments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>승인 대기 중인 투입이 없습니다</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>장비</TableHead>
                  <TableHead>운전자</TableHead>
                  <TableHead>투입 기간</TableHead>
                  <TableHead>단가</TableHead>
                  <TableHead>작업 구역</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDeployments.map((deployment: any) => (
                  <TableRow key={deployment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{deployment.equipment?.regNum}</div>
                          <div className="text-sm text-muted-foreground">
                            {deployment.equipment?.equipType?.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{deployment.worker?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>
                          {deployment.startDate
                            ? format(new Date(deployment.startDate), "yyyy-MM-dd", { locale: ko })
                            : "-"}
                        </div>
                        <div className="text-muted-foreground">
                          ~{" "}
                          {deployment.plannedEndDate
                            ? format(new Date(deployment.plannedEndDate), "yyyy-MM-dd", { locale: ko })
                            : "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {deployment.workType === "daily" ? (
                          <div>일대: {deployment.dailyRate ? `${deployment.dailyRate}원` : "-"}</div>
                        ) : (
                          <div>월대: {deployment.monthlyRate ? `${deployment.monthlyRate}원` : "-"}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {deployment.workZone ? (
                          <>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{deployment.workZone.name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">미지정</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        승인 대기
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDeployment(deployment);
                            setApproveFormData({
                              guideWorkerId: "",
                              workZoneId: deployment.workZoneId || "",
                              workType: deployment.workType || "daily",
                              dailyRate: deployment.dailyRate || "",
                              monthlyRate: deployment.monthlyRate || "",
                              otRate: deployment.otRate || "",
                              nightRate: deployment.nightRate || "",
                            });
                            setIsApproveOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedDeployment(deployment);
                            setIsRejectOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          거부
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 승인 다이얼로그 */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>투입 승인</DialogTitle>
            <DialogDescription>
              단가를 확인/수정하고 유도원 및 작업 구역을 지정한 후 승인하세요
            </DialogDescription>
          </DialogHeader>

          {selectedDeployment && (
            <div className="grid gap-4 py-4">
              {/* 투입 정보 요약 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">장비:</span>{" "}
                    {selectedDeployment.equipment?.regNum}
                  </div>
                  <div>
                    <span className="font-medium">운전자:</span>{" "}
                    {selectedDeployment.worker?.name}
                  </div>
                  <div>
                    <span className="font-medium">시작일:</span>{" "}
                    {selectedDeployment.startDate
                      ? format(new Date(selectedDeployment.startDate), "yyyy-MM-dd")
                      : "-"}
                  </div>
                  <div>
                    <span className="font-medium">종료 예정:</span>{" "}
                    {selectedDeployment.plannedEndDate
                      ? format(new Date(selectedDeployment.plannedEndDate), "yyyy-MM-dd")
                      : "-"}
                  </div>
                </div>
              </div>

              {/* 작업 구역 선택 */}
              <div className="grid gap-2">
                <Label htmlFor="workZoneId">
                  작업 구역 (현장명 + GPS) <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={approveFormData.workZoneId}
                  onValueChange={(value) =>
                    setApproveFormData({ ...approveFormData, workZoneId: value })
                  }
                >
                  <SelectTrigger id="workZoneId">
                    <SelectValue placeholder="작업 구역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {workZones.map((zone: any) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name} {zone.description && `- ${zone.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  출근 GPS 제한 및 현장명이 자동으로 연결됩니다
                </p>
              </div>

              {/* 유도원 선택 */}
              <div className="grid gap-2">
                <Label htmlFor="guideWorkerId">유도원 (선택사항)</Label>
                <Select
                  value={approveFormData.guideWorkerId}
                  onValueChange={(value) =>
                    setApproveFormData({ ...approveFormData, guideWorkerId: value })
                  }
                >
                  <SelectTrigger id="guideWorkerId">
                    <SelectValue placeholder="유도원 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">선택 안 함</SelectItem>
                    {guideWorkers.map((worker: any) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 단가 정보 */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">단가 정보</h4>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="workType">계약 타입</Label>
                    <Select
                      value={approveFormData.workType}
                      onValueChange={(value) =>
                        setApproveFormData({ ...approveFormData, workType: value })
                      }
                    >
                      <SelectTrigger id="workType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">일대</SelectItem>
                        <SelectItem value="monthly">월대</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {approveFormData.workType === "daily" && (
                    <div className="grid gap-2">
                      <Label htmlFor="dailyRate">일대 단가 (원)</Label>
                      <Input
                        id="dailyRate"
                        type="number"
                        placeholder="예: 350000"
                        value={approveFormData.dailyRate}
                        onChange={(e) =>
                          setApproveFormData({ ...approveFormData, dailyRate: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {approveFormData.workType === "monthly" && (
                    <div className="grid gap-2">
                      <Label htmlFor="monthlyRate">월대 단가 (원)</Label>
                      <Input
                        id="monthlyRate"
                        type="number"
                        placeholder="예: 7000000"
                        value={approveFormData.monthlyRate}
                        onChange={(e) =>
                          setApproveFormData({ ...approveFormData, monthlyRate: e.target.value })
                        }
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="otRate">OT 단가 (원)</Label>
                      <Input
                        id="otRate"
                        type="number"
                        placeholder="예: 50000"
                        value={approveFormData.otRate}
                        onChange={(e) =>
                          setApproveFormData({ ...approveFormData, otRate: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="nightRate">철야 단가 (원)</Label>
                      <Input
                        id="nightRate"
                        type="number"
                        placeholder="예: 100000"
                        value={approveFormData.nightRate}
                        onChange={(e) =>
                          setApproveFormData({ ...approveFormData, nightRate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveOpen(false);
                resetApproveForm();
              }}
            >
              취소
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending || !approveFormData.workZoneId}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 거부 다이얼로그 */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>투입 거부</DialogTitle>
            <DialogDescription>
              투입을 거부하는 이유를 입력하세요 (선택사항)
            </DialogDescription>
          </DialogHeader>

          {selectedDeployment && (
            <div className="grid gap-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                <div>
                  <span className="font-medium">장비:</span> {selectedDeployment.equipment?.regNum}
                </div>
                <div>
                  <span className="font-medium">운전자:</span> {selectedDeployment.worker?.name}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reason">거부 사유 (선택사항)</Label>
                <Textarea
                  id="reason"
                  placeholder="거부 사유를 입력하세요"
                  value={rejectFormData.reason}
                  onChange={(e) =>
                    setRejectFormData({ ...rejectFormData, reason: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectOpen(false);
                resetRejectForm();
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
