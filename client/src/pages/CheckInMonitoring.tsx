import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, MapPin, Clock, Users, Calendar, RefreshCw, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function CheckInMonitoring() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  // 오늘 출근 통계
  const { data: todayStats, refetch, isLoading } = trpc.checkIn.getTodayStats.useQuery();

  // 필터링된 출근 기록
  const filteredCheckIns = todayStats?.checkIns?.filter((checkIn) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const userName = (checkIn as any).user?.name || '';
    const workZoneName = (checkIn as any).workZone?.name || '';
    return userName.toLowerCase().includes(searchLower) ||
           workZoneName.toLowerCase().includes(searchLower);
  }) || [];

  const formatTime = (dateStr: string | Date) => {
    return format(new Date(dateStr), "HH:mm", { locale: ko });
  };

  const formatDate = (dateStr: string | Date) => {
    return format(new Date(dateStr), "yyyy년 MM월 dd일 (EEE)", { locale: ko });
  };

  // 엑셀 다운로드
  const handleExportToExcel = async () => {
    try {
      const result = await trpc.checkIn.exportToExcel.query({
        startDate: dateFilter ? new Date(dateFilter).toISOString() : undefined,
        endDate: dateFilter ? new Date(new Date(dateFilter).setDate(new Date(dateFilter).getDate() + 1)).toISOString() : undefined,
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
      document.body.removeChild(link);
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

      {/* 날짜 선택 */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="작업자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              향후 WebAuthn 지원 예정
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

      {/* 출근 기록 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>출근 기록</CardTitle>
          <CardDescription>
            오늘 출근한 작업자 목록 ({filteredCheckIns.length}명)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCheckIns.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">아직 출근한 작업자가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCheckIns.map((checkIn) => (
                <div
                  key={checkIn.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {(checkIn as any).user?.name || `작업자 ${checkIn.userId}`}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(checkIn.checkInTime)}
                        </span>
                        {(checkIn as any).workZone?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {(checkIn as any).workZone.name}
                          </span>
                        )}
                        {checkIn.distanceFromZone !== null && checkIn.distanceFromZone !== undefined && (
                          <span className="text-xs">
                            ({checkIn.distanceFromZone}m)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {checkIn.isWithinZone ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        구역 내
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                        <XCircle className="mr-1 h-3 w-3" />
                        구역 외
                      </Badge>
                    )}
                    {checkIn.webauthnVerified && (
                      <Badge variant="outline" className="border-blue-200 text-blue-700">
                        생체인증
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
