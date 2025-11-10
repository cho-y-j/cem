import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { MapPin, Loader2, AlertCircle, Filter, X, Route, BarChart3, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// 작업 상태별 색상
const getStatusColor = (status: string | undefined): string => {
  switch (status) {
    case 'working':
      return "#10B981"; // 초록색 (작업중)
    case 'break':
      return "#F59E0B"; // 노란색 (휴식중)
    case 'overtime':
      return "#3B82F6"; // 파란색 (연장작업)
    case 'completed':
      return "#9CA3AF"; // 회색 (작업종료)
    default:
      return "#6B7280"; // 회색 (상태 없음)
  }
};

// 차종별 모양 (차종 ID 기반)
const getMarkerShape = (equipmentTypeId: string | undefined): google.maps.SymbolPath => {
  if (typeof google === 'undefined' || !google.maps) {
    // 기본값 반환 (실제로는 사용되지 않음)
    return 0 as google.maps.SymbolPath;
  }
  
  if (!equipmentTypeId) return google.maps.SymbolPath.CIRCLE;
  
  // 차종 ID를 숫자로 변환하여 모양 결정
  let hash = 0;
  for (let i = 0; i < equipmentTypeId.length; i++) {
    hash = equipmentTypeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 4;
  
  switch (index) {
    case 0:
      return google.maps.SymbolPath.CIRCLE; // 원형
    case 1:
      return google.maps.SymbolPath.BACKWARD_CLOSED_ARROW; // 삼각형 (화살표)
    case 2:
      return google.maps.SymbolPath.FORWARD_CLOSED_ARROW; // 역삼각형
    case 3:
      return google.maps.SymbolPath.CIRCLE; // 원형 (다시)
    default:
      return google.maps.SymbolPath.CIRCLE;
  }
};

// 마커 아이콘 생성 (작업 상태별 색상 + 차종별 모양)
const createMarkerIcon = (status: string | undefined, equipmentTypeId: string | undefined) => {
  if (typeof google === 'undefined' || !google.maps) {
    return undefined;
  }
  
  const color = getStatusColor(status);
  const shape = getMarkerShape(equipmentTypeId);
  
  return {
    path: shape,
    scale: 10,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#FFFFFF",
    strokeWeight: 2,
  };
};

// Polyline 컴포넌트 (useMap 훅 사용)
function PolylineComponent({
  path,
  strokeColor = "#FF0000",
  strokeOpacity = 0.8,
  strokeWeight = 3,
}: {
  path: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !path || path.length < 2) return;

    // 기존 Polyline 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    try {
      // 새 Polyline 생성
      const polyline = new google.maps.Polyline({
        map,
        path: path.map((p) => ({ lat: p.lat, lng: p.lng })),
        strokeColor,
        strokeOpacity,
        strokeWeight,
        geodesic: true,
      });

      polylineRef.current = polyline;
    } catch (error) {
      console.error("[Polyline] Error creating polyline:", error);
    }

    // cleanup
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, path, strokeColor, strokeOpacity, strokeWeight]);

  return null;
}

export default function LocationTracking() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 필터 상태
  const [filters, setFilters] = useState<{
    ownerCompanyId?: string;
    bpCompanyId?: string;
    epCompanyId?: string;
    vehicleNumber?: string;
    equipmentTypeId?: string;
    workerId?: string;
  }>({});

  const userRole = user?.role?.toLowerCase() || "";
  const isOwner = userRole === "owner";
  const isBp = userRole === "bp";
  const isEp = userRole === "ep";
  const isAdmin = userRole === "admin";

  // 회사 목록 조회
  const { data: ownerCompanies } = trpc.companies.list.useQuery(
    { companyType: "owner" },
    { enabled: (isBp || isEp || isAdmin) && (filters.ownerCompanyId === undefined || filters.ownerCompanyId !== "") }
  );
  
  const { data: bpCompanies } = trpc.companies.list.useQuery(
    { companyType: "bp" },
    { enabled: isEp && (filters.bpCompanyId === undefined || filters.bpCompanyId !== "") }
  );

  const { data: epCompanies } = trpc.companies.list.useQuery(
    { companyType: "ep" },
    { enabled: (isBp || isAdmin) && (filters.epCompanyId === undefined || filters.epCompanyId !== "") }
  );

  // 장비 타입 목록 조회 (차종별 필터용)
  const { data: equipmentTypes } = trpc.equipTypes.list.useQuery(undefined, {
    enabled: filters.equipmentTypeId !== undefined || isAdmin || isBp || isEp,
  });

  // 운전자 목록 조회 (운전자별 필터용)
  const { data: workers } = trpc.workers.list.useQuery(undefined, {
    enabled: filters.workerId !== undefined || isAdmin || isBp || isEp,
  });

  // 이동 동선 분석 상태
  const [activeTab, setActiveTab] = useState<"realtime" | "analysis">("realtime");
  const [analysisWorkerId, setAnalysisWorkerId] = useState<string>("");
  const [analysisStartDate, setAnalysisStartDate] = useState<string>(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [analysisEndDate, setAnalysisEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // 이동 동선 분석 조회
  const { data: analysisData, isLoading: isAnalyzing } = trpc.location.analyzeHistory.useQuery(
    {
      workerId: analysisWorkerId,
      startDate: new Date(analysisStartDate),
      endDate: new Date(analysisEndDate + "T23:59:59"),
    },
    {
      enabled: !!analysisWorkerId && analysisStartDate && analysisEndDate,
    }
  );

  // 모든 활성 위치 조회 (필터 포함)
  const { data: locationData, isLoading, refetch } = trpc.location.getAllActive.useQuery(filters);
  const locations = locationData?.locations || [];
  const expectedWorkers = locationData?.expectedWorkers || 0;

  // 10초마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // 10초

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refetch]);

  // 마커 데이터 생성
  const markers = locations?.map((loc: any) => {
    const deployment = loc.deployment;
    const ownerCompanyName = deployment?.equipment?.ownerCompanies?.name || "";
    const bpCompanyName = deployment?.bpCompanies?.name || "";
    const epCompanyName = deployment?.epCompanies?.name || "";
    
    // worker 정보: deployment의 worker 또는 location의 workers
    const workerName = deployment?.worker?.name || loc.workers?.name || loc.worker?.name || "미배정";
    
    // equipment 정보: deployment의 equipment 또는 location의 equipment
    const equipment = deployment?.equipment || loc.equipment;
    const vehicleNumber = equipment?.reg_num || equipment?.regNum || "미배정";
    const equipmentTypeName = equipment?.equip_types?.name || equipment?.equipTypes?.name || "미지정";
    const equipmentTypeId = equipment?.equip_type_id || equipment?.equipTypeId;
    
    // 작업 상태 정보
    const workStatus = loc.workSession?.status || loc.work_session?.status;
    const statusLabel = workStatus === 'working' ? '작업중' : 
                       workStatus === 'break' ? '휴식중' : 
                       workStatus === 'overtime' ? '연장작업' : 
                       workStatus === 'completed' ? '작업종료' : '상태없음';
    
    return {
      id: loc.id,
      position: {
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
      },
      title: `${workerName} - ${vehicleNumber}`,
      workerName,
      vehicleNumber,
      equipmentTypeName,
      equipmentTypeId,
      workStatus,
      statusLabel,
      workerId: loc.worker_id || loc.workerId,
      info: `
        <div style="min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${workerName}</h3>
          <div style="font-size: 14px; line-height: 1.6;">
            <p><strong>운전자:</strong> ${workerName}</p>
            <p><strong>차량번호:</strong> ${vehicleNumber}</p>
            <p><strong>차종:</strong> ${equipmentTypeName}</p>
            <p><strong>작업상태:</strong> ${statusLabel}</p>
            ${loc.checkInTime ? `<p><strong>출근:</strong> ${new Date(loc.checkInTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</p>` : ""}
            <p><strong>마지막 업데이트:</strong> ${new Date(loc.logged_at || loc.loggedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</p>
            ${ownerCompanyName ? `<p><strong>오너사:</strong> ${ownerCompanyName}</p>` : ""}
            ${bpCompanyName ? `<p><strong>BP:</strong> ${bpCompanyName}</p>` : ""}
            ${epCompanyName ? `<p><strong>EP:</strong> ${epCompanyName}</p>` : ""}
            <p><strong>정확도:</strong> ${loc.accuracy ? `${Math.round(parseFloat(loc.accuracy))}m` : "N/A"}</p>
          </div>
        </div>
      `,
    };
  }) || [];

  // 필터 초기화
  const clearFilters = () => {
    setFilters({});
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" || value === "all" ? undefined : value,
    }));
  };

  // 중심 좌표 계산 (모든 마커의 평균)
  const center = markers.length > 0
    ? {
        lat: markers.reduce((sum, m) => sum + m.position.lat, 0) / markers.length,
        lng: markers.reduce((sum, m) => sum + m.position.lng, 0) / markers.length,
      }
    : { lat: 37.5665, lng: 126.9780 }; // 서울 기본 좌표

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">위치 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 분석용 경로 데이터
  const analysisPath = analysisData?.path.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    timestamp: p.timestamp,
  })) || [];

  // 분석용 마커 (시작점, 종료점, 체류 지점)
  const analysisMarkers: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    info?: string;
  }> = [];

  if (analysisData && analysisData.path.length > 0) {
    const startPoint = analysisData.path[0];
    analysisMarkers.push({
      id: "start",
      position: { lat: startPoint.lat, lng: startPoint.lng },
      title: "시작점",
      info: `시작 시간: ${startPoint.timestamp.toLocaleString("ko-KR")}`,
    });

    const endPoint = analysisData.path[analysisData.path.length - 1];
    analysisMarkers.push({
      id: "end",
      position: { lat: endPoint.lat, lng: endPoint.lng },
      title: "종료점",
      info: `종료 시간: ${endPoint.timestamp.toLocaleString("ko-KR")}`,
    });

    analysisData.stayPoints.forEach((stay, index) => {
      analysisMarkers.push({
        id: `stay-${index}`,
        position: { lat: stay.lat, lng: stay.lng },
        title: `체류 지점 ${index + 1}`,
        info: `
          <div style="min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 8px;">체류 지점 ${index + 1}</h3>
            <div style="font-size: 14px; line-height: 1.6;">
              <p><strong>시작:</strong> ${stay.startTime.toLocaleString("ko-KR")}</p>
              <p><strong>종료:</strong> ${stay.endTime.toLocaleString("ko-KR")}</p>
              <p><strong>체류 시간:</strong> ${Math.floor(stay.duration / 60)}분 ${stay.duration % 60}초</p>
            </div>
          </div>
        `,
      });
    });
  }

  const analysisCenter = analysisPath.length > 0
    ? {
        lat: analysisPath.reduce((sum, p) => sum + p.lat, 0) / analysisPath.length,
        lng: analysisPath.reduce((sum, p) => sum + p.lng, 0) / analysisPath.length,
      }
    : center;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">위치 추적</h1>
          <p className="text-muted-foreground mt-1">
            실시간 위치 추적 및 이동 동선 분석
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="text-sm">
              {markers.length}개 활성 위치
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              대상: {expectedWorkers}명
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "realtime" | "analysis")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="realtime">
            <MapPin className="h-4 w-4 mr-2" />
            실시간 위치
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Route className="h-4 w-4 mr-2" />
            이동 동선 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-6">

      {/* 필터 섹션 */}
      {(isAdmin || isBp || isEp || (!isOwner && Object.keys(filters).length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              필터
            </CardTitle>
            <CardDescription>
              조건에 따라 위치를 필터링할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Owner 필터 (BP, EP, Admin만) */}
              {(isBp || isEp || isAdmin) && (
                <div className="space-y-2">
                  <Label htmlFor="ownerCompanyFilter">오너사 (Owner)</Label>
                  <Select
                    value={filters.ownerCompanyId || "all"}
                    onValueChange={(value) => handleFilterChange("ownerCompanyId", value)}
                  >
                    <SelectTrigger id="ownerCompanyFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {ownerCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* BP 필터 (EP만) */}
              {isEp && (
                <div className="space-y-2">
                  <Label htmlFor="bpCompanyFilter">BP (협력사)</Label>
                  <Select
                    value={filters.bpCompanyId || "all"}
                    onValueChange={(value) => handleFilterChange("bpCompanyId", value)}
                  >
                    <SelectTrigger id="bpCompanyFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {bpCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* EP 필터 (BP, Admin만) */}
              {(isBp || isAdmin) && (
                <div className="space-y-2">
                  <Label htmlFor="epCompanyFilter">EP (시행사)</Label>
                  <Select
                    value={filters.epCompanyId || "all"}
                    onValueChange={(value) => handleFilterChange("epCompanyId", value)}
                  >
                    <SelectTrigger id="epCompanyFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {epCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 차종별 필터 */}
              {(isAdmin || isBp || isEp) && (
                <div className="space-y-2">
                  <Label htmlFor="equipmentTypeFilter">차종</Label>
                  <Select
                    value={filters.equipmentTypeId || "all"}
                    onValueChange={(value) => handleFilterChange("equipmentTypeId", value)}
                  >
                    <SelectTrigger id="equipmentTypeFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {equipmentTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 차량번호 검색 (모든 권한) */}
              <div className="space-y-2">
                <Label htmlFor="vehicleNumberFilter">차량번호 검색</Label>
                <div className="flex gap-2">
                  <Input
                    id="vehicleNumberFilter"
                    placeholder="차량번호 뒷자리 입력"
                    value={filters.vehicleNumber || ""}
                    onChange={(e) => handleFilterChange("vehicleNumber", e.target.value)}
                  />
                  {filters.vehicleNumber && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFilterChange("vehicleNumber", "")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 필터 초기화 버튼 */}
              {Object.keys(filters).some((key) => filters[key as keyof typeof filters]) && (
                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    필터 초기화
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>실시간 지도</CardTitle>
          <CardDescription>
            지도의 마커를 클릭하면 상세 정보를 확인할 수 있습니다. (10초마다 자동 새로고침)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
            {GOOGLE_MAPS_API_KEY ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                  defaultCenter={center}
                  defaultZoom={markers.length === 1 ? 15 : 12}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  style={{ width: "100%", height: "100%" }}
                >
                  {markers.map((marker) => {
                    // 작업 상태별 색상 + 차종별 모양 아이콘 생성
                    const icon = typeof google !== 'undefined' && google.maps
                      ? createMarkerIcon(marker.workStatus, marker.equipmentTypeId)
                      : undefined;
                    
                    return (
                      <Marker
                        key={marker.id}
                        position={marker.position}
                        title={marker.title}
                        icon={icon}
                      />
                    );
                  })}
                </Map>
                {markers.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <div className="text-center p-6">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">활성 위치가 없습니다</h3>
                      <p className="text-muted-foreground">
                        현재 작업 중인 장비 또는 인력이 없거나,<br />
                        최근 10분 이내 위치 정보가 전송되지 않았습니다.
                      </p>
                    </div>
                  </div>
                )}
              </APIProvider>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
                <div className="text-center">
                  <p className="text-red-600 font-medium">Google Maps API 키가 설정되지 않았습니다.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 위치 목록 */}
      {markers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>위치 목록</CardTitle>
            <CardDescription>
              현재 추적 중인 모든 위치 정보
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locations?.map((loc: any) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{loc.workers?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        장비: {loc.equipment?.reg_num || "미배정"}
                      </p>
                      {loc.deployment && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {loc.deployment.equipment?.ownerCompanies?.name && (
                            <span>오너사: {loc.deployment.equipment.ownerCompanies.name}</span>
                          )}
                          {loc.deployment.bpCompanies?.name && (
                            <span className="ml-2">BP: {loc.deployment.bpCompanies.name}</span>
                          )}
                          {loc.deployment.epCompanies?.name && (
                            <span className="ml-2">EP: {loc.deployment.epCompanies.name}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {parseFloat(loc.latitude).toFixed(6)}, {parseFloat(loc.longitude).toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(loc.logged_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                이동 동선 분석
              </CardTitle>
              <CardDescription>
                특정 운전자의 이동 경로를 분석하고 시각화합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="analysisWorker">운전자 선택</Label>
                  <Select value={analysisWorkerId} onValueChange={setAnalysisWorkerId}>
                    <SelectTrigger id="analysisWorker">
                      <SelectValue placeholder="운전자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {workers?.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysisStartDate">시작 날짜</Label>
                  <Input
                    id="analysisStartDate"
                    type="date"
                    value={analysisStartDate}
                    onChange={(e) => setAnalysisStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analysisEndDate">종료 날짜</Label>
                  <Input
                    id="analysisEndDate"
                    type="date"
                    value={analysisEndDate}
                    onChange={(e) => setAnalysisEndDate(e.target.value)}
                  />
                </div>
              </div>

              {isAnalyzing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">분석 중...</span>
                </div>
              )}

              {analysisData && analysisWorkerId && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">총 이동 거리</p>
                          <p className="text-2xl font-bold mt-2">
                            {(analysisData.totalDistance / 1000).toFixed(2)} km
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">평균 속도</p>
                          <p className="text-2xl font-bold mt-2">
                            {analysisData.averageSpeed.toFixed(1)} km/h
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">최대 속도</p>
                          <p className="text-2xl font-bold mt-2">
                            {analysisData.maxSpeed.toFixed(1)} km/h
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">총 시간</p>
                          <p className="text-2xl font-bold mt-2">
                            {Math.floor(analysisData.totalTime / 3600)}시간 {Math.floor((analysisData.totalTime % 3600) / 60)}분
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {analysisPath.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>이동 경로</CardTitle>
                        <CardDescription>
                          빨간 선은 이동 경로를, 마커는 시작점/종료점/체류 지점을 표시합니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full h-[600px] rounded-lg overflow-hidden">
                          {GOOGLE_MAPS_API_KEY ? (
                            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                              <Map
                                defaultCenter={analysisCenter}
                                defaultZoom={13}
                                gestureHandling="greedy"
                                disableDefaultUI={false}
                                style={{ width: "100%", height: "100%" }}
                              >
                                {/* 이동 경로 Polyline */}
                                {analysisPath.length > 0 && (
                                  <PolylineComponent
                                    path={analysisPath.map((p) => ({ lat: p.lat, lng: p.lng }))}
                                    strokeColor="#FF0000"
                                    strokeOpacity={0.8}
                                    strokeWeight={3}
                                  />
                                )}
                                {/* 마커들 */}
                                {analysisMarkers.map((marker) => (
                                  <Marker
                                    key={marker.id}
                                    position={marker.position}
                                    title={marker.title}
                                  />
                                ))}
                              </Map>
                            </APIProvider>
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
                              <div className="text-center">
                                <p className="text-red-600 font-medium">Google Maps API 키가 설정되지 않았습니다.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analysisData.stayPoints.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>체류 지점</CardTitle>
                        <CardDescription>일정 시간 이상 머문 위치 목록</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analysisData.stayPoints.map((stay, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <p className="font-medium">체류 지점 {index + 1}</p>
                                <p className="text-sm text-muted-foreground">
                                  {stay.startTime.toLocaleString("ko-KR")} ~ {stay.endTime.toLocaleString("ko-KR")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  좌표: {stay.lat.toFixed(6)}, {stay.lng.toFixed(6)}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {Math.floor(stay.duration / 60)}분 {stay.duration % 60}초
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {analysisPath.length === 0 && (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">위치 이력이 없습니다</h3>
                          <p className="text-muted-foreground">
                            선택한 기간 동안 위치 정보가 기록되지 않았습니다.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {!analysisWorkerId && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">운전자를 선택해주세요</h3>
                      <p className="text-muted-foreground">
                        분석할 운전자와 기간을 선택하면 이동 동선을 확인할 수 있습니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

