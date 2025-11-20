import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, MapPin, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function EmergencyAlerts() {
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "resolved" | "false_alarm" | undefined>("active");
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);
  const [openInfoWindowId, setOpenInfoWindowId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const previousAlertCountRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const utils = trpc.useUtils();

  // 긴급 알림 목록 조회 (5초마다 자동 갱신)
  const { data: alerts, isLoading } = trpc.emergency.list.useQuery(
    { status: statusFilter },
    {
      refetchInterval: 5000, // 5초마다 자동 갱신
      refetchOnWindowFocus: true, // 창 포커스시 갱신
      refetchOnMount: true, // 마운트시 갱신
    }
  );

  // 새 긴급 알림 감지 및 알림
  useEffect(() => {
    if (!alerts) return;

    const activeAlerts = alerts.filter((a: any) => a.status === "active");
    const currentCount = activeAlerts.length;

    // 첫 로드가 아니고, 활성 알림이 증가했을 때만 알림
    if (previousAlertCountRef.current > 0 && currentCount > previousAlertCountRef.current) {
      const newAlertCount = currentCount - previousAlertCountRef.current;

      // 경고음 재생
      if (!audioRef.current) {
        audioRef.current = new Audio('/alert-sound.mp3');
      }
      audioRef.current.play().catch((err) => {
        console.warn('Alert sound failed to play:', err);
      });

      // Toast 알림
      toast.error(`🚨 새로운 긴급 알림 ${newAlertCount}건 발생!`, {
        description: "긴급 상황이 발생했습니다. 즉시 확인하세요.",
        duration: 10000, // 10초 동안 표시
      });
    }

    previousAlertCountRef.current = currentCount;
  }, [alerts]);

  // 긴급 알림 해결
  const resolveMutation = trpc.emergency.resolve.useMutation({
    onSuccess: () => {
      toast.success("긴급 알림이 해결되었습니다.");
      utils.emergency.list.invalidate();
      setSelectedAlert(null);
      setResolutionNote("");
    },
    onError: (error) => {
      toast.error("해결 실패: " + error.message);
    },
  });

  const handleResolve = () => {
    if (!selectedAlert) return;
    resolveMutation.mutate({
      id: selectedAlert.id,
      resolutionNote: resolutionNote || undefined,
    });
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      active: { label: "활성", className: "bg-red-100 text-red-700", icon: AlertTriangle },
      resolved: { label: "해결됨", className: "bg-green-100 text-green-700", icon: CheckCircle },
      false_alarm: { label: "오보", className: "bg-gray-100 text-gray-700", icon: XCircle },
    };

    const statusInfo = statusMap[status] || statusMap.active;
    const Icon = statusInfo.icon;

    return (
      <Badge className={statusInfo.className}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  // 긴급 유형 배지
  const getAlertTypeBadge = (alertType: string) => {
    const typeMap: Record<string, string> = {
      "사고": "bg-red-100 text-red-700",
      "고장": "bg-orange-100 text-orange-700",
      "안전위험": "bg-yellow-100 text-yellow-700",
      "기타": "bg-blue-100 text-blue-700",
    };

    return (
      <Badge className={typeMap[alertType] || typeMap["기타"]}>
        {alertType}
      </Badge>
    );
  };

  // 긴급 유형별 마커 색상
  const getAlertTypeColor = (alertType: string) => {
    const colorMap: Record<string, string> = {
      "사고": "#EF4444", // red-500
      "고장": "#F59E0B", // orange-500
      "안전위험": "#EAB308", // yellow-500
      "기타": "#3B82F6", // blue-500
    };
    return colorMap[alertType] || colorMap["기타"];
  };

  // 목록에서 알림 클릭시 지도로 이동
  const handleAlertClick = (alert: any) => {
    if (alert.latitude && alert.longitude) {
      setHighlightedAlertId(alert.id);
      setOpenInfoWindowId(alert.id);
      setMapCenter({
        lat: parseFloat(alert.latitude),
        lng: parseFloat(alert.longitude),
      });
      setMapZoom(16);

      // 지도 섹션으로 스크롤
      const mapSection = document.getElementById('emergency-map-section');
      if (mapSection) {
        mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // 지도 마커 데이터
  const mapMarkers = alerts
    ?.filter((alert: any) => alert.latitude && alert.longitude && alert.status === "active")
    .map((alert: any, index: number) => ({
      id: alert.id,
      index: index + 1, // 1부터 시작하는 번호
      position: {
        lat: parseFloat(alert.latitude),
        lng: parseFloat(alert.longitude),
      },
      title: `${alert.workers?.name || "Unknown"} - ${alert.alert_type}`,
      alertType: alert.alert_type,
      description: alert.description,
      createdAt: alert.created_at,
      workerName: alert.workers?.name || "Unknown",
      equipmentRegNum: alert.equipment?.reg_num || "미배정",
    })) || [];

  // 지도 초기 중심 좌표
  const initialMapCenter = mapMarkers.length > 0
    ? mapMarkers[0].position
    : { lat: 37.5665, lng: 126.9780 }; // 서울 시청

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">긴급 알림을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">긴급 알림 관리</h1>
          <p className="text-muted-foreground mt-1">
            현장에서 발생한 긴급 상황을 확인하고 대응합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <Badge variant="outline" className="text-sm">
            {alerts?.filter((a: any) => a.status === "active").length || 0}개 활성 알림
          </Badge>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              onClick={() => setStatusFilter("active")}
            >
              활성
            </Button>
            <Button
              variant={statusFilter === "resolved" ? "default" : "outline"}
              onClick={() => setStatusFilter("resolved")}
            >
              해결됨
            </Button>
            <Button
              variant={statusFilter === "false_alarm" ? "default" : "outline"}
              onClick={() => setStatusFilter("false_alarm")}
            >
              오보
            </Button>
            <Button
              variant={statusFilter === undefined ? "default" : "outline"}
              onClick={() => setStatusFilter(undefined)}
            >
              전체
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 지도 */}
      {mapMarkers.length > 0 && statusFilter === "active" && GOOGLE_MAPS_API_KEY && (
        <Card id="emergency-map-section">
          <CardHeader>
            <CardTitle>긴급 위치 지도</CardTitle>
            <CardDescription>
              활성 긴급 알림 {mapMarkers.length}건의 위치를 지도에서 확인합니다. 목록을 클릭하면 해당 위치로 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[500px] rounded-lg overflow-hidden border">
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                  defaultCenter={initialMapCenter}
                  center={mapCenter || undefined}
                  zoom={mapZoom}
                  mapId="emergency-alerts-map"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  mapTypeControl={true}
                  fullscreenControl={true}
                >
                  {mapMarkers.map((marker) => {
                    const isHighlighted = highlightedAlertId === marker.id;
                    const markerColor = getAlertTypeColor(marker.alertType);

                    return (
                      <div key={marker.id}>
                        <AdvancedMarker
                          position={marker.position}
                          title={marker.title}
                          onClick={() => {
                            setOpenInfoWindowId(marker.id);
                            setHighlightedAlertId(marker.id);
                          }}
                        >
                          <div
                            className={`relative flex items-center justify-center rounded-full shadow-lg transition-all ${
                              isHighlighted ? 'scale-125' : 'scale-100'
                            }`}
                            style={{
                              backgroundColor: markerColor,
                              width: isHighlighted ? '48px' : '40px',
                              height: isHighlighted ? '48px' : '40px',
                              border: '3px solid white',
                              cursor: 'pointer',
                            }}
                          >
                            <span className="text-white font-bold text-sm">
                              {marker.index}
                            </span>
                            {isHighlighted && (
                              <div
                                className="absolute -top-1 -right-1 bg-white rounded-full p-0.5"
                                style={{ animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                              >
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                              </div>
                            )}
                          </div>
                        </AdvancedMarker>

                        {openInfoWindowId === marker.id && (
                          <InfoWindow
                            position={marker.position}
                            onCloseClick={() => setOpenInfoWindowId(null)}
                          >
                            <div className="p-2 min-w-[200px]">
                              <div className="font-bold text-base mb-2">
                                #{marker.index} {marker.alertType}
                              </div>
                              <div className="text-sm space-y-1">
                                <div><strong>작업자:</strong> {marker.workerName}</div>
                                <div><strong>장비:</strong> {marker.equipmentRegNum}</div>
                                {marker.description && (
                                  <div><strong>상세:</strong> {marker.description}</div>
                                )}
                                <div className="text-gray-600 text-xs mt-2">
                                  {new Date(marker.createdAt).toLocaleString("ko-KR")}
                                </div>
                              </div>
                            </div>
                          </InfoWindow>
                        )}
                      </div>
                    );
                  })}
                </Map>
              </APIProvider>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 알림 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>긴급 알림 목록</CardTitle>
          <CardDescription>
            {statusFilter === "active" && "현재 활성 상태인 긴급 알림입니다."}
            {statusFilter === "resolved" && "해결된 긴급 알림입니다."}
            {statusFilter === "false_alarm" && "오보로 처리된 긴급 알림입니다."}
            {!statusFilter && "모든 긴급 알림입니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">긴급 알림이 없습니다</h3>
              <p className="text-muted-foreground">
                현재 {statusFilter === "active" ? "활성" : statusFilter === "resolved" ? "해결된" : statusFilter === "false_alarm" ? "오보" : ""} 긴급 알림이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: any, index: number) => {
                const isHighlighted = highlightedAlertId === alert.id;
                const hasLocation = alert.latitude && alert.longitude && alert.status === "active";

                return (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      alert.status === "active"
                        ? isHighlighted
                          ? "border-red-500 bg-red-100 shadow-lg"
                          : "border-red-300 bg-red-50 hover:bg-red-100"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => hasLocation && handleAlertClick(alert)}
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {hasLocation && (
                          <Badge
                            className="font-bold"
                            style={{
                              backgroundColor: getAlertTypeColor(alert.alert_type),
                              color: 'white'
                            }}
                          >
                            #{index + 1}
                          </Badge>
                        )}
                        {getStatusBadge(alert.status)}
                        {getAlertTypeBadge(alert.alert_type)}
                        <span className="text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(alert.created_at).toLocaleString("ko-KR")}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium">
                          작업자: {alert.workers?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          장비: {alert.equipment?.reg_num || "미배정"}
                        </p>
                        {alert.description && (
                          <p className="text-sm">
                            <strong>상세:</strong> {alert.description}
                          </p>
                        )}
                        {alert.latitude && alert.longitude && (
                          <p className="text-sm text-blue-600 font-medium">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            지도에서 보기 (클릭)
                          </p>
                        )}
                        {alert.resolved_at && (
                          <p className="text-sm text-green-600">
                            <CheckCircle className="h-3 w-3 inline mr-1" />
                            해결: {new Date(alert.resolved_at).toLocaleString("ko-KR")}
                            {alert.resolution_note && ` - ${alert.resolution_note}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {alert.status === "active" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                      >
                        해결 처리
                      </Button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 해결 다이얼로그 */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>긴급 알림 해결</DialogTitle>
            <DialogDescription>
              긴급 상황이 해결되었습니다. 해결 내용을 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedAlert.alert_type}</p>
                <p className="text-sm text-muted-foreground">
                  작업자: {selectedAlert.workers?.name || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAlert.description}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  해결 내용 (선택사항)
                </label>
                <Textarea
                  placeholder="예: 타이어 교체 완료, 작업 재개"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedAlert(null)}
              disabled={resolveMutation.isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "해결 완료"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

