import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import GoogleMap from "@/components/GoogleMap";
import { MapPin, Loader2, AlertCircle, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LocationTracking() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 필터 상태
  const [filters, setFilters] = useState<{
    ownerCompanyId?: string;
    bpCompanyId?: string;
    epCompanyId?: string;
    vehicleNumber?: string;
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

  // 모든 활성 위치 조회 (필터 포함)
  const { data: locations, isLoading, refetch } = trpc.location.getAllActive.useQuery(filters);

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
    
    return {
      id: loc.id,
      position: {
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
      },
      title: loc.workers?.name || `Worker ${loc.worker_id}`,
      info: `
        <strong>${loc.workers?.name || "Unknown"}</strong><br/>
        장비: ${loc.equipment?.reg_num || "미배정"}<br/>
        ${ownerCompanyName ? `오너사: ${ownerCompanyName}<br/>` : ""}
        ${bpCompanyName ? `BP: ${bpCompanyName}<br/>` : ""}
        ${epCompanyName ? `EP: ${epCompanyName}<br/>` : ""}
        시간: ${new Date(loc.logged_at).toLocaleString("ko-KR")}<br/>
        정확도: ${loc.accuracy ? `${Math.round(parseFloat(loc.accuracy))}m` : "N/A"}
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
      [key]: value === "" ? undefined : value,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">실시간 위치 추적</h1>
          <p className="text-muted-foreground mt-1">
            작업 중인 장비 및 인력의 실시간 위치를 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <Badge variant="outline" className="text-sm">
            {markers.length}개 활성 위치
          </Badge>
        </div>
      </div>

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
                    value={filters.ownerCompanyId || ""}
                    onValueChange={(value) => handleFilterChange("ownerCompanyId", value)}
                  >
                    <SelectTrigger id="ownerCompanyFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
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
                    value={filters.bpCompanyId || ""}
                    onValueChange={(value) => handleFilterChange("bpCompanyId", value)}
                  >
                    <SelectTrigger id="bpCompanyFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
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
                    value={filters.epCompanyId || ""}
                    onValueChange={(value) => handleFilterChange("epCompanyId", value)}
                  >
                    <SelectTrigger id="epCompanyFilter">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
                      {epCompanies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
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

      {markers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">활성 위치가 없습니다</h3>
              <p className="text-muted-foreground">
                현재 작업 중인 장비 또는 인력이 없거나,<br />
                최근 10분 이내 위치 정보가 전송되지 않았습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>실시간 지도</CardTitle>
            <CardDescription>
              지도의 마커를 클릭하면 상세 정보를 확인할 수 있습니다. (10초마다 자동 새로고침)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleMap
              center={center}
              zoom={12}
              markers={markers}
              className="w-full h-[600px] rounded-lg"
            />
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}

