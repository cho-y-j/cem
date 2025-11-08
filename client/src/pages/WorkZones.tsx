import { useState, useCallback } from "react";
import { APIProvider, Map, Marker, Circle } from "@vis.gl/react-google-maps";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { MapPin, Plus, Edit, Trash2, Save, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// 서울 시청 기본 위치
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

interface WorkZone {
  id: string;
  name: string;
  description?: string | null;
  centerLat: string;
  centerLng: string;
  radiusMeters: number;
  isActive: boolean;
}

export default function WorkZones() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WorkZone | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    centerLat: DEFAULT_CENTER.lat,
    centerLng: DEFAULT_CENTER.lng,
    radiusMeters: 100,
  });

  // 지도 중심 (폼과 별도로 관리)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

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
      setFormData({
        name: zone.name,
        description: zone.description || "",
        centerLat: parseFloat(zone.centerLat),
        centerLng: parseFloat(zone.centerLng),
        radiusMeters: zone.radiusMeters,
      });
      setMapCenter({ lat: parseFloat(zone.centerLat), lng: parseFloat(zone.centerLng) });
    } else {
      // 생성 모드
      setEditingZone(null);
      setFormData({
        name: "",
        description: "",
        centerLat: DEFAULT_CENTER.lat,
        centerLng: DEFAULT_CENTER.lng,
        radiusMeters: 100,
      });
      setMapCenter(DEFAULT_CENTER);
    }
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

  // 저장 핸들러
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("구역 이름을 입력하세요");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      centerLat: formData.centerLat,
      centerLng: formData.centerLng,
      radiusMeters: formData.radiusMeters,
    };

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
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">작업 구역 관리</h1>
            <p className="text-muted-foreground">
              GPS 기반 출근 체크를 위한 작업 구역을 설정합니다
            </p>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            새 작업 구역
          </Button>
        </div>

        {/* 작업 구역 목록 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workZones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base">{zone.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(zone)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(zone)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                {zone.description && (
                  <CardDescription className="text-xs">{zone.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">위도</span>
                  <span className="font-mono">{parseFloat(zone.centerLat).toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">경도</span>
                  <span className="font-mono">{parseFloat(zone.centerLng).toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">반경</span>
                  <span className="font-semibold">{zone.radiusMeters}m</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {workZones.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">등록된 작업 구역이 없습니다</p>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  첫 작업 구역 만들기
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 작업 구역 생성/수정 다이얼로그 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? "작업 구역 수정" : "새 작업 구역 생성"}
              </DialogTitle>
              <DialogDescription>
                지도에서 마커를 드래그하여 중심점을 설정하고 반경을 조정하세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 기본 정보 */}
              <div className="grid gap-4 md:grid-cols-2">
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

              {/* Google Maps */}
              <div className="space-y-2">
                <Label>작업 구역 위치</Label>
                <div className="h-[400px] border rounded-lg overflow-hidden">
                  {GOOGLE_MAPS_API_KEY ? (
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                      <Map
                        defaultCenter={mapCenter}
                        defaultZoom={15}
                        gestureHandling="greedy"
                        disableDefaultUI={false}
                      >
                        {/* 드래그 가능한 마커 */}
                        <Marker
                          position={{ lat: formData.centerLat, lng: formData.centerLng }}
                          draggable={true}
                          onDragEnd={handleMarkerDrag}
                        />

                        {/* 작업 구역 원 */}
                        <Circle
                          center={{ lat: formData.centerLat, lng: formData.centerLng }}
                          radius={formData.radiusMeters}
                          strokeColor="#3B82F6"
                          strokeOpacity={0.8}
                          strokeWeight={2}
                          fillColor="#3B82F6"
                          fillOpacity={0.2}
                        />
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
                <p className="text-xs text-muted-foreground">
                  📍 마커를 드래그하여 중심점을 이동할 수 있습니다
                </p>
              </div>

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
            </div>

            <DialogFooter>
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
