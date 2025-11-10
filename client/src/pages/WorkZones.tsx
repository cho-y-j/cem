import { useState, useCallback, useEffect, useRef } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Plus, Edit, Trash2, Save, X, MoreVertical, Circle, Shapes, MousePointer2, Hand } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// 서울 시청 기본 위치
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

// CircleZone 컴포넌트 (useMap 훅 사용)
function CircleZone({
  center,
  radius,
  strokeColor = "#3B82F6",
  strokeOpacity = 0.8,
  strokeWeight = 2,
  fillColor = "#3B82F6",
  fillOpacity = 0.2,
}: {
  center: { lat: number; lng: number };
  radius: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
}) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    // center와 map이 유효한지 확인
    if (!map || !center || center.lat == null || center.lng == null || !radius) return;

    // 기존 Circle 제거
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    try {
      // 새 Circle 생성
      const circle = new google.maps.Circle({
        map,
        center: { lat: center.lat, lng: center.lng },
        radius,
        strokeColor,
        strokeOpacity,
        strokeWeight,
        fillColor,
        fillOpacity,
      });

      circleRef.current = circle;
    } catch (error) {
      console.error("[Circle] Error creating circle:", error);
    }

    // cleanup
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, center?.lat, center?.lng, radius, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  return null; // 이 컴포넌트는 렌더링하지 않음
}

// Polygon 컴포넌트 (useMap 훅 사용)
function Polygon({
  paths,
  strokeColor = "#3B82F6",
  strokeOpacity = 0.8,
  strokeWeight = 2,
  fillColor = "#3B82F6",
  fillOpacity = 0.2,
  editable = false,
  onPathChange,
}: {
  paths: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  editable?: boolean;
  onPathChange?: (paths: Array<{ lat: number; lng: number }>) => void;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    // map과 paths가 유효한지 확인
    if (!map || !paths || paths.length < 3) return;
    
    // 모든 경로 점이 유효한지 확인
    const validPaths = paths.filter(p => p && p.lat != null && p.lng != null);
    if (validPaths.length < 3) return;

    // 기존 Polygon 제거
    if (polygonRef.current) {
      google.maps.event.clearInstanceListeners(polygonRef.current);
      polygonRef.current.setMap(null);
    }

    try {
      // 새 Polygon 생성
      const polygon = new google.maps.Polygon({
        map,
        paths: validPaths.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor,
        strokeOpacity,
        strokeWeight,
        fillColor,
        fillOpacity,
        editable,
        draggable: false,
      });

      // 경로 변경 이벤트 리스너
      if (editable && onPathChange) {
        polygon.addListener("set_at", () => {
          const newPaths = polygon.getPath().getArray().map((latLng: google.maps.LatLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          onPathChange(newPaths);
        });
        polygon.addListener("insert_at", () => {
          const newPaths = polygon.getPath().getArray().map((latLng: google.maps.LatLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          onPathChange(newPaths);
        });
        polygon.addListener("remove_at", () => {
          const newPaths = polygon.getPath().getArray().map((latLng: google.maps.LatLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          onPathChange(newPaths);
        });
      }

      polygonRef.current = polygon;
    } catch (error) {
      console.error("[Polygon] Error creating polygon:", error);
    }

    // cleanup
    return () => {
      if (polygonRef.current) {
        google.maps.event.clearInstanceListeners(polygonRef.current);
        polygonRef.current.setMap(null);
      }
    };
  }, [map, paths, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity, editable, onPathChange]);

  return null;
}

// Map 클릭 이벤트 핸들러 컴포넌트
function MapClickHandler({
  isDrawingMode,
  onMapClick,
  zoneType,
}: {
  isDrawingMode: boolean;
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  zoneType: "circle" | "polygon";
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let listener: google.maps.MapsEventListener | null = null;

    // 그리기 모드에 따라 지도 동작 설정 및 클릭 리스너 추가
    if (isDrawingMode) {
      map.setOptions({
        draggable: false,
        gestureHandling: "none",
      });
      
      // 클릭 이벤트 리스너 추가
      listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
        onMapClick(e);
      });
    } else {
      map.setOptions({
        draggable: true,
        gestureHandling: "greedy",
      });
    }

    // cleanup
    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [map, isDrawingMode, onMapClick]);

  return null;
}

interface WorkZone {
  id: string;
  name: string;
  description?: string | null;
  zoneType?: "circle" | "polygon";
  centerLat?: string | null;
  centerLng?: string | null;
  radiusMeters?: number | null;
  polygonCoordinates?: string | null; // JSON 문자열: [{lat, lng}, ...]
  isActive: boolean;
}

export default function WorkZones() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const isEP = user?.role?.toLowerCase() === "ep";

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WorkZone | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    zoneType: "circle" as "circle" | "polygon",
    centerLat: DEFAULT_CENTER.lat,
    centerLng: DEFAULT_CENTER.lng,
    radiusMeters: 100,
    polygonPoints: [] as Array<{ lat: number; lng: number }>, // 폴리곤 점들
    epCompanyId: "" as string | undefined, // EP 회사 ID (Admin인 경우만 사용)
  });

  // EP 회사 목록 조회 (Admin인 경우만)
  const { data: epCompanies = [] } = trpc.companies.list.useQuery(
    { companyType: "ep" },
    { enabled: isAdmin }
  );

  // 지도 중심 (폼과 별도로 관리)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  // 그리기 모드 (점 찍기/중심점 이동 활성화)
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // 작업 구역 목록 조회
  const { data: workZones = [], refetch } = trpc.workZones.list.useQuery();

  // 생성 뮤테이션
  const createMutation = trpc.workZones.create.useMutation({
    onSuccess: () => {
      toast.success("작업 구역이 생성되었습니다");
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(error.message || "작업 구역 생성에 실패했습니다");
    },
  });

  // 수정 뮤테이션
  const updateMutation = trpc.workZones.update.useMutation({
    onSuccess: () => {
      toast.success("작업 구역이 수정되었습니다");
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(error.message || "작업 구역 수정에 실패했습니다");
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = trpc.workZones.delete.useMutation({
    onSuccess: () => {
      toast.success("작업 구역이 삭제되었습니다");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "작업 구역 삭제에 실패했습니다");
    },
  });

  // 다이얼로그 열기
  const openDialog = (zone?: WorkZone) => {
    if (zone) {
      // 수정 모드
      setEditingZone(zone);
      const zoneType = zone.zoneType || "circle";
      let polygonPoints: Array<{ lat: number; lng: number }> = [];
      
      if (zoneType === "polygon" && zone.polygonCoordinates) {
        try {
          polygonPoints = JSON.parse(zone.polygonCoordinates);
        } catch (e) {
          console.error("Failed to parse polygon coordinates:", e);
        }
      }

      setFormData({
        name: zone.name,
        description: zone.description || "",
        zoneType,
        centerLat: zone.centerLat ? parseFloat(zone.centerLat) : DEFAULT_CENTER.lat,
        centerLng: zone.centerLng ? parseFloat(zone.centerLng) : DEFAULT_CENTER.lng,
        radiusMeters: zone.radiusMeters || 100,
        polygonPoints,
      });
      
      // 지도 중심 설정
      if (zoneType === "polygon" && polygonPoints.length > 0) {
        // 폴리곤의 중심 계산
        const avgLat = polygonPoints.reduce((sum, p) => sum + p.lat, 0) / polygonPoints.length;
        const avgLng = polygonPoints.reduce((sum, p) => sum + p.lng, 0) / polygonPoints.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      } else {
        setMapCenter({ 
          lat: zone.centerLat ? parseFloat(zone.centerLat) : DEFAULT_CENTER.lat, 
          lng: zone.centerLng ? parseFloat(zone.centerLng) : DEFAULT_CENTER.lng 
        });
      }
    } else {
      // 생성 모드
      setEditingZone(null);
      setFormData({
        name: "",
        description: "",
        zoneType: "circle",
        centerLat: DEFAULT_CENTER.lat,
        centerLng: DEFAULT_CENTER.lng,
        radiusMeters: 100,
        polygonPoints: [],
        epCompanyId: isAdmin ? undefined : undefined, // Admin인 경우 초기값 없음, EP인 경우 사용 안 함
      });
      setMapCenter(DEFAULT_CENTER);
    }
    setIsDrawingMode(false); // 다이얼로그 열 때 그리기 모드 초기화
    setIsDialogOpen(true);
  };

  // 다이얼로그 닫기
  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingZone(null);
  };

  // 마커 드래그 핸들러
  const handleMarkerDrag = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setFormData(prev => ({
        ...prev,
        centerLat: lat,
        centerLng: lng,
      }));
    }
  }, []);

  // 지도 클릭 핸들러
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (formData.zoneType === "polygon") {
      // 폴리곤 모드: 점 추가
      setFormData(prev => {
        const newPoints = [...prev.polygonPoints, { lat, lng }];
        toast.success(`점 ${newPoints.length}개 추가됨`);
        return {
          ...prev,
          polygonPoints: newPoints,
        };
      });
    } else if (formData.zoneType === "circle") {
      // 원형 모드: 중심점 이동
      setFormData(prev => ({
        ...prev,
        centerLat: lat,
        centerLng: lng,
      }));
      toast.success("중심점이 이동되었습니다");
    }
  }, [formData.zoneType]);

  // 폴리곤 점 삭제
  const removePolygonPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      polygonPoints: prev.polygonPoints.filter((_, i) => i !== index),
    }));
  };

  // 저장 핸들러
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("구역 이름을 입력하세요");
      return;
    }

    // 폴리곤 모드일 때 최소 3개 점 필요
    if (formData.zoneType === "polygon" && formData.polygonPoints.length < 3) {
      toast.error("폴리곤은 최소 3개 이상의 점이 필요합니다");
      return;
    }

    // 원형 모드일 때 중심점과 반경 필요
    if (formData.zoneType === "circle" && (!formData.centerLat || !formData.centerLng)) {
      toast.error("중심점을 설정해주세요");
      return;
    }

    // Admin인 경우 EP 회사 선택 필수
    if (isAdmin && !formData.epCompanyId) {
      toast.error("EP 회사를 선택해주세요");
      return;
    }

    const data: any = {
      name: formData.name,
      description: formData.description || undefined,
      zoneType: formData.zoneType,
    };

    // Admin인 경우 EP 회사 ID 추가
    if (isAdmin) {
      data.epCompanyId = formData.epCompanyId;
    }

    if (formData.zoneType === "circle") {
      // 원형 모드: 중심점과 반경만 전송
      data.centerLat = formData.centerLat;
      data.centerLng = formData.centerLng;
      data.radiusMeters = formData.radiusMeters;
      // 폴리곤 관련 데이터 제거
      delete data.polygonCoordinates;
    } else {
      // 폴리곤 모드: 좌표만 전송
      data.polygonCoordinates = JSON.stringify(formData.polygonPoints);
      // 원형 관련 데이터 제거
      delete data.centerLat;
      delete data.centerLng;
      delete data.radiusMeters;
    }

    if (editingZone) {
      // 수정
      updateMutation.mutate({
        id: editingZone.id,
        ...data,
      });
    } else {
      // 생성
      createMutation.mutate(data);
    }
  };

  // 삭제 핸들러
  const handleDelete = (zone: WorkZone) => {
    if (confirm(`"${zone.name}" 작업 구역을 삭제하시겠습니까?`)) {
      deleteMutation.mutate({ id: zone.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-[1400px] mx-auto">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">작업 구역 관리</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              GPS 기반 출근 체크를 위한 작업 구역을 설정합니다
            </p>
          </div>
          <Button onClick={() => openDialog()} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            새 작업 구역
          </Button>
        </div>

        {/* 작업 구역 목록 - 행 형식 */}
        <Card>
          <CardHeader>
            <CardTitle>작업 구역 목록</CardTitle>
            <CardDescription>
              등록된 작업 구역 {workZones.length}개
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workZones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">등록된 작업 구역이 없습니다</p>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  첫 작업 구역 만들기
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {workZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                        <MapPin className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-base">{zone.name}</h3>
                          {zone.isActive ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              활성
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-300 text-gray-600">
                              비활성
                            </Badge>
                          )}
                        </div>
                        {zone.description && (
                          <p className="text-sm text-muted-foreground mb-2 truncate">
                            {zone.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {zone.zoneType === "polygon" ? "다각형" : "원형"}
                          </Badge>
                          {zone.zoneType === "circle" && zone.centerLat && zone.centerLng && (
                            <>
                              <span className="flex items-center gap-1">
                                <span className="font-medium">위도:</span>
                                <span className="font-mono">
                                  {zone.centerLat ? parseFloat(zone.centerLat).toFixed(6) : "-"}
                                </span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium">경도:</span>
                                <span className="font-mono">
                                  {zone.centerLng ? parseFloat(zone.centerLng).toFixed(6) : "-"}
                                </span>
                              </span>
                              {zone.radiusMeters != null && (
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">반경:</span>
                                  <span className="font-semibold text-foreground">{zone.radiusMeters}m</span>
                                </span>
                              )}
                            </>
                          )}
                          {zone.zoneType === "polygon" && zone.polygonCoordinates && (
                            <span className="text-xs">
                              {(() => {
                                try {
                                  const coords = JSON.parse(zone.polygonCoordinates);
                                  return Array.isArray(coords) ? `${coords.length}개 점` : "-";
                                } catch {
                                  return "-";
                                }
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(zone)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        수정
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDialog(zone)}>
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(zone)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 작업 구역 생성/수정 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] flex flex-col sm:max-w-[90vw] lg:max-w-[1400px]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {editingZone ? "작업 구역 수정" : "새 작업 구역 생성"}
              </DialogTitle>
              <DialogDescription>
                {formData.zoneType === "circle" 
                  ? "📍 지도를 클릭하여 중심점을 설정하고 반경을 조정하세요"
                  : "📍 지도를 클릭하여 점을 추가하세요 (최소 3개 점 필요). 점을 드래그하여 위치를 조정할 수 있습니다."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 min-h-0">
              {/* 구역 타입 선택 */}
              <div className="space-y-2">
                <Label>구역 타입 *</Label>
                <RadioGroup
                  value={formData.zoneType}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      zoneType: value as "circle" | "polygon",
                      // 타입 변경 시 초기화
                      polygonPoints: value === "polygon" ? [] : formData.polygonPoints,
                    });
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="circle" id="circle" />
                    <Label htmlFor="circle" className="flex items-center gap-2 cursor-pointer">
                      <Circle className="h-4 w-4" />
                      원형 구역
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="polygon" id="polygon" />
                    <Label htmlFor="polygon" className="flex items-center gap-2 cursor-pointer">
                      <Shapes className="h-4 w-4" />
                      다각형 구역
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 기본 정보 */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">구역 이름 *</Label>
                  <Input
                    id="name"
                    placeholder="예: 서울 강남 건설 현장"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명 (선택)</Label>
                  <Input
                    id="description"
                    placeholder="예: 강남역 인근 오피스 건설 프로젝트"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* EP 회사 선택 (Admin인 경우만) */}
              {isAdmin && !editingZone && (
                <div className="space-y-2">
                  <Label htmlFor="epCompany">EP 회사 *</Label>
                  <Select
                    value={formData.epCompanyId || ""}
                    onValueChange={(value) => setFormData({ ...formData, epCompanyId: value })}
                  >
                    <SelectTrigger id="epCompany">
                      <SelectValue placeholder="EP 회사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {epCompanies.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    이 작업 구역이 적용될 EP 회사를 선택하세요
                  </p>
                </div>
              )}

              {/* Google Maps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>작업 구역 위치</Label>
                    {isDrawingMode ? (
                      <p className="text-xs text-blue-600 font-medium">
                        ✏️ 그리기 모드: 지도를 클릭하여 {formData.zoneType === "circle" ? "중심점을 설정" : "점을 추가"}하세요
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        👆 "그리기 시작" 버튼을 클릭한 후 지도에서 점을 찍으세요
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.zoneType === "polygon" && (
                      <Badge variant="outline" className="text-sm">
                        점 {formData.polygonPoints.length}개
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant={isDrawingMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsDrawingMode(!isDrawingMode)}
                      className="flex items-center gap-2"
                    >
                      {isDrawingMode ? (
                        <>
                          <Hand className="h-4 w-4" />
                          그리기 종료
                        </>
                      ) : (
                        <>
                          <MousePointer2 className="h-4 w-4" />
                          그리기 시작
                        </>
                      )}
                    </Button>
                    {formData.zoneType === "polygon" && formData.polygonPoints.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, polygonPoints: [] }))}
                      >
                        모두 삭제
                      </Button>
                    )}
                  </div>
                </div>
                <div 
                  className="h-[400px] sm:h-[450px] lg:h-[500px] border rounded-lg overflow-hidden relative"
                  style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}
                >
                  {GOOGLE_MAPS_API_KEY ? (
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                      <MapClickHandler 
                        isDrawingMode={isDrawingMode}
                        onMapClick={handleMapClick}
                        zoneType={formData.zoneType}
                      />
                      <Map
                        defaultCenter={mapCenter}
                        defaultZoom={15}
                        gestureHandling={isDrawingMode ? "none" : "greedy"}
                        disableDefaultUI={false}
                        clickableIcons={false}
                        style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}
                      >
                        {formData.zoneType === "circle" ? (
                          <>
                            {/* 중심점 마커 (드래그 가능, 클릭으로도 이동 가능) */}
                            {formData.centerLat != null && formData.centerLng != null && (
                              <>
                                <Marker
                                  position={{ lat: formData.centerLat, lng: formData.centerLng }}
                                  draggable={true}
                                  onDragEnd={handleMarkerDrag}
                                  title="중심점 (드래그 또는 지도 클릭으로 이동)"
                                />
                                {/* 작업 구역 원 */}
                                <CircleZone
                                  center={{ lat: formData.centerLat, lng: formData.centerLng }}
                                  radius={formData.radiusMeters || 100}
                                  strokeColor="#3B82F6"
                                  strokeOpacity={0.8}
                                  strokeWeight={2}
                                  fillColor="#3B82F6"
                                  fillOpacity={0.2}
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {/* 폴리곤 점들 마커 */}
                            {formData.polygonPoints.map((point, index) => (
                              <Marker
                                key={index}
                                position={{ lat: point.lat, lng: point.lng }}
                                label={{ text: `${index + 1}`, color: "white" }}
                                icon={{
                                  path: google.maps.SymbolPath.CIRCLE,
                                  scale: 8,
                                  fillColor: "#3B82F6",
                                  fillOpacity: 1,
                                  strokeColor: "white",
                                  strokeWeight: 2,
                                }}
                              />
                            ))}
                            {/* 폴리곤 */}
                            {formData.polygonPoints.length >= 3 && (
                              <Polygon
                                paths={formData.polygonPoints}
                                strokeColor="#3B82F6"
                                strokeOpacity={0.8}
                                strokeWeight={2}
                                fillColor="#3B82F6"
                                fillOpacity={0.2}
                                editable={true}
                                onPathChange={(newPaths) => {
                                  setFormData(prev => ({ ...prev, polygonPoints: newPaths }));
                                }}
                              />
                            )}
                          </>
                        )}
                      </Map>
                    </APIProvider>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <p className="text-muted-foreground">
                        Google Maps API 키가 설정되지 않았습니다
                      </p>
                    </div>
                  )}
                </div>
                {formData.zoneType === "polygon" && formData.polygonPoints.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>💡 팁:</strong> 폴리곤의 점을 드래그하여 위치를 조정할 수 있습니다. 
                      {formData.polygonPoints.length < 3 && " 최소 3개 점이 필요합니다."}
                    </p>
                  </div>
                )}
              </div>

              {/* 폴리곤 점 목록 */}
              {formData.zoneType === "polygon" && formData.polygonPoints.length > 0 && (
                <div className="space-y-2">
                  <Label>폴리곤 점 목록</Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {formData.polygonPoints.map((point, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 hover:bg-accent rounded">
                        <span className="font-mono">
                          {index + 1}. 위도: {point.lat.toFixed(6)}, 경도: {point.lng.toFixed(6)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePolygonPoint(index)}
                          className="h-6 px-2 text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 원형 모드일 때만 좌표 정보와 반경 표시 */}
              {formData.zoneType === "circle" && (
                <>
                  {/* 좌표 정보 */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>위도 (Latitude)</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={formData.centerLat}
                        onChange={(e) => setFormData({ ...formData, centerLat: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>경도 (Longitude)</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={formData.centerLng}
                        onChange={(e) => setFormData({ ...formData, centerLng: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* 반경 조정 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>반경 (미터)</Label>
                      <span className="text-sm font-semibold">{formData.radiusMeters}m</span>
                    </div>
                    <Slider
                      value={[formData.radiusMeters]}
                      onValueChange={([value]) => setFormData({ ...formData, radiusMeters: value })}
                      min={10}
                      max={1000}
                      step={10}
                    />
                    <div className="flex gap-2">
                      {[50, 100, 200, 500].map((value) => (
                        <Button
                          key={value}
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, radiusMeters: value })}
                        >
                          {value}m
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button variant="outline" onClick={closeDialog}>
                <X className="mr-2 h-4 w-4" />
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {editingZone ? "수정" : "생성"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
