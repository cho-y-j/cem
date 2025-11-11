import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, MapPin, Clock, Users, Calendar, RefreshCw, Search, Download, Filter, X, ListChecks, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CheckInMonitoring() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bpCompanyId, setBpCompanyId] = useState<string | undefined>(undefined);
  const [ownerCompanyId, setOwnerCompanyId] = useState<string | undefined>(undefined);
  const [workerTypeId, setWorkerTypeId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("expected"); // "expected" or "checkins"

  // 사용자 정보 가져오기
  const { user } = useAuth();

  // 회사 목록 조회
  const { data: bpCompanies = [] } = trpc.companies.listByType.useQuery({ companyType: "bp" });
  const { data: ownerCompanies = [] } = trpc.companies.listByType.useQuery({ companyType: "owner" });

  // 사용자 종류 목록 조회
  const { data: workerTypes = [] } = trpc.workerTypes.list.useQuery();

  // 날짜 범위 계산
  const startDate = dateFilter ? new Date(dateFilter).toISOString() : undefined;
  const endDate = dateFilter ? new Date(new Date(dateFilter).setDate(new Date(dateFilter).getDate() + 1)).toISOString() : undefined;

  // 출근 기록 조회 (필터 적용)
  const { data: checkIns = [], refetch, isLoading } = trpc.checkIn.list.useQuery({
    bpCompanyId: bpCompanyId || undefined,
    ownerCompanyId: ownerCompanyId || undefined,
    workerTypeId: workerTypeId || undefined,
    workerName: searchQuery || undefined,
    startDate,
    endDate,
    limit: 100,
  });

  // 오늘 출근 통계 (사용자 역할에 따라 필터링 적용)
  const { data: todayStats } = trpc.checkIn.getTodayStats.useQuery(undefined, {
    // Admin은 전체 조회, EP/BP/Owner는 자신과 관련된 데이터만 조회
  });

  // 출근 기록 삭제 (테스트용)
  const deleteCheckInMutation = trpc.checkIn.delete.useMutation({
    onSuccess: () => {
      toast.success("출근 기록이 삭제되었습니다.");
      refetch();
    },
    onError: (error) => {
      toast.error("출근 기록 삭제 실패: " + error.message);
    },
  });

  const handleDeleteCheckIn = (checkInId: string) => {
    if (confirm("이 출근 기록을 삭제하시겠습니까?\n(테스트를 위해 삭제합니다)")) {
      deleteCheckInMutation.mutate({
        checkInId,
        deleteToday: false,
      });
    }
  };

  // 디버깅: 출근 통계 로그
  console.log('[CheckInMonitoring] Today stats:', todayStats);
  console.log('[CheckInMonitoring] Expected workers list:', todayStats?.expectedWorkersList);
  console.log('[CheckInMonitoring] Date filter:', dateFilter);
  console.log('[CheckInMonitoring] Is today?', dateFilter === format(new Date(), "yyyy-MM-dd"));

  // 필터링된 출근 기록 (클라이언트 측 추가 필터링)
  const filteredCheckIns = useMemo(() => {
    return checkIns.filter((checkIn) => {
      // 이름 검색은 서버에서 처리되지만, 추가 필터링 가능
      return true;
    });
  }, [checkIns]);

  const formatTime = (dateStr: string | Date) => {
    // UTC 시간을 한국 시간(KST, UTC+9)으로 변환
    try {
      const date = new Date(dateStr);
      
      // UTC 시간에 9시간 추가 (한국 시간)
      const kstTime = date.getTime() + 9 * 60 * 60 * 1000;
      const kstDate = new Date(kstTime);
      
      // 한국 시간으로 포맷팅 (UTC 기준이 아닌 로컬 시간 기준)
      const hours = kstDate.getUTCHours().toString().padStart(2, '0');
      const minutes = kstDate.getUTCMinutes().toString().padStart(2, '0');
      
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('[CheckInMonitoring] formatTime error:', error, dateStr);
      return String(dateStr);
    }
  };

  const formatDate = (dateStr: string | Date) => {
    return format(new Date(dateStr), "yyyy년 MM월 dd일 (EEE)", { locale: ko });
  };

  // 필터 초기화
  const resetFilters = () => {
    setSearchQuery("");
    setBpCompanyId(undefined);
    setOwnerCompanyId(undefined);
    setWorkerTypeId(undefined);
  };

  // 활성 필터 개수
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (bpCompanyId) count++;
    if (ownerCompanyId) count++;
    if (workerTypeId) count++;
    return count;
  }, [searchQuery, bpCompanyId, ownerCompanyId, workerTypeId]);

  // 엑셀 다운로드
  const handleExportToExcel = async () => {
    try {
      const result = await trpc.checkIn.exportToExcel.query({
        startDate,
        endDate,
      });

      // Base64를 Blob으로 변환
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      // removeChild 전에 부모 노드 확인
      if (link.parentNode === document.body) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast.success("엑셀 파일이 다운로드되었습니다");
    } catch (error: any) {
      toast.error(error.message || "엑셀 다운로드에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">출근 현황</h1>
          <p className="text-muted-foreground">
            작업자의 GPS 기반 출근 체크 현황을 모니터링합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportToExcel}
          >
            <Download className="mr-2 h-4 w-4" />
            엑셀 다운로드
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">필터</CardTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}개 활성
                </Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                필터 초기화
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* 날짜 선택 */}
            <div className="space-y-2">
              <Label>날짜</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* 이름 검색 */}
            <div className="space-y-2">
              <Label>이름 검색</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="작업자 이름..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* BP 회사 필터 */}
            <div className="space-y-2">
              <Label>BP 회사</Label>
              <Select value={bpCompanyId || "all"} onValueChange={(value) => setBpCompanyId(value === "all" ? undefined : value)}>
                <SelectTrigger>
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

            {/* Owner 회사 필터 */}
            <div className="space-y-2">
              <Label>Owner 회사</Label>
              <Select value={ownerCompanyId || "all"} onValueChange={(value) => setOwnerCompanyId(value === "all" ? undefined : value)}>
                <SelectTrigger>
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

            {/* 사용자 종류 필터 */}
            <div className="space-y-2">
              <Label>사용자 종류</Label>
              <Select value={workerTypeId || "all"} onValueChange={(value) => setWorkerTypeId(value === "all" ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {workerTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* 출근율 */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">출근율</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">
              {todayStats?.total || 0}/{todayStats?.expectedWorkers || 0}명
            </div>
            <p className="text-xs text-indigo-700 font-semibold">
              {todayStats?.attendanceRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 출근자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.total || 0}명</div>
            <p className="text-xs text-muted-foreground">
              {formatDate(new Date())}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">구역 내 출근</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayStats?.withinZone || 0}명</div>
            <p className="text-xs text-muted-foreground">
              {todayStats?.total ? Math.round((todayStats.withinZone / todayStats.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">구역 외 출근</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{todayStats?.outsideZone || 0}명</div>
            <p className="text-xs text-muted-foreground">
              {todayStats?.total ? Math.round((todayStats.outsideZone / todayStats.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">생체 인증</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayStats?.withWebauthn || 0}명</div>
            <p className="text-xs text-muted-foreground">
              지문/얼굴 인식 출근
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 시간대별 분포 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시간대별 분포</CardTitle>
            <CardDescription>오전/오후 출근 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">오전 (00:00 ~ 11:59)</span>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {todayStats?.morning || 0}명
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">오후 (12:00 ~ 23:59)</span>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {todayStats?.afternoon || 0}명
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">인증 방법</CardTitle>
            <CardDescription>출근 체크 인증 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">PIN 인증</span>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {todayStats?.total || 0}명
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">생체 인증 (WebAuthn)</span>
                </div>
                <Badge variant="outline" className="text-base px-3 py-1">
                  준비 중
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 출근 대상 목록과 출근 기록 (탭 방식) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expected" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            출근 대상 목록
          </TabsTrigger>
          <TabsTrigger value="checkins" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            출근 기록
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expected" className="mt-4">
          {/* 출근 대상 목록 (오늘 날짜일 때만 표시) */}
          {dateFilter === format(new Date(), "yyyy-MM-dd") ? (
            todayStats?.expectedWorkersList && todayStats.expectedWorkersList.length > 0 ? (
              <Card>
              <CardHeader>
                <CardTitle>출근 대상 목록</CardTitle>
                <CardDescription>
                  오늘 출근해야 하는 작업자 목록 ({todayStats.expectedWorkersList.length}명)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {todayStats.expectedWorkersList.map((worker: any, index: number) => (
                    <div
                      key={worker.workerId || index}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                        worker.hasCheckedIn 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                          worker.hasCheckedIn ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {worker.hasCheckedIn ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {worker.workerName || worker.userName || `작업자 ${worker.workerId}`}
                            {worker.workerType && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                {worker.workerType.name}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                            {worker.deployment?.epCompany?.name && (
                              <span className="truncate">
                                EP: {worker.deployment.epCompany.name}
                              </span>
                            )}
                            {worker.deployment?.bpCompany?.name && (
                              <span className="truncate">
                                BP: {worker.deployment.bpCompany.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {worker.hasCheckedIn ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            완료
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            대기
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>출근 대상 목록</CardTitle>
                <CardDescription>
                  오늘 출근 대상이 없습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {todayStats?.expectedWorkers === 0 
                      ? "출근 대상이 없습니다. 활성 deployment와 work zone을 확인해주세요." 
                      : "출근 대상 목록을 불러오는 중..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>출근 대상 목록</CardTitle>
              <CardDescription>
                출근 대상 목록은 오늘 날짜에서만 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  오늘 날짜를 선택해주세요
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        </TabsContent>

        <TabsContent value="checkins" className="mt-4">
          {/* 출근 기록 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>출근 기록</CardTitle>
            <CardDescription>
              {dateFilter === format(new Date(), "yyyy-MM-dd") 
                ? `오늘 출근한 작업자 목록` 
                : `${dateFilter} 출근한 작업자 목록`} ({filteredCheckIns.length}명)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCheckIns.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">아직 출근한 작업자가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredCheckIns.map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {(checkIn as any).worker?.name || (checkIn as any).user?.name || `작업자 ${checkIn.userId}`}
                          {(checkIn as any).worker?.workerType?.name && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {(checkIn as any).worker.workerType.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(checkIn.checkInTime)}
                          </span>
                          {(checkIn as any).workZone?.name && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3" />
                              {(checkIn as any).workZone.name}
                            </span>
                          )}
                          {checkIn.distanceFromZone !== null && checkIn.distanceFromZone !== undefined && (
                            <span className="text-xs">
                              ({checkIn.distanceFromZone}m)
                            </span>
                          )}
                          {(checkIn as any).deployment?.bpCompany?.name && (
                            <span className="text-xs truncate">
                              BP: {(checkIn as any).deployment.bpCompany.name}
                            </span>
                          )}
                          {(checkIn as any).deployment?.epCompany?.name && (
                            <span className="text-xs truncate">
                              EP: {(checkIn as any).deployment.epCompany.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {checkIn.isWithinZone ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          구역 내
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">
                          <XCircle className="mr-1 h-3 w-3" />
                          구역 외
                        </Badge>
                      )}
                      {checkIn.webauthnVerified && (
                        <Badge variant="outline" className="border-blue-200 text-blue-700 text-xs">
                          생체
                        </Badge>
                      )}
                      {/* 삭제 버튼 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteCheckIn(checkIn.id)}
                        disabled={deleteCheckInMutation.isPending}
                        title="출근 기록 삭제 (테스트용)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
