import { useState, useEffect, useMemo } from "react";
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
import { Plus, Clock, UserCheck, CheckCircle, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 투입 관리 페이지 (Owner)
 * 장비+운전자를 현장에 투입하고 관리하는 페이지
 */
export default function Deployments() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const isBp = role === 'bp';
  const isEp = role === 'ep';
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isChangeWorkerOpen, setIsChangeWorkerOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGuideWorkerOpen, setIsGuideWorkerOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownerCompanyFilter, setOwnerCompanyFilter] = useState<string>("");
  const [bpCompanyFilter, setBpCompanyFilter] = useState<string>("");
  const [epCompanyFilter, setEpCompanyFilter] = useState<string>("");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("");
  const [workerFilter, setWorkerFilter] = useState<string>("");
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const [createFormData, setCreateFormData] = useState({
    entryRequestId: "",
    equipmentId: "",
    workerId: "",
    bpCompanyId: "",
    workZoneId: "", // 작업 구역 (현장명 + GPS - siteName 자동 설정)
    startDate: "",
    plannedEndDate: "",
    workType: "daily", // 'daily' | 'monthly'
    dailyRate: "",
    monthlyRate: "",
    otRate: "",
    nightRate: "",
  });

  const [extendFormData, setExtendFormData] = useState({
    newEndDate: "",
    reason: "",
  });

  const [changeWorkerFormData, setChangeWorkerFormData] = useState({
    newWorkerId: "",
    reason: "",
  });

  const [guideWorkerFormData, setGuideWorkerFormData] = useState({
    guideWorkerId: "",
  });

  const [inspectorFormData, setInspectorFormData] = useState({
    inspectorId: "",
  });

  const [approveFormData, setApproveFormData] = useState({
    guideWorkerId: "",
    workZoneId: "",
    workType: "daily",
    dailyRate: "",
    monthlyRate: "",
    otRate: "",
    nightRate: "",
  });

  const utils = trpc.useUtils();

  // 회사 목록 조회
  const { data: ownerCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "owner" },
    { enabled: role === "admin" || role === "bp" || role === "ep" }
  );
  const { data: bpCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "bp" },
    { enabled: role === "admin" || role === "ep" || role === "owner" }
  );
  const { data: epCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "ep" },
    { enabled: role === "admin" || role === "owner" }
  );

  // WorkZone 목록 조회 (활성화된 작업 구역만)
  const { data: workZones = [] } = trpc.workZones.list.useQuery({
    isActive: true,
  });

  // 필터 초기화
  useEffect(() => {
    if (!user || filtersInitialized) return;

    if (role === "bp" && user.companyId) {
      setBpCompanyFilter(user.companyId);
    }

    // EP와 Admin은 모든 deployment 조회 가능 (자동 필터링 없음)
    // if (role === "ep" && user.companyId) {
    //   setEpCompanyFilter(user.companyId);
    // }

    if (role === "owner" && user.id) {
      // Owner는 자동으로 필터링되므로 필터 UI는 비활성화
    }

    setFiltersInitialized(true);
  }, [user, role, filtersInitialized]);

  // 필터 옵션 생성 (Owner는 서버에서 자동 필터링)
  // Owner의 경우 안정적인 빈 객체를 반환하기 위해 useMemo 외부에 상수로 정의
  const emptyFilters = useMemo(() => ({}), []);

  const deploymentFilters = useMemo(() => {
    // Owner는 서버에서 자동으로 ownerId 필터링하므로 빈 객체 전달
    if (role === "owner") {
      return emptyFilters;
    }

    const input: Record<string, string> = {};

    if (ownerCompanyFilter) {
      // Admin/BP/EP가 Owner 회사 필터를 선택한 경우
      // ownerCompanyFilter는 company ID이므로, 해당 company의 owner user ID를 찾아야 함
      // 하지만 일단은 빈 필터로 두고 서버에서 처리하도록 함
    }

    if (role === "bp" && user?.companyId) {
      input.bpCompanyId = user.companyId;
    } else if (bpCompanyFilter) {
      input.bpCompanyId = bpCompanyFilter;
    }

    // EP와 Admin은 모든 deployment 조회 가능 (자동 필터링 없음)
    // 수동으로 필터를 선택한 경우에만 적용
    if (epCompanyFilter) {
      input.epCompanyId = epCompanyFilter;
    }

    if (equipmentFilter) {
      input.equipmentId = equipmentFilter;
    }

    if (workerFilter) {
      input.workerId = workerFilter;
    }

    if (statusFilter !== "all") {
      input.status = statusFilter;
    }

    return input;
  }, [ownerCompanyFilter, bpCompanyFilter, epCompanyFilter, equipmentFilter, workerFilter, statusFilter, role, user?.id, user?.companyId, emptyFilters]);

  // 데이터 조회
  const { data: deployments, isLoading } = trpc.deployments.list.useQuery(deploymentFilters);

  const { data: entryRequests } = trpc.entryRequestsV2.list.useQuery();
  const { data: equipment } = trpc.equipment.list.useQuery();
  const { data: workers } = trpc.workers.list.useQuery();
  
  // 유도원 목록 조회 (BP만, 유도원 인력 유형)
  const { data: workerTypes } = trpc.workerTypes.list.useQuery();
  const guideWorkerTypeId = workerTypes?.find((wt: any) => wt.name === "유도원")?.id;
  const guideWorkers = workers?.filter((w: any) => w.workerTypeId === guideWorkerTypeId) || [];
  
  // Inspector 목록 조회 (EP만)
  const { data: inspectors } = trpc.deployments.listInspectors.useQuery(undefined, {
    enabled: isEp || isAdmin,
  });

  // Entry Request 승인 완료된 것만 필터링 (먼저 정의)
  const approvedEntryRequests = entryRequests?.filter(
    (req) => req.status === "ep_approved"
  );

  // 🔍 디버깅: 반입 요청 데이터 확인
  console.log('=== [Deployments] 디버깅 시작 ===');
  console.log('1. 전체 반입 요청 개수:', entryRequests?.length || 0);
  console.log('2. EP 승인된 반입 요청 개수:', approvedEntryRequests?.length || 0);

  if (approvedEntryRequests && approvedEntryRequests.length > 0) {
    console.log('3. EP 승인된 반입 요청 목록:');
    approvedEntryRequests.forEach((req, idx) => {
      console.log(`   [${idx}] ID: ${req.id}, Status: ${req.status}, Items: ${req.items?.length || 0}개`);
      if (req.items && req.items.length > 0) {
        req.items.forEach((item: any, itemIdx: number) => {
          console.log(`      [${itemIdx}] Type: ${item.itemType || item.item_type}, ID: ${item.itemId || item.item_id}`);
        });
      } else {
        console.warn('      ⚠️ items가 없거나 비어있음!');
      }
    });
  } else {
    console.warn('⚠️ EP 승인된 반입 요청이 없습니다!');
  }

  // EP 승인 완료된 반입 요청의 모든 아이템 ID 추출
  const approvedEquipmentIds = new Set<string>();
  const approvedWorkerIds = new Set<string>();
  const equipmentToEntryRequestMap = new Map<string, string>(); // 장비 ID -> 반입 요청 ID

  approvedEntryRequests?.forEach((req) => {
    req.items?.forEach((item: any) => {
      const itemType = item.itemType || item.item_type;
      const itemId = item.itemId || item.item_id;

      if (itemType === 'equipment' && itemId) {
        approvedEquipmentIds.add(itemId);
        equipmentToEntryRequestMap.set(itemId, req.id);
      } else if (itemType === 'worker' && itemId) {
        approvedWorkerIds.add(itemId);
      }
    });
  });

  console.log('4. 추출된 장비 ID:', Array.from(approvedEquipmentIds));
  console.log('5. 추출된 인력 ID:', Array.from(approvedWorkerIds));
  console.log('6. 전체 장비 개수:', equipment?.length || 0);
  console.log('7. 전체 인력 개수:', workers?.length || 0);

  // EP 승인된 장비/인력만 표시
  const availableEquipment = equipment?.filter((e) => approvedEquipmentIds.has(e.id)) || [];
  const availableWorkers = workers?.filter((w) => approvedWorkerIds.has(w.id)) || [];

  console.log('8. 필터링된 장비 개수:', availableEquipment.length);
  console.log('9. 필터링된 인력 개수:', availableWorkers.length);
  console.log('=== [Deployments] 디버깅 종료 ===\n');

  // Mutations
  const createMutation = trpc.deployments.create.useMutation({
    onSuccess: () => {
      toast.success("투입이 등록되었습니다.");
      utils.deployments.list.invalidate();
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: (error) => toast.error("투입 등록 실패: " + error.message),
  });

  const extendMutation = trpc.deployments.extend.useMutation({
    onSuccess: () => {
      toast.success("투입 기간이 연장되었습니다.");
      utils.deployments.list.invalidate();
      setIsExtendOpen(false);
      resetExtendForm();
    },
    onError: (error) => toast.error("기간 연장 실패: " + error.message),
  });

  const changeWorkerMutation = trpc.deployments.changeWorker.useMutation({
    onSuccess: () => {
      toast.success("운전자가 교체되었습니다.");
      utils.deployments.list.invalidate();
      setIsChangeWorkerOpen(false);
      resetChangeWorkerForm();
    },
    onError: (error) => toast.error("운전자 교체 실패: " + error.message),
  });

  const completeMutation = trpc.deployments.complete.useMutation({
    onSuccess: () => {
      toast.success("투입이 종료되었습니다.");
      utils.deployments.list.invalidate();
    },
    onError: (error) => toast.error("투입 종료 실패: " + error.message),
  });

  const addGuideWorkerMutation = trpc.deployments.addGuideWorker.useMutation({
    onSuccess: () => {
      toast.success("유도원이 추가/교체되었습니다.");
      utils.deployments.list.invalidate();
      setIsGuideWorkerOpen(false);
      setGuideWorkerFormData({ guideWorkerId: "" });
    },
    onError: (error) => toast.error("유도원 추가 실패: " + error.message),
  });

  const assignInspectorMutation = trpc.deployments.assignInspector.useMutation({
    onSuccess: () => {
      toast.success("안전점검원이 지정되었습니다.");
      utils.deployments.list.invalidate();
      setIsInspectorOpen(false);
      setInspectorFormData({ inspectorId: "" });
    },
    onError: (error) => toast.error("안전점검원 지정 실패: " + error.message),
  });

  // BP 투입 승인 mutation
  const approvePendingMutation = trpc.deployments.approvePending.useMutation({
    onSuccess: () => {
      toast.success("투입이 승인되었습니다.");
      utils.deployments.list.invalidate();
      setIsApproveOpen(false);
      setApproveFormData({ guideWorkerId: "" });
    },
    onError: (error) => toast.error("투입 승인 실패: " + error.message),
  });

  // 폼 리셋
  const resetCreateForm = () => {
    setCreateFormData({
      entryRequestId: "",
      equipmentId: "",
      workerId: "",
      bpCompanyId: "",
      workZoneId: "",
      startDate: "",
      plannedEndDate: "",
      workType: "daily",
      dailyRate: "",
      monthlyRate: "",
      otRate: "",
      nightRate: "",
    });
  };

  const resetExtendForm = () => {
    setExtendFormData({
      newEndDate: "",
      reason: "",
    });
  };

  const resetChangeWorkerForm = () => {
    setChangeWorkerFormData({
      newWorkerId: "",
      reason: "",
    });
  };

  // 투입 생성
  const handleCreate = () => {
    createMutation.mutate({
      entryRequestId: createFormData.entryRequestId,
      equipmentId: createFormData.equipmentId,
      workerId: createFormData.workerId,
      bpCompanyId: createFormData.bpCompanyId,
      workZoneId: createFormData.workZoneId || undefined, // 작업 구역 (siteName 자동 설정)
      startDate: new Date(createFormData.startDate),
      plannedEndDate: new Date(createFormData.plannedEndDate),
      // siteName은 서버에서 workZoneId로부터 자동 설정됨
      workType: createFormData.workType || undefined,
      dailyRate: createFormData.dailyRate ? parseFloat(createFormData.dailyRate) : undefined,
      monthlyRate: createFormData.monthlyRate ? parseFloat(createFormData.monthlyRate) : undefined,
      otRate: createFormData.otRate ? parseFloat(createFormData.otRate) : undefined,
      nightRate: createFormData.nightRate ? parseFloat(createFormData.nightRate) : undefined,
    });
  };

  // 기간 연장
  const handleExtend = () => {
    if (!selectedDeployment) return;
    extendMutation.mutate({
      deploymentId: selectedDeployment.id,
      newEndDate: new Date(extendFormData.newEndDate),
      reason: extendFormData.reason,
    });
  };

  // 운전자 교체
  const handleChangeWorker = () => {
    if (!selectedDeployment) return;
    changeWorkerMutation.mutate({
      deploymentId: selectedDeployment.id,
      newWorkerId: changeWorkerFormData.newWorkerId,
      reason: changeWorkerFormData.reason,
    });
  };

  // 투입 종료
  const handleComplete = (deployment: any) => {
    if (!confirm("투입을 종료하시겠습니까?")) return;
    completeMutation.mutate({
      deploymentId: deployment.id,
      actualEndDate: new Date(),
    });
  };

  // 유도원 추가/교체
  const handleAddGuideWorker = () => {
    if (!selectedDeployment || !guideWorkerFormData.guideWorkerId) {
      toast.error("유도원을 선택해주세요.");
      return;
    }
    addGuideWorkerMutation.mutate({
      deploymentId: selectedDeployment.id,
      guideWorkerId: guideWorkerFormData.guideWorkerId,
    });
  };

  // 안전점검원 지정
  const handleAssignInspector = () => {
    if (!selectedDeployment || !inspectorFormData.inspectorId) {
      toast.error("안전점검원을 선택해주세요.");
      return;
    }
    assignInspectorMutation.mutate({
      deploymentId: selectedDeployment.id,
      inspectorId: inspectorFormData.inspectorId,
    });
  };

  // 필터링된 투입 목록
  const filteredDeployments = deployments?.filter((d) => {
    if (statusFilter === "all") return true;
    return d.status === statusFilter;
  });

  // 🔍 디버깅: deployment 데이터 확인
  console.log('=== [Deployments] 투입 데이터 확인 ===');
  console.log('전체 deployments 개수:', deployments?.length || 0);
  if (deployments && deployments.length > 0) {
    console.log('첫 번째 deployment:', deployments[0]);
    console.log('모든 deployment 상태:');
    deployments.forEach((d, i) => {
      console.log(`  [${i}] ID: ${d.id}, Status: "${d.status}", Equipment: ${d.equipmentId}`);
    });
  }
  console.log('현재 statusFilter:', statusFilter);
  console.log('filteredDeployments 개수:', filteredDeployments?.length || 0);

  // 상태 뱃지
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending_bp: { label: "승인대기", variant: "secondary" },
      pending: { label: "대기", variant: "secondary" },
      active: { label: "투입중", variant: "default" },
      extended: { label: "연장", variant: "outline" },
      completed: { label: "종료", variant: "secondary" },
    };
    const config = statusMap[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">투입 관리</h1>
          <p className="text-muted-foreground mt-1">
            장비와 운전자의 현장 투입을 관리합니다
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          투입 등록
        </Button>
      </div>

      {/* 필터 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 필터 UI - 한 줄 통일 디자인 */}
          <div className="flex flex-wrap items-end gap-3">
            {(role === "admin" || role === "bp" || role === "ep") && (
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">Owner 회사</Label>
                <Select
                  value={ownerCompanyFilter || "all"}
                  onValueChange={(value) => setOwnerCompanyFilter(value === "all" ? "" : value)}
                  disabled={role === "owner"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {ownerCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(role === "admin" || role === "ep" || role === "owner") && (
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">BP 회사</Label>
                <Select
                  value={bpCompanyFilter || "all"}
                  onValueChange={(value) => setBpCompanyFilter(value === "all" ? "" : value)}
                  disabled={role === "bp"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {bpCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === "admin" && (
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">EP 회사</Label>
                <Select
                  value={epCompanyFilter || "all"}
                  onValueChange={(value) => setEpCompanyFilter(value === "all" ? "" : value)}
                  disabled={role === "ep"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {epCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">장비</Label>
              <Select
                value={equipmentFilter || "all"}
                onValueChange={(value) => setEquipmentFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {equipment?.map((eq: any) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.regNum} {eq.equipType?.typeName && `(${eq.equipType.typeName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">운전자</Label>
              <Select
                value={workerFilter || "all"}
                onValueChange={(value) => setWorkerFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {workers?.map((worker: any) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} {worker.workerType?.typeName && `(${worker.workerType.typeName})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">상태</Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="active">투입중</SelectItem>
                  <SelectItem value="extended">연장</SelectItem>
                  <SelectItem value="completed">종료</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>투입 목록</CardTitle>
          <CardDescription>
            현재 투입 현황을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              {isBp && <TabsTrigger value="pending_bp">승인대기</TabsTrigger>}
              <TabsTrigger value="active">투입중</TabsTrigger>
              <TabsTrigger value="extended">연장</TabsTrigger>
              <TabsTrigger value="completed">종료</TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>등록일</TableHead>
                      <TableHead>장비</TableHead>
                      <TableHead>운전자</TableHead>
                      <TableHead>유도원</TableHead>
                      <TableHead>BP 회사</TableHead>
                      <TableHead>투입일</TableHead>
                      <TableHead>종료 예정일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeployments && filteredDeployments.length > 0 ? (
                      filteredDeployments.map((deployment) => {
                        const bpCompany = bpCompanies?.find((c) => c.id === deployment.bpCompanyId);

                        return (
                          <TableRow key={deployment.id}>
                            <TableCell>
                              {format(new Date(deployment.createdAt), "MM/dd HH:mm", {
                                locale: ko,
                              })}
                            </TableCell>
                            <TableCell>
                              {deployment.equipment?.regNum || "-"}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {deployment.equipment?.equipType?.typeName || ""}
                              </span>
                            </TableCell>
                            <TableCell>
                              {deployment.worker?.name || "-"}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {deployment.worker?.workerType?.typeName || ""}
                              </span>
                            </TableCell>
                            <TableCell>
                              {deployment.guideWorker?.name || "-"}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {deployment.guideWorker?.workerType?.typeName || ""}
                              </span>
                            </TableCell>
                            <TableCell>
                              {bpCompany?.name || "-"}
                              {/* Inspector 정보 표시 */}
                              {deployment.inspectorId && (() => {
                                const inspector = inspectors?.find((i: any) => i.id === deployment.inspectorId);
                                return inspector ? (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-xs bg-blue-50">
                                      안전점검원: {inspector.name}
                                    </Badge>
                                  </div>
                                ) : null;
                              })()}
                            </TableCell>
                            <TableCell>
                              {format(new Date(deployment.startDate), "yyyy-MM-dd", {
                                locale: ko,
                              })}
                            </TableCell>
                            <TableCell>
                              {format(new Date(deployment.plannedEndDate), "yyyy-MM-dd", {
                                locale: ko,
                              })}
                            </TableCell>
                            <TableCell>{getStatusBadge(deployment.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedDeployment(deployment);
                                    setIsDetailOpen(true);
                                  }}
                                >
                                  상세보기
                                </Button>
                                {/* BP: pending_bp 상태 투입 승인 */}
                                {isBp && deployment.status === "pending_bp" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setSelectedDeployment(deployment);
                                      setApproveFormData({
                                        guideWorkerId: deployment.guideWorkerId || "",
                                        workZoneId: deployment.workZoneId || "",
                                        workType: deployment.workType || "daily",
                                        dailyRate: deployment.dailyRate?.toString() || "",
                                        monthlyRate: deployment.monthlyRate?.toString() || "",
                                        otRate: deployment.otRate?.toString() || "",
                                        nightRate: deployment.nightRate?.toString() || "",
                                      });
                                      setIsApproveOpen(true);
                                    }}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    승인
                                  </Button>
                                )}
                                {(deployment.status === "active" ||
                                  deployment.status === "extended") && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedDeployment(deployment);
                                        setExtendFormData({
                                          newEndDate: format(
                                            new Date(deployment.plannedEndDate),
                                            "yyyy-MM-dd"
                                          ),
                                          reason: "",
                                        });
                                        setIsExtendOpen(true);
                                      }}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      연장
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedDeployment(deployment);
                                        setChangeWorkerFormData({
                                          newWorkerId: "",
                                          reason: "",
                                        });
                                        setIsChangeWorkerOpen(true);
                                      }}
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      운전자 교체
                                    </Button>
                                    {/* BP: 유도원 추가/교체 */}
                                    {isBp && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedDeployment(deployment);
                                          setGuideWorkerFormData({
                                            guideWorkerId: deployment.guideWorkerId || "",
                                          });
                                          setIsGuideWorkerOpen(true);
                                        }}
                                      >
                                        <UserCheck className="h-3 w-3 mr-1" />
                                        유도원 {deployment.guideWorkerId ? "교체" : "추가"}
                                      </Button>
                                    )}
                                    {/* EP: 안전점검원 지정 */}
                                    {isEp && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedDeployment(deployment);
                                          setInspectorFormData({
                                            inspectorId: deployment.inspectorId || "",
                                          });
                                          setIsInspectorOpen(true);
                                        }}
                                      >
                                        <UserCheck className="h-3 w-3 mr-1" />
                                        안전점검원 {deployment.inspectorId ? "변경" : "지정"}
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleComplete(deployment)}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      종료
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          투입 내역이 없습니다
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 투입 등록 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>투입 등록</DialogTitle>
            <DialogDescription>
              승인 완료된 반입 요청을 기반으로 장비와 운전자를 투입합니다
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 반입 요청 자동 선택 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>💡 안내:</strong> EP 승인 완료된 장비와 인력만 선택할 수 있습니다.
                반입 요청은 장비 선택 시 자동으로 연결됩니다.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bpCompanyId">BP 현장 (협력업체) <span className="text-destructive">*</span></Label>
              <Select
                value={createFormData.bpCompanyId}
                onValueChange={(value) =>
                  setCreateFormData({ ...createFormData, bpCompanyId: value })
                }
              >
                <SelectTrigger id="bpCompanyId">
                  <SelectValue placeholder="BP 현장 선택" />
                </SelectTrigger>
                <SelectContent>
                  {bpCompanies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                투입할 BP 현장을 선택하세요
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="workZoneId">작업 구역 (현장명 + GPS 구역) <span className="text-destructive">*</span></Label>
              <Select
                value={createFormData.workZoneId}
                onValueChange={(value) =>
                  setCreateFormData({ ...createFormData, workZoneId: value })
                }
              >
                <SelectTrigger id="workZoneId">
                  <SelectValue placeholder="작업 구역 선택" />
                </SelectTrigger>
                <SelectContent>
                  {workZones.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      활성화된 작업 구역이 없습니다
                    </div>
                  ) : (
                    workZones.map((zone: any) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name} {zone.description && `- ${zone.description}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                출근 GPS 제한 및 현장명 자동 연결됩니다
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="equipmentId">장비 <span className="text-destructive">*</span></Label>
                <Select
                  value={createFormData.equipmentId}
                  onValueChange={(value) => {
                    // 장비 선택 시 자동으로 반입 요청 ID 설정
                    const entryRequestId = equipmentToEntryRequestMap.get(value) || "";
                    setCreateFormData({
                      ...createFormData,
                      equipmentId: value,
                      entryRequestId: entryRequestId
                    });
                  }}
                >
                  <SelectTrigger id="equipmentId">
                    <SelectValue placeholder="장비 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEquipment.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        EP 승인된 장비가 없습니다
                      </div>
                    ) : (
                      availableEquipment.map((equip) => (
                        <SelectItem key={equip.id} value={equip.id}>
                          {equip.regNum} - {equip.equipType?.typeName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  EP 승인된 장비 {availableEquipment.length}개
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workerId">운전자 <span className="text-destructive">*</span></Label>
                <Select
                  value={createFormData.workerId}
                  onValueChange={(value) => {
                    setCreateFormData({
                      ...createFormData,
                      workerId: value
                      // 장비 선택 유지 (초기화하지 않음)
                    });
                  }}
                >
                  <SelectTrigger id="workerId">
                    <SelectValue placeholder="운전자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        EP 승인된 인력이 없습니다
                      </div>
                    ) : (
                      availableWorkers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name} - {worker.workerType?.typeName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  EP 승인된 인력 {availableWorkers.length}개
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">투입 시작일</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={createFormData.startDate}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, startDate: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plannedEndDate">종료 예정일</Label>
                <Input
                  id="plannedEndDate"
                  type="date"
                  value={createFormData.plannedEndDate}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, plannedEndDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 작업확인서용 추가 정보 */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold mb-3">작업확인서 정보</h3>
              <p className="text-sm text-muted-foreground mb-3">
                * 공사명/현장명은 위에서 선택한 작업 구역 이름이 자동으로 사용됩니다
              </p>

              <div className="grid gap-4">

                <div className="grid gap-2">
                  <Label htmlFor="workType">계약 타입</Label>
                  <Select
                    value={createFormData.workType}
                    onValueChange={(value) =>
                      setCreateFormData({ ...createFormData, workType: value })
                    }
                  >
                    <SelectTrigger id="workType">
                      <SelectValue placeholder="계약 타입 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">일대</SelectItem>
                      <SelectItem value="monthly">월대</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dailyRate">일대 단가 (원)</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      placeholder="300000"
                      value={createFormData.dailyRate}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, dailyRate: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="monthlyRate">월대 단가 (원)</Label>
                    <Input
                      id="monthlyRate"
                      type="number"
                      placeholder="6000000"
                      value={createFormData.monthlyRate}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, monthlyRate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="otRate">OT 단가 (시간당)</Label>
                    <Input
                      id="otRate"
                      type="number"
                      placeholder="50000"
                      value={createFormData.otRate}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, otRate: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="nightRate">철야 단가 (시간당)</Label>
                    <Input
                      id="nightRate"
                      type="number"
                      placeholder="60000"
                      value={createFormData.nightRate}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, nightRate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !createFormData.entryRequestId ||
                !createFormData.equipmentId ||
                !createFormData.workerId ||
                !createFormData.bpCompanyId ||
                !createFormData.startDate ||
                !createFormData.plannedEndDate ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              투입 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 기간 연장 다이얼로그 */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>투입 기간 연장</DialogTitle>
            <DialogDescription>
              투입 종료 예정일을 연장합니다
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newEndDate">새 종료 예정일</Label>
              <Input
                id="newEndDate"
                type="date"
                value={extendFormData.newEndDate}
                onChange={(e) =>
                  setExtendFormData({ ...extendFormData, newEndDate: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="extendReason">연장 사유</Label>
              <Textarea
                id="extendReason"
                placeholder="연장 사유를 입력하세요"
                value={extendFormData.reason}
                onChange={(e) =>
                  setExtendFormData({ ...extendFormData, reason: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleExtend}
              disabled={
                !extendFormData.newEndDate ||
                !extendFormData.reason ||
                extendMutation.isPending
              }
            >
              {extendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              연장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 운전자 교체 다이얼로그 */}
      <Dialog open={isChangeWorkerOpen} onOpenChange={setIsChangeWorkerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>운전자 교체</DialogTitle>
            <DialogDescription>
              투입된 운전자를 교체합니다
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newWorkerId">새 운전자</Label>
              <Select
                value={changeWorkerFormData.newWorkerId}
                onValueChange={(value) =>
                  setChangeWorkerFormData({ ...changeWorkerFormData, newWorkerId: value })
                }
              >
                <SelectTrigger id="newWorkerId">
                  <SelectValue placeholder="운전자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} - {worker.workerType?.typeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="changeReason">교체 사유</Label>
              <Textarea
                id="changeReason"
                placeholder="교체 사유를 입력하세요"
                value={changeWorkerFormData.reason}
                onChange={(e) =>
                  setChangeWorkerFormData({ ...changeWorkerFormData, reason: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeWorkerOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleChangeWorker}
              disabled={
                !changeWorkerFormData.newWorkerId ||
                !changeWorkerFormData.reason ||
                changeWorkerMutation.isPending
              }
            >
              {changeWorkerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              교체
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 투입 상세보기 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>투입 상세 정보</DialogTitle>
            <DialogDescription>
              투입된 장비와 운전자의 모든 정보를 확인하고 관리합니다
            </DialogDescription>
          </DialogHeader>

          {selectedDeployment && (
            <div className="grid gap-6">
              {/* 기본 정보 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">투입 ID</Label>
                    <p className="font-mono text-sm">{selectedDeployment.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">상태</Label>
                    <div className="mt-1">{getStatusBadge(selectedDeployment.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">반입 요청 번호</Label>
                    <p>{selectedDeployment.entryRequestId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">BP 현장</Label>
                    <p>{bpCompanies?.find((c) => c.id === selectedDeployment.bpCompanyId)?.name || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-muted-foreground">장비</Label>
                    <p className="font-medium">
                      {equipment?.find((e) => e.id === selectedDeployment.equipmentId)?.regNum || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {equipment?.find((e) => e.id === selectedDeployment.equipmentId)?.equipType?.typeName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">운전자</Label>
                    <p className="font-medium">
                      {workers?.find((w) => w.id === selectedDeployment.workerId)?.name || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {workers?.find((w) => w.id === selectedDeployment.workerId)?.workerType?.typeName}
                    </p>
                  </div>
                </div>
              </div>

              {/* 계약 정보 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">계약 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">공사명/현장명</Label>
                    <p>{selectedDeployment.siteName || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">계약 타입</Label>
                    <p>
                      {selectedDeployment.workType === "daily"
                        ? "일대"
                        : selectedDeployment.workType === "monthly"
                        ? "월대"
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-muted-foreground">일대 단가</Label>
                    <p className="text-lg font-semibold">
                      {selectedDeployment.dailyRate
                        ? `${Number(selectedDeployment.dailyRate).toLocaleString()}원`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">월대 단가</Label>
                    <p className="text-lg font-semibold">
                      {selectedDeployment.monthlyRate
                        ? `${Number(selectedDeployment.monthlyRate).toLocaleString()}원`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">OT 단가 (시간당)</Label>
                    <p className="font-semibold">
                      {selectedDeployment.otRate
                        ? `${Number(selectedDeployment.otRate).toLocaleString()}원`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">철야 단가 (시간당)</Label>
                    <p className="font-semibold">
                      {selectedDeployment.nightRate
                        ? `${Number(selectedDeployment.nightRate).toLocaleString()}원`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 기간 정보 */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">기간 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">투입 시작일</Label>
                    <p className="font-medium">
                      {format(new Date(selectedDeployment.startDate), "yyyy년 MM월 dd일", {
                        locale: ko,
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">종료 예정일</Label>
                    <p className="font-medium">
                      {format(new Date(selectedDeployment.plannedEndDate), "yyyy년 MM월 dd일", {
                        locale: ko,
                      })}
                    </p>
                  </div>
                  {selectedDeployment.actualEndDate && (
                    <div>
                      <Label className="text-muted-foreground">실제 종료일</Label>
                      <p className="font-medium">
                        {format(new Date(selectedDeployment.actualEndDate), "yyyy년 MM월 dd일", {
                          locale: ko,
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">등록일시</Label>
                    <p className="text-sm">
                      {format(new Date(selectedDeployment.createdAt), "yyyy-MM-dd HH:mm", {
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* 빠른 액션 */}
              {(selectedDeployment.status === "active" ||
                selectedDeployment.status === "extended") && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold text-lg mb-3">빠른 액션</h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtendFormData({
                          newEndDate: format(
                            new Date(selectedDeployment.plannedEndDate),
                            "yyyy-MM-dd"
                          ),
                          reason: "",
                        });
                        setIsDetailOpen(false);
                        setIsExtendOpen(true);
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      기간 연장
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setChangeWorkerFormData({
                          newWorkerId: "",
                          reason: "",
                        });
                        setIsDetailOpen(false);
                        setIsChangeWorkerOpen(true);
                      }}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      운전자 교체
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => {
                        setIsDetailOpen(false);
                        handleComplete(selectedDeployment);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      투입 종료
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 유도원 추가/교체 다이얼로그 (BP 전용) */}
      <Dialog open={isGuideWorkerOpen} onOpenChange={setIsGuideWorkerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>유도원 {selectedDeployment?.guideWorkerId ? "교체" : "추가"}</DialogTitle>
            <DialogDescription>
              투입에 유도원을 추가하거나 교체합니다
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="guideWorkerId">유도원 선택</Label>
              <Select
                value={guideWorkerFormData.guideWorkerId}
                onValueChange={(value) =>
                  setGuideWorkerFormData({ ...guideWorkerFormData, guideWorkerId: value })
                }
              >
                <SelectTrigger id="guideWorkerId">
                  <SelectValue placeholder="유도원 선택" />
                </SelectTrigger>
                <SelectContent>
                  {guideWorkers.length === 0 ? (
                    <SelectItem value="" disabled>
                      유도원이 없습니다. 인력 관리에서 유도원을 먼저 생성해주세요.
                    </SelectItem>
                  ) : (
                    guideWorkers.map((worker: any) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name} {worker.licenseNum && `(${worker.licenseNum})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {guideWorkers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  유도원을 먼저 인력 관리에서 생성해주세요.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGuideWorkerOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAddGuideWorker}
              disabled={!guideWorkerFormData.guideWorkerId || addGuideWorkerMutation.isPending}
            >
              {addGuideWorkerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedDeployment?.guideWorkerId ? "교체" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BP 투입 승인 다이얼로그 */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>투입 승인</DialogTitle>
            <DialogDescription>
              단가를 확인/수정하고 유도원 및 작업 구역을 지정한 후 승인하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 투입 정보 요약 */}
            {selectedDeployment && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">장비:</span>{" "}
                    {equipment?.find((e) => e.id === selectedDeployment.equipmentId)?.regNum || "-"}
                  </div>
                  <div>
                    <span className="font-medium">운전자:</span>{" "}
                    {workers?.find((w) => w.id === selectedDeployment.workerId)?.name || "-"}
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
            )}

            {/* 작업 구역 선택 */}
            <div className="grid gap-2">
              <Label htmlFor="approveWorkZoneId">
                작업 구역 (현장명 + GPS) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={approveFormData.workZoneId}
                onValueChange={(value) =>
                  setApproveFormData({ ...approveFormData, workZoneId: value })
                }
              >
                <SelectTrigger id="approveWorkZoneId">
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
              <Label htmlFor="approveGuideWorkerId">유도원 (선택사항)</Label>
              <Select
                value={approveFormData.guideWorkerId || "none"}
                onValueChange={(value) =>
                  setApproveFormData({ ...approveFormData, guideWorkerId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger id="approveGuideWorkerId">
                  <SelectValue placeholder="유도원 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안 함</SelectItem>
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
                  <Label htmlFor="approveWorkType">계약 타입</Label>
                  <Select
                    value={approveFormData.workType}
                    onValueChange={(value) =>
                      setApproveFormData({ ...approveFormData, workType: value })
                    }
                  >
                    <SelectTrigger id="approveWorkType">
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
                    <Label htmlFor="approveDailyRate">일대 단가 (원)</Label>
                    <Input
                      id="approveDailyRate"
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
                    <Label htmlFor="approveMonthlyRate">월대 단가 (원)</Label>
                    <Input
                      id="approveMonthlyRate"
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
                    <Label htmlFor="approveOtRate">OT 단가 (원)</Label>
                    <Input
                      id="approveOtRate"
                      type="number"
                      placeholder="예: 50000"
                      value={approveFormData.otRate}
                      onChange={(e) =>
                        setApproveFormData({ ...approveFormData, otRate: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="approveNightRate">철야 단가 (원)</Label>
                    <Input
                      id="approveNightRate"
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (!selectedDeployment) return;
                approvePendingMutation.mutate({
                  deploymentId: selectedDeployment.id,
                  guideWorkerId: approveFormData.guideWorkerId || undefined,
                  workZoneId: approveFormData.workZoneId || undefined,
                  workType: approveFormData.workType || undefined,
                  dailyRate: approveFormData.dailyRate ? parseFloat(approveFormData.dailyRate) : undefined,
                  monthlyRate: approveFormData.monthlyRate ? parseFloat(approveFormData.monthlyRate) : undefined,
                  otRate: approveFormData.otRate ? parseFloat(approveFormData.otRate) : undefined,
                  nightRate: approveFormData.nightRate ? parseFloat(approveFormData.nightRate) : undefined,
                });
              }}
              disabled={approvePendingMutation.isPending || !approveFormData.workZoneId}
            >
              {approvePendingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 안전점검원 지정 다이얼로그 (EP 전용) */}
      <Dialog open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>안전점검원 {selectedDeployment?.inspectorId ? "변경" : "지정"}</DialogTitle>
            <DialogDescription>
              투입에 안전점검원을 지정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="inspectorId">안전점검원 선택</Label>
              <Select
                value={inspectorFormData.inspectorId}
                onValueChange={(value) =>
                  setInspectorFormData({ ...inspectorFormData, inspectorId: value })
                }
              >
                <SelectTrigger id="inspectorId">
                  <SelectValue placeholder="안전점검원 선택" />
                </SelectTrigger>
                <SelectContent>
                  {inspectors && inspectors.length === 0 ? (
                    <SelectItem value="" disabled>
                      안전점검원이 없습니다. 인력 관리에서 안전점검원을 먼저 생성해주세요.
                    </SelectItem>
                  ) : (
                    inspectors?.map((inspector: any) => (
                      <SelectItem key={inspector.id} value={inspector.id}>
                        {inspector.name} {inspector.licenseNum && `(${inspector.licenseNum})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {inspectors && inspectors.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  안전점검원을 먼저 인력 관리에서 생성해주세요.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInspectorOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAssignInspector}
              disabled={!inspectorFormData.inspectorId || assignInspectorMutation.isPending}
            >
              {assignInspectorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedDeployment?.inspectorId ? "변경" : "지정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
