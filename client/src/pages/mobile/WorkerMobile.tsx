import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Clock, 
  Coffee, 
  StopCircle,
  Camera,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  MapPin,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";

type WorkStatus = "idle" | "working" | "resting" | "overtime" | "finished";

export default function WorkerMobile() {
  const { user } = useAuth();
  const [workStatus, setWorkStatus] = useState<WorkStatus>("idle");
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 경과 시간 계산
  useEffect(() => {
    if (workStatus === "working" || workStatus === "overtime") {
      const interval = setInterval(() => {
        if (workStartTime) {
          const elapsed = Math.floor((new Date().getTime() - workStartTime.getTime()) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [workStatus, workStartTime]);

  // 위치 추적 (5분 간격)
  useEffect(() => {
    if (workStatus === "working" || workStatus === "overtime") {
      // 즉시 위치 전송
      sendLocation();
      
      // 5분마다 위치 전송
      const interval = setInterval(() => {
        sendLocation();
      }, 5 * 60 * 1000); // 5분
      
      return () => clearInterval(interval);
    }
  }, [workStatus]);

  const sendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(location);
          console.log('[위치 전송]', location);
          // TODO: 서버로 위치 정보 전송
        },
        (error) => {
          console.error('[위치 오류]', error);
        }
      );
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWorkStart = () => {
    setWorkStatus("working");
    setWorkStartTime(new Date());
    setElapsedTime(0);
  };

  const handleRestStart = () => {
    setWorkStatus("resting");
  };

  const handleRestEnd = () => {
    setWorkStatus("working");
  };

  const handleOvertimeStart = () => {
    setWorkStatus("overtime");
  };

  const handleWorkEnd = () => {
    setWorkStatus("finished");
    // TODO: 작업 종료 처리
  };

  const getStatusBadge = () => {
    switch (workStatus) {
      case "idle":
        return <Badge variant="secondary">대기중</Badge>;
      case "working":
        return <Badge className="bg-green-500">근무중</Badge>;
      case "resting":
        return <Badge className="bg-yellow-500">휴식중</Badge>;
      case "overtime":
        return <Badge className="bg-orange-500">연장근무</Badge>;
      case "finished":
        return <Badge variant="outline">작업완료</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{user?.name || "운전자"}</h1>
            <p className="text-sm text-blue-100">현장 작업 관리</p>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 근무 시간 카드 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                근무 시간
              </span>
              {currentLocation && (
                <MapPin className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                {workStartTime ? `시작: ${workStartTime.toLocaleTimeString('ko-KR')}` : "근무를 시작하세요"}
              </div>
            </div>

            {/* 근무 제어 버튼 */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {workStatus === "idle" && (
                <Button 
                  onClick={handleWorkStart}
                  className="col-span-2 h-14 text-lg bg-green-600 hover:bg-green-700"
                >
                  <Play className="mr-2 h-5 w-5" />
                  근무 시작
                </Button>
              )}

              {workStatus === "working" && (
                <>
                  <Button 
                    onClick={handleRestStart}
                    variant="outline"
                    className="h-14"
                  >
                    <Coffee className="mr-2 h-4 w-4" />
                    휴식 시작
                  </Button>
                  <Button 
                    onClick={handleOvertimeStart}
                    variant="outline"
                    className="h-14"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    연장 시작
                  </Button>
                </>
              )}

              {workStatus === "resting" && (
                <Button 
                  onClick={handleRestEnd}
                  className="col-span-2 h-14 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="mr-2 h-5 w-5" />
                  근무 재개
                </Button>
              )}

              {(workStatus === "working" || workStatus === "overtime" || workStatus === "resting") && (
                <Button 
                  onClick={handleWorkEnd}
                  variant="destructive"
                  className="col-span-2 h-14"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  작업 종료
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 빠른 메뉴 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">빠른 메뉴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/mobile/document-upload">
              <a className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Camera className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">서류 업로드</div>
                    <div className="text-sm text-muted-foreground">사진 촬영 및 업로드</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </a>
            </Link>

            <Link href="/mobile/inspection-log">
              <a className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">점검 일지</div>
                    <div className="text-sm text-muted-foreground">일일 점검 및 서명</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </a>
            </Link>

            <Link href="/mobile/work-log">
              <a className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium">작업 일지</div>
                    <div className="text-sm text-muted-foreground">일별/월별 작업 기록</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </a>
            </Link>
          </CardContent>
        </Card>

        {/* 긴급 신고 버튼 */}
        <Button 
          variant="destructive"
          className="w-full h-16 text-lg shadow-lg"
          onClick={() => {
            // TODO: 긴급 신고 처리
            alert('긴급 신고가 접수되었습니다!');
          }}
        >
          <AlertTriangle className="mr-2 h-6 w-6" />
          긴급 상황 신고
        </Button>

        {/* 오늘의 작업 정보 */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">오늘의 작업</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">현장</span>
                <span className="font-medium">서울 강남구 현장</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">장비</span>
                <span className="font-medium">굴삭기 #123</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">작업 내용</span>
                <span className="font-medium">토공 작업</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

