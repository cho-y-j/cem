import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileBottomNav, { workerNavItems } from "@/components/mobile/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Play,
  Square,
  Coffee,
  Clock,
  AlertTriangle,
  Truck,
  MapPin,
  Building2,
  Calendar,
  PackageCheck,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function WorkerMain() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 로그인 체크
  useEffect(() => {
    if (!user || user.role !== "worker") {
      setLocation("/mobile/login");
    }
  }, [user, setLocation]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [locationInterval, setLocationInterval] = useState<NodeJS.Timeout | null>(null);
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState<string>("");
  const [emergencyDescription, setEmergencyDescription] = useState<string>("");

  // 배정된 장비 조회
  const { data: assignedEquipment, isLoading: isLoadingEquipment } = trpc.mobile.worker.getMyAssignedEquipment.useQuery();

  // 현재 투입 정보 조회 (BP사 정보 포함)
  const { data: currentDeployment } = trpc.mobile.worker.getCurrentDeployment.useQuery();

  // 디버깅: 장비 및 투입 정보 로그
  useEffect(() => {
    console.log('[WorkerMain] User:', user);
    console.log('[WorkerMain] Assigned Equipment:', assignedEquipment);
    console.log('[WorkerMain] Current Deployment:', currentDeployment);
  }, [user, assignedEquipment, currentDeployment]);

  // 현재 작업 세션 조회
  const { data: currentSession, refetch: refetchSession, isLoading: isLoadingSession } =
    trpc.mobile.worker.getCurrentSession.useQuery();

  // 작업 시작
  const startWorkMutation = trpc.mobile.worker.startWorkSession.useMutation({
    onSuccess: () => {
      toast.success("작업이 시작되었습니다.");
      refetchSession();
      startLocationTracking();
    },
    onError: (error) => {
      toast.error("작업 시작 실패: " + error.message);
    },
  });

  // 작업 종료
  const endWorkMutation = trpc.mobile.worker.endWorkSession.useMutation({
    onSuccess: () => {
      toast.success("작업이 종료되었습니다.");
      refetchSession();
      stopLocationTracking();
    },
    onError: (error) => {
      toast.error("작업 종료 실패: " + error.message);
    },
  });

  // 휴식 시작
  const startBreakMutation = trpc.mobile.worker.startBreak.useMutation({
    onSuccess: () => {
      toast.success("휴식이 시작되었습니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("휴식 시작 실패: " + error.message);
    },
  });

  // 휴식 종료
  const endBreakMutation = trpc.mobile.worker.endBreak.useMutation({
    onSuccess: () => {
      toast.success("작업을 재개합니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("휴식 종료 실패: " + error.message);
    },
  });

  // 연장 시작
  const startOvertimeMutation = trpc.mobile.worker.startOvertime.useMutation({
    onSuccess: () => {
      toast.success("연장 작업이 시작되었습니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("연장 시작 실패: " + error.message);
    },
  });

  // 연장 종료
  const endOvertimeMutation = trpc.mobile.worker.endOvertime.useMutation({
    onSuccess: () => {
      toast.success("정상 작업으로 돌아갑니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("연장 종료 실패: " + error.message);
    },
  });

  // 위치 전송
  const sendLocationMutation = trpc.mobile.worker.sendLocation.useMutation();

  // 긴급 알림
  const sendEmergencyMutation = trpc.mobile.worker.sendEmergencyAlert.useMutation({
    onSuccess: () => {
      toast.success("장비 운영사에 긴급 알림이 전송되었습니다.");
    },
    onError: (error) => {
      toast.error("긴급 알림 전송 실패: " + error.message);
    },
  });

  // 위치 추적 시작
  const startLocationTracking = () => {
    if (!assignedEquipment) return;

    // 즉시 위치 전송
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocationMutation.mutate({
            equipmentId: assignedEquipment.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error("위치 정보 가져오기 실패:", error);
        }
      );
    }

    // 5분 간격으로 위치 전송
    const interval = setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sendLocationMutation.mutate({
              equipmentId: assignedEquipment.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            console.error("위치 정보 가져오기 실패:", error);
          }
        );
      }
    }, 5 * 60 * 1000); // 5분 간격

    setLocationInterval(interval);
  };

  // 위치 추적 중지
  const stopLocationTracking = () => {
    if (locationInterval) {
      clearInterval(locationInterval);
      setLocationInterval(null);
    }
  };

  // 경과 시간 계산
  useEffect(() => {
    if (!currentSession || !currentSession.startTime) return;

    const timer = setInterval(() => {
      // UTC 시간으로 명시적으로 파싱 (타임존 이슈 해결)
      const startTimeStr = currentSession.startTime.replace(' ', 'T') + 'Z';
      const start = new Date(startTimeStr).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession]);

  // 경과 시간 포맷팅
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 상태 배지
  const getStatusBadge = () => {
    if (!currentSession) return null;

    const statusMap: Record<string, { label: string; className: string }> = {
      working: { label: "작업 중", className: "bg-green-500 text-white" },
      break: { label: "휴식 중", className: "bg-yellow-500 text-white" },
      overtime: { label: "연장 중", className: "bg-orange-500 text-white" },
    };

    const status = statusMap[currentSession.status] || {
      label: currentSession.status,
      className: "bg-gray-500 text-white",
    };

    return <Badge className={`${status.className} text-sm px-3 py-1`}>{status.label}</Badge>;
  };

  // 긴급 버튼 클릭
  const handleEmergencyClick = () => {
    if (!assignedEquipment) {
      toast.error("배정된 장비가 없습니다.");
      return;
    }
    setEmergencyDialogOpen(true);
  };

  // 긴급 상황 제출
  const handleEmergencySubmit = () => {
    if (!assignedEquipment) return;
    if (!emergencyType || !emergencyDescription.trim()) {
      toast.error("유형과 설명을 모두 입력해주세요.");
      return;
    }

    const alertTypeMap: Record<string, string> = {
      "accident": "사고",
      "equipment_failure": "고장",
      "safety_hazard": "안전위험",
      "other": "기타",
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendEmergencyMutation.mutate({
            equipmentId: assignedEquipment.id,
            alertType: alertTypeMap[emergencyType] || "기타",
            description: emergencyDescription,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setEmergencyDialogOpen(false);
          setEmergencyType("");
          setEmergencyDescription("");
        },
        () => {
          sendEmergencyMutation.mutate({
            equipmentId: assignedEquipment.id,
            alertType: alertTypeMap[emergencyType] || "기타",
            description: emergencyDescription,
          });
          setEmergencyDialogOpen(false);
          setEmergencyType("");
          setEmergencyDescription("");
        }
      );
    } else {
      sendEmergencyMutation.mutate({
        equipmentId: assignedEquipment.id,
        alertType: alertTypeMap[emergencyType] || "기타",
        description: emergencyDescription,
      });
      setEmergencyDialogOpen(false);
      setEmergencyType("");
      setEmergencyDescription("");
    }
  };

  // 작업 시작 핸들러
  const handleStartWork = () => {
    console.log('[WorkerMain] handleStartWork called');
    console.log('[WorkerMain] assignedEquipment:', assignedEquipment);
    
    if (!assignedEquipment) {
      toast.error("배정된 장비가 없습니다. 관리자에게 문의하세요.");
      return;
    }
    
    console.log('[WorkerMain] Starting work session with equipment:', assignedEquipment.id);
    startWorkMutation.mutate({ equipmentId: assignedEquipment.id });
  };

  if (isLoadingEquipment || isLoadingSession) {
    return (
      <MobileLayout title="장비 운전자" showMenu={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="작업 관리" showMenu={false}>
      <div className="pb-24">
        {/* 작업 상태 카드 - 큰 화면 상단 */}
        {currentSession && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 mb-4">
            <div className="text-center space-y-3">
              {getStatusBadge()}
              <div className="text-5xl font-mono font-bold tracking-wider">
                {formatElapsedTime(elapsedTime)}
              </div>
              <div className="text-sm opacity-90">경과 시간</div>
            </div>
          </div>
        )}

        {/* 배정된 장비 정보 */}
        {/* 배정된 장비가 없을 때만 에러 카드 표시 */}
        {!assignedEquipment && !currentDeployment && (
          <div className="px-4 mb-4">
            <Card className="border-2 border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <Truck className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <div className="font-medium text-red-700">배정된 장비가 없습니다</div>
                <div className="text-sm text-red-600 mt-1">관리자에게 문의하세요</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 배정 정보 (차량 + 현장) */}
        {(assignedEquipment || currentDeployment) && (
          <div className="px-4 mb-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-5 w-5 text-blue-700" />
                  <span className="font-bold text-blue-900">배정 정보</span>
                </div>
                <div className="space-y-3">
                  {/* 차량 정보 */}
                  {assignedEquipment && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm">차량번호:</span>
                        <span className="text-lg font-bold text-blue-900">{assignedEquipment.regNum}</span>
                      </div>
                      {assignedEquipment.equipType?.name && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-sm">차량종류:</span>
                          <span className="font-medium text-gray-800">{assignedEquipment.equipType.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* 현장 정보 (BP사) */}
                  {currentDeployment?.bpCompany?.name && (
                    <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600 text-sm">현장:</span>
                      <span className="font-medium text-gray-800">{currentDeployment.bpCompany.name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 작업 제어 버튼 영역 */}
        <div className="px-4 space-y-4">
          {!currentSession ? (
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg active:scale-95 transition-transform"
              onClick={handleStartWork}
              disabled={!assignedEquipment || startWorkMutation.isPending}
            >
              {startWorkMutation.isPending ? (
                <>
                  <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                  작업 시작 중...
                </>
              ) : (
                <>
                  <Play className="mr-3 h-7 w-7" />
                  작업 시작
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full h-20 text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg active:scale-95 transition-transform"
                onClick={() => endWorkMutation.mutate()}
                disabled={endWorkMutation.isPending}
              >
                {endWorkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                    작업 종료 중...
                  </>
                ) : (
                  <>
                    <Square className="mr-3 h-7 w-7" />
                    작업 종료
                  </>
                )}
              </Button>

              {currentSession.status === "working" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 text-base border-2 border-yellow-400 hover:bg-yellow-50 active:scale-95 transition-transform"
                    onClick={() => startBreakMutation.mutate()}
                    disabled={startBreakMutation.isPending}
                  >
                    <Coffee className="mr-2 h-5 w-5" />
                    휴식 시작
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 text-base border-2 border-orange-400 hover:bg-orange-50 active:scale-95 transition-transform"
                    onClick={() => startOvertimeMutation.mutate()}
                    disabled={startOvertimeMutation.isPending}
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    연장 시작
                  </Button>
                </div>
              )}

              {currentSession.status === "break" && (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg active:scale-95 transition-transform"
                  onClick={() => endBreakMutation.mutate()}
                  disabled={endBreakMutation.isPending}
                >
                  <Play className="mr-2 h-5 w-5" />
                  휴식 종료
                </Button>
              )}

              {currentSession.status === "overtime" && (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg active:scale-95 transition-transform"
                  onClick={() => endOvertimeMutation.mutate()}
                  disabled={endOvertimeMutation.isPending}
                >
                  <Square className="mr-2 h-5 w-5" />
                  연장 종료
                </Button>
              )}
            </>
          )}
        </div>

        {/* 빠른 메뉴 */}
        <div className="px-4 mt-6 space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-2">빠른 메뉴</div>
          
          {/* 운전자 점검표 */}
          <Button
            size="lg"
            variant="outline"
            className="w-full h-16 text-base font-bold border-2 border-blue-400 hover:bg-blue-50 active:scale-95 transition-transform"
            onClick={() => setLocation("/mobile/driver-inspection")}
            disabled={!assignedEquipment}
          >
            <ClipboardCheck className="mr-2 h-6 w-6 text-blue-600" />
            <div className="text-left flex-1">
              <div>운전자 점검표</div>
              <div className="text-xs text-gray-500 font-normal">일일/주간/월간 점검</div>
            </div>
          </Button>
        </div>

        {/* 긴급 상황 버튼 */}
        <div className="px-4 mt-6">
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg active:scale-95 transition-transform"
            onClick={handleEmergencyClick}
            disabled={!assignedEquipment || sendEmergencyMutation.isPending}
          >
            <AlertTriangle className="mr-2 h-6 w-6" />
            긴급 상황 발생
          </Button>
        </div>

        {/* 긴급 상황 다이얼로그 */}
        <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>긴급 상황 신고</DialogTitle>
              <DialogDescription>
                긴급 상황 유형과 상세 설명을 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-type">상황 유형</Label>
                <Select value={emergencyType} onValueChange={setEmergencyType}>
                  <SelectTrigger id="emergency-type">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accident">사고</SelectItem>
                    <SelectItem value="equipment_failure">고장</SelectItem>
                    <SelectItem value="safety_hazard">안전위험</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-description">상세 설명</Label>
                <Input
                  id="emergency-description"
                  placeholder="상세 설명을 입력하세요"
                  value={emergencyDescription}
                  onChange={(e) => setEmergencyDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEmergencyDialogOpen(false);
                  setEmergencyType("");
                  setEmergencyDescription("");
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleEmergencySubmit}
                disabled={!emergencyType || !emergencyDescription.trim() || sendEmergencyMutation.isPending}
              >
                {sendEmergencyMutation.isPending ? "전송 중..." : "신고하기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 위치 전송 상태 */}
        {currentSession && locationInterval && (
          <div className="px-4 mt-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <MapPin className="h-4 w-4 animate-pulse" />
                  <span>위치 정보 전송 중 (5분 간격)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <MobileBottomNav items={workerNavItems} />
    </MobileLayout>
  );
}
