import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee, Loader2, AlertTriangle, Truck, HardHat, Play } from "lucide-react";

export default function WorkMonitoring() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 현재 시간 업데이트 (1초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 모든 활성 작업 세션 조회
  const { data: activeSessions, isLoading } = trpc.mobile.worker.getAllActiveSessions.useQuery();

  // 경과 시간 계산
  const calculateElapsedTime = (startTime: string) => {
    const start = new Date(startTime).getTime();
    const now = currentTime.getTime();
    const elapsed = Math.floor((now - start) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // 휴식 시간 체크 (4시간 이상 작업 시 경고)
  const needsBreak = (startTime: string, lastBreakTime?: string) => {
    const start = new Date(startTime).getTime();
    const lastBreak = lastBreakTime ? new Date(lastBreakTime).getTime() : start;
    const now = currentTime.getTime();
    const elapsed = (now - lastBreak) / 1000 / 60 / 60; // 시간 단위
    
    return elapsed >= 4; // 4시간 이상
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      working: { label: "작업 중", className: "bg-green-100 text-green-700", icon: Play },
      break: { label: "휴식 중", className: "bg-yellow-100 text-yellow-700", icon: Coffee },
      overtime: { label: "연장 중", className: "bg-orange-100 text-orange-700", icon: Clock },
    };

    const statusInfo = statusMap[status] || statusMap.working;
    const Icon = statusInfo.icon;

    return (
      <Badge className={statusInfo.className}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">작업 현황을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 통계 계산
  const workingCount = activeSessions?.filter((s: any) => s.status === "working").length || 0;
  const breakCount = activeSessions?.filter((s: any) => s.status === "break").length || 0;
  const overtimeCount = activeSessions?.filter((s: any) => s.status === "overtime").length || 0;
  const needsBreakCount = activeSessions?.filter((s: any) => 
    s.status === "working" && needsBreak(s.startTime, s.lastBreakTime)
  ).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">작업 현황 모니터링</h1>
          <p className="text-muted-foreground mt-1">
            현재 작업 중인 장비 및 인력의 실시간 현황을 확인합니다.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">현재 시각</p>
          <p className="text-2xl font-bold">{currentTime.toLocaleTimeString("ko-KR")}</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">작업 중</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingCount}</div>
            <p className="text-xs text-muted-foreground">현재 작업 중인 인력</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">휴식 중</CardTitle>
            <Coffee className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breakCount}</div>
            <p className="text-xs text-muted-foreground">현재 휴식 중인 인력</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연장 작업</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overtimeCount}</div>
            <p className="text-xs text-muted-foreground">연장 작업 중인 인력</p>
          </CardContent>
        </Card>

        <Card className={needsBreakCount > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">휴식 필요</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{needsBreakCount}</div>
            <p className="text-xs text-muted-foreground">4시간 이상 작업</p>
          </CardContent>
        </Card>
      </div>

      {/* 작업 현황 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 작업 현황</CardTitle>
          <CardDescription>
            현재 작업 중인 모든 인력의 상세 정보 (실시간 업데이트)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeSessions || activeSessions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">작업 중인 인력이 없습니다</h3>
              <p className="text-muted-foreground">
                현재 활성 작업 세션이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions?.map((session: any) => {
                const showBreakWarning = session.status === "working" && needsBreak(session.startTime, session.lastBreakTime);
                
                return (
                  <div
                    key={session.id}
                    className={`p-4 border rounded-lg hover:bg-accent transition-colors ${
                      showBreakWarning ? "border-red-300 bg-red-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(session.status)}
                          {showBreakWarning && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              휴식 필요
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">작업자</p>
                            <p className="font-medium flex items-center gap-2">
                              <HardHat className="h-4 w-4" />
                              {session.workers?.name || "Unknown"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">장비</p>
                            <p className="font-medium flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              {session.equipment?.reg_num || "미배정"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">작업 시작</p>
                            <p className="font-medium">
                              {new Date(session.startTime).toLocaleString("ko-KR")}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">경과 시간</p>
                            <p className="font-medium text-lg">
                              {calculateElapsedTime(session.startTime)}
                            </p>
                          </div>

                          {session.lastBreakTime && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">마지막 휴식</p>
                              <p className="font-medium">
                                {new Date(session.lastBreakTime).toLocaleString("ko-KR")}
                              </p>
                            </div>
                          )}

                          {session.breakDuration && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">총 휴식 시간</p>
                              <p className="font-medium">
                                {Math.floor(session.breakDuration / 60)}분
                              </p>
                            </div>
                          )}
                        </div>

                        {showBreakWarning && (
                          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            연속 작업 시간이 4시간을 초과했습니다. 휴식이 필요합니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 휴식 시간 준수 안내 */}
      <Card>
        <CardHeader>
          <CardTitle>휴식 시간 준수 기준</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>근로기준법 제54조</strong> (휴게)
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>4시간 근로 시 30분 이상의 휴게시간 부여</li>
              <li>8시간 근로 시 1시간 이상의 휴게시간 부여</li>
              <li>휴게시간은 근로자가 자유롭게 이용 가능</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              시스템은 연속 작업 시간이 4시간을 초과하면 자동으로 경고를 표시합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

