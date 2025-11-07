import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignaturePad from "@/components/mobile/SignaturePad";
import {
  Loader2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Truck,
  Building2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function WorkJournal() {
  const { user } = useAuth();
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [signerName, setSignerName] = useState(user?.name || "");
  const [rejectReason, setRejectReason] = useState("");

  // 필터 상태
  const [selectedBpCompany, setSelectedBpCompany] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [vehicleNumberSearch, setVehicleNumberSearch] = useState<string>("");

  const [currentTab, setCurrentTab] = useState<string>("daily");
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // BP사 목록 조회 (EP용)
  const { data: bpCompanies } = trpc.companies.list.useQuery(
    { companyType: "bp" },
    { enabled: user?.role === 'ep' }
  );

  // Owner 목록 조회 (EP/BP용)
  const { data: ownersList } = trpc.users.list.useQuery(
    {},
    { enabled: user?.role === 'ep' || user?.role === 'bp' }
  );

  // 장비 목록 조회
  const { data: equipmentList } = trpc.equipment.list.useQuery();

  // 운전자 목록 조회
  const { data: workersList } = trpc.workers.list.useQuery();

  // 역할에 따라 다른 API 호출 (필터 적용)
  const { data: journals, isLoading, refetch } =
    user?.role === 'owner'
      ? trpc.workJournal.ownerList.useQuery({
          status: statusFilter === 'all' ? undefined : statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
      : user?.role === 'bp'
      ? trpc.workJournal.bpList.useQuery({
          status: statusFilter === 'all' ? undefined : statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ownerId: selectedOwner === 'all' ? undefined : selectedOwner,
        })
      : user?.role === 'ep' || user?.role === 'admin'
      ? trpc.workJournal.epList.useQuery({
          bpCompanyId: selectedBpCompany === 'all' ? undefined : selectedBpCompany,
          status: statusFilter === 'all' ? undefined : statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ownerId: selectedOwner === 'all' ? undefined : selectedOwner,
        })
      : trpc.workJournal.bpList.useQuery({
          status: statusFilter === 'all' ? undefined : statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          ownerId: selectedOwner === 'all' ? undefined : selectedOwner,
        });

  // 월별 리포트 조회
  const { data: monthlyReport } =
    user?.role === 'owner'
      ? trpc.workJournal.monthlyReportByOwner.useQuery(
          { yearMonth: selectedYearMonth },
          { enabled: currentTab === 'monthly' }
        )
      : user?.role === 'bp'
      ? trpc.workJournal.monthlyReportByBp.useQuery(
          {
            yearMonth: selectedYearMonth,
            ownerId: selectedOwner === 'all' ? undefined : selectedOwner
          },
          { enabled: currentTab === 'monthly' }
        )
      : user?.role === 'ep' || user?.role === 'admin'
      ? trpc.workJournal.monthlyReportByEp.useQuery(
          {
            yearMonth: selectedYearMonth,
            bpCompanyId: selectedBpCompany === 'all' ? undefined : selectedBpCompany
          },
          { enabled: currentTab === 'monthly' }
        )
      : { data: undefined };

  // Owner 정보가 포함된 journals (deployment join 필요)
  // 클라이언트 사이드에서는 deployment 정보가 없으므로 서버에서 처리 필요
  // 임시로 equipmentId로 owner를 찾는 방법 사용

  // 클라이언트 사이드 필터링 (장비, 운전자, 차량번호)
  // Note: Owner 필터는 서버에서 처리됨
  const filteredJournals = journals?.filter((journal) => {
    // 장비 필터
    if (selectedEquipment !== 'all' && journal.equipmentId !== selectedEquipment) {
      return false;
    }
    // 운전자 필터
    if (selectedWorker !== 'all' && journal.workerId !== selectedWorker) {
      return false;
    }
    // 차량번호 검색
    if (vehicleNumberSearch && !journal.vehicleNumber?.includes(vehicleNumberSearch)) {
      return false;
    }
    return true;
  });

  const pendingJournals = filteredJournals;

  // BP 승인 처리
  const approveMutation = trpc.workJournal.approve.useMutation({
    onSuccess: () => {
      toast.success("작업확인서가 승인되었습니다!");
      setShowApproveDialog(false);
      setSelectedJournal(null);
      setSignatureData("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "승인 처리 중 오류가 발생했습니다");
    }
  });

  // BP 반려 처리
  const rejectMutation = trpc.workJournal.reject.useMutation({
    onSuccess: () => {
      toast.success("작업확인서가 반려되었습니다");
      setShowRejectDialog(false);
      setSelectedJournal(null);
      setRejectReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "반려 처리 중 오류가 발생했습니다");
    }
  });

  const handleApprove = () => {
    if (!signatureData) {
      toast.error("서명을 작성해주세요");
      return;
    }
    if (!signerName) {
      toast.error("서명자 이름을 입력해주세요");
      return;
    }

    approveMutation.mutate({
      id: selectedJournal.id,
      signatureData,
      signerName,
    });
  };

  const handleReject = () => {
    if (!rejectReason) {
      toast.error("반려 사유를 입력해주세요");
      return;
    }

    rejectMutation.mutate({
      id: selectedJournal.id,
      reason: rejectReason,
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "pending_bp") return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">승인 대기</Badge>;
    if (status === "bp_approved") return <Badge variant="default" className="bg-green-100 text-green-700">승인 완료</Badge>;
    if (status === "rejected") return <Badge variant="destructive">반려</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const isOwner = user?.role === 'owner';
  const isBP = user?.role === 'bp';
  const isEP = user?.role === 'ep';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {isOwner ? "작업 확인서 조회" : isEP || isAdmin ? "작업 확인서 관리 (EP)" : "작업 확인서 승인"}
        </h1>
        <p className="text-muted-foreground">
          {isOwner
            ? "소속 기사들의 일일 작업 확인서 및 월별 리포트를 확인합니다."
            : isEP || isAdmin
            ? "협력사별 작업 확인서 및 월별 리포트를 조회합니다."
            : "제출된 일일 작업 확인서를 검토하고 승인합니다."}
        </p>
      </div>

      {/* 필터 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            검색 필터
          </CardTitle>
          <CardDescription>
            상태, 기간, 장비, 운전자, 차량번호로 작업확인서를 검색할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* EP/Admin용: BP사 선택 */}
            {(isEP || isAdmin) && (
              <div className="space-y-2">
                <Label htmlFor="bp-company-filter">협력사 (BP)</Label>
                <Select value={selectedBpCompany} onValueChange={setSelectedBpCompany}>
                  <SelectTrigger id="bp-company-filter">
                    <SelectValue placeholder="협력사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 협력사</SelectItem>
                    {bpCompanies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* EP/BP/Admin용: Owner 선택 */}
            {(isEP || isBP || isAdmin) && (
              <div className="space-y-2">
                <Label htmlFor="owner-filter">장비 임대사업자 (Owner)</Label>
                <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                  <SelectTrigger id="owner-filter">
                    <SelectValue placeholder="Owner 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 Owner</SelectItem>
                    {ownersList
                      ?.filter((u) => u.role?.toLowerCase() === 'owner')
                      .map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name} ({owner.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 상태 필터 */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending_bp">승인 대기</SelectItem>
                  <SelectItem value="bp_approved">승인 완료</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 장비 필터 */}
            <div className="space-y-2">
              <Label htmlFor="equipment-filter">장비</Label>
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger id="equipment-filter">
                  <SelectValue placeholder="장비 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 장비</SelectItem>
                  {equipmentList?.map((equipment) => (
                    <SelectItem key={equipment.id} value={equipment.id}>
                      {equipment.regNum} - {equipment.equipType?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 운전자 필터 */}
            <div className="space-y-2">
              <Label htmlFor="worker-filter">운전자</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger id="worker-filter">
                  <SelectValue placeholder="운전자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 운전자</SelectItem>
                  {workersList?.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} ({worker.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 시작일 */}
            <div className="space-y-2">
              <Label htmlFor="start-date">시작일</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* 종료일 */}
            <div className="space-y-2">
              <Label htmlFor="end-date">종료일</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* 차량번호 검색 */}
            <div className="space-y-2">
              <Label htmlFor="vehicle-search">차량번호</Label>
              <Input
                id="vehicle-search"
                type="text"
                placeholder="예: 12가3456"
                value={vehicleNumberSearch}
                onChange={(e) => setVehicleNumberSearch(e.target.value)}
              />
            </div>

            {/* 필터 초기화 버튼 */}
            <div className="space-y-2 flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setSelectedEquipment('all');
                  setSelectedWorker('all');
                  setVehicleNumberSearch('');
                  if (isEP) setSelectedBpCompany('all');
                  if (isEP || isBP) setSelectedOwner('all');
                }}
                className="w-full"
              >
                필터 초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기존 EP용 BP사 선택 카드 제거됨 (위 필터 카드에 통합) */}
      {false && isEP && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              협력사 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="bp-company-select" className="min-w-[80px]">협력사:</Label>
              <Select value={selectedBpCompany} onValueChange={setSelectedBpCompany}>
                <SelectTrigger id="bp-company-select" className="w-[300px]">
                  <SelectValue placeholder="협력사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 협력사</SelectItem>
                  {bpCompanies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {selectedBpCompany === 'all'
                  ? '모든 협력사의 작업확인서를 조회합니다'
                  : `${bpCompanies?.find(c => c.id === selectedBpCompany)?.name || ''} 작업확인서를 조회합니다`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isOwner ? "작업 확인서" : isEP ? "작업 확인서" : "작업 확인서 승인"}
          </CardTitle>
          <CardDescription>
            일별 목록 또는 월별 정리표로 확인할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="daily">
                📋 일별 목록 ({pendingJournals?.length || 0}건)
              </TabsTrigger>
              <TabsTrigger value="monthly">
                📊 월별 정리표
              </TabsTrigger>
            </TabsList>

            {/* 일별 목록 탭 */}
            <TabsContent value="daily" className="mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : pendingJournals && pendingJournals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>작업일</TableHead>
                    <TableHead>현장명</TableHead>
                    <TableHead>작업자</TableHead>
                    <TableHead>장비명</TableHead>
                    <TableHead>차량번호</TableHead>
                    <TableHead>작업위치</TableHead>
                    <TableHead>작업시간</TableHead>
                    <TableHead className="text-right">일반(h)</TableHead>
                    <TableHead className="text-right">OT(h)</TableHead>
                    <TableHead className="text-right">야간(h)</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingJournals.map((journal: any) => (
                    <TableRow key={journal.id}>
                      <TableCell className="whitespace-nowrap">
                        {journal.workDate
                          ? format(new Date(journal.workDate), "MM/dd", { locale: ko })
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">{journal.siteName || "-"}</TableCell>
                      <TableCell className="font-medium">{journal.worker?.name || journal.workerName || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{journal.equipmentName || journal.equipment_name || "-"}</div>
                          <div className="text-muted-foreground text-xs">{journal.specification || ""}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{journal.vehicleNumber || journal.vehicle_number || "-"}</TableCell>
                      <TableCell>{journal.workLocation || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {journal.startTime && journal.endTime
                          ? `${journal.startTime}~${journal.endTime}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">{journal.regularHours || 0}</TableCell>
                      <TableCell className="text-right">{journal.otHours || 0}</TableCell>
                      <TableCell className="text-right">{journal.nightHours || 0}</TableCell>
                      <TableCell>{getStatusBadge(journal.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => setSelectedJournal(journal)}
                      >
                        상세보기
                      </Button>
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">승인 대기 중인 작업 확인서가 없습니다.</p>
            </div>
          )}
            </TabsContent>

            {/* 월별 정리표 탭 */}
            <TabsContent value="monthly" className="mt-0">
              <div className="space-y-4">
                {/* 월 선택 */}
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Label htmlFor="year-month" className="font-semibold">조회 기간:</Label>
                  <Input
                    id="year-month"
                    type="month"
                    value={selectedYearMonth}
                    onChange={(e) => setSelectedYearMonth(e.target.value)}
                    className="w-[200px]"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedYearMonth && format(new Date(selectedYearMonth + '-01'), 'yyyy년 MM월', { locale: ko })} 작업 정리표
                  </span>
                </div>

                {/* 월별 정리표 */}
                {monthlyReport && monthlyReport.length > 0 ? (
                  <div className="space-y-6">
                    {monthlyReport.map((report: any) => (
                      <Card key={report.deploymentId} className="overflow-hidden">
                        <CardHeader className="bg-blue-50">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {report.siteName || '현장명 미등록'}
                              </CardTitle>
                              <Badge variant="outline" className="text-sm">
                                {report.equipmentRegNum || '-'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">장비:</span>{' '}
                                <span className="font-medium">{report.equipmentName || '-'} {report.specification && `(${report.specification})`}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">운전자:</span>{' '}
                                <span className="font-medium">{report.workerName || '-'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">작업일수:</span>{' '}
                                <span className="font-medium text-blue-600">{report.workDays?.length || 0}일</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="text-center w-[100px]">날짜</TableHead>
                                  <TableHead className="min-w-[200px]">작업내용</TableHead>
                                  <TableHead className="text-center w-[80px]">조출</TableHead>
                                  <TableHead className="text-center w-[80px]">점심OT</TableHead>
                                  <TableHead className="text-center w-[80px]">연장</TableHead>
                                  <TableHead className="text-center w-[80px]">철야</TableHead>
                                  <TableHead className="text-center w-[100px]">확인</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {report.workDays && report.workDays.length > 0 ? (
                                  report.workDays.map((day: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="text-center font-medium">
                                        {day.date && format(new Date(day.date), 'MM/dd (E)', { locale: ko })}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {day.workContent || '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {day.earlyStart ? '○' : '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {day.lunchOt > 0 ? `${day.lunchOt}h` : '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {day.otHours > 0 ? `${day.otHours}h` : '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {day.nightHours > 0 ? `${day.nightHours}h` : '-'}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {day.bpApproved ? (
                                          <Badge variant="default" className="bg-green-100 text-green-700">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            승인
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary">대기</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                      해당 월에 작업 기록이 없습니다
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                        <CardContent className="bg-gray-50 border-t">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">총 작업일:</span>{' '}
                              <span className="font-bold text-lg">{report.workDays?.length || 0}</span>일
                            </div>
                            <div>
                              <span className="text-muted-foreground">총 연장:</span>{' '}
                              <span className="font-bold text-lg text-orange-600">
                                {report.workDays?.reduce((sum: number, d: any) => sum + (d.otHours || 0), 0) || 0}
                              </span>h
                            </div>
                            <div>
                              <span className="text-muted-foreground">총 철야:</span>{' '}
                              <span className="font-bold text-lg text-purple-600">
                                {report.workDays?.reduce((sum: number, d: any) => sum + (d.nightHours || 0), 0) || 0}
                              </span>h
                            </div>
                            <div>
                              <span className="text-muted-foreground">승인 완료:</span>{' '}
                              <span className="font-bold text-lg text-green-600">
                                {report.workDays?.filter((d: any) => d.bpApproved).length || 0}
                              </span>/{report.workDays?.length || 0}일
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      선택한 기간에 작업 기록이 없습니다
                    </p>
                    <p className="text-sm text-muted-foreground">
                      다른 기간을 선택하거나 일별 목록을 확인해주세요
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 상세보기 다이얼로그 */}
      {selectedJournal && (
        <Dialog open={!!selectedJournal} onOpenChange={(open) => !open && setSelectedJournal(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">작업 확인서 상세</DialogTitle>
              <DialogDescription>
                {selectedJournal.workDate
                  ? format(new Date(selectedJournal.workDate), "yyyy년 MM월 dd일 작업", { locale: ko })
                  : "작업 확인서"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    현장명
                  </Label>
                  <p className="font-medium">{selectedJournal.siteName || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    기사명 (소속)
                  </Label>
                  <p className="font-medium">{selectedJournal.worker?.name || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    차량번호
                  </Label>
                  <p className="font-medium">{selectedJournal.vehicleNumber || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    장비명
                  </Label>
                  <p className="font-medium">{selectedJournal.equipmentName || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    규격
                  </Label>
                  <p className="font-medium">{selectedJournal.specification || "-"}</p>
                </div>
              </div>

              {/* 작업 정보 */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-lg">작업 정보</h3>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    작업 위치
                  </Label>
                  <p className="font-medium">{selectedJournal.workLocation || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    작업 내용
                  </Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="whitespace-pre-wrap">{selectedJournal.workContent || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 시간 정보 */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-lg">작업 시간</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">시작 시간</Label>
                    <p className="font-medium text-lg">{selectedJournal.startTime || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">종료 시간</Label>
                    <p className="font-medium text-lg">{selectedJournal.endTime || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <Label className="text-sm text-muted-foreground">일반 근무</Label>
                    <p className="text-2xl font-bold text-blue-600">{selectedJournal.regularHours || 0}시간</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-sm text-muted-foreground">OT</Label>
                    <p className="text-2xl font-bold text-orange-600">{selectedJournal.otHours || 0}시간</p>
                  </div>
                  <div className="text-center">
                    <Label className="text-sm text-muted-foreground">철야</Label>
                    <p className="text-2xl font-bold text-purple-600">{selectedJournal.nightHours || 0}시간</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedJournal(null)}
              >
                닫기
              </Button>
              {isBP && selectedJournal.status === 'pending_bp' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowRejectDialog(true);
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    반려
                  </Button>
                  <Button
                    onClick={() => {
                      setShowApproveDialog(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    승인
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 승인 다이얼로그 (서명) */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>작업 확인서 승인</DialogTitle>
            <DialogDescription>
              전자서명을 작성하여 작업 확인서를 승인합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">서명자 이름 *</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="서명자 이름을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label>전자 서명 *</Label>
              <SignaturePad
                onSave={(data) => setSignatureData(data)}
                onClear={() => setSignatureData("")}
              />
              {signatureData && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  서명이 저장되었습니다
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">승인 안내</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• 서명 후 승인하면 수정할 수 없습니다</li>
                  <li>• 승인된 작업확인서는 자동으로 월별 리포트에 반영됩니다</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!signatureData || !signerName || approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  승인 처리 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인 완료
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작업 확인서 반려</DialogTitle>
            <DialogDescription>
              반려 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">반려 사유 *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 상세히 입력해주세요"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
