import { Capacitor } from "@capacitor/core";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import BpEpDashboard from "@/components/dashboard/BpEpDashboard";
import WorkerDashboard from "@/components/dashboard/WorkerDashboard";
import InspectorDashboard from "@/components/dashboard/InspectorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Clock, FileText, HardHat, Truck } from "lucide-react";

// Worker와 Inspector를 위한 기본 대시보드
function DefaultDashboard() {
  const { user } = useAuth();
  const { data: equipmentList } = trpc.equipment.list.useQuery();
  const { data: workersList } = trpc.workers.list.useQuery();
  const { data: expiringDocs } = trpc.docsCompliance.getExpiring.useQuery({ daysAhead: 30 });
  const { data: workJournals } = trpc.workJournal.list.useQuery();

  const pendingWorkJournals = workJournals?.filter((j) => j.status === "pending") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground">
          {user?.name || "사용자"}님, 환영합니다. 건설현장 장비·인력 통합관리 시스템입니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 장비</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">{equipmentList?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">등록된 장비 수</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 인력</CardTitle>
            <div className="p-2 rounded-lg bg-green-50">
              <HardHat className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent">{workersList?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">등록된 인력 수</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">만료 예정 서류</CardTitle>
            <div className="p-2 rounded-lg bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent">{expiringDocs?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">30일 이내 만료</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중 작업확인서</CardTitle>
            <div className="p-2 rounded-lg bg-purple-50">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent">{pendingWorkJournals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">승인 대기 중</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 만료 예정 서류</CardTitle>
            <CardDescription>30일 이내 만료 예정인 서류 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringDocs && expiringDocs.length > 0 ? (
              <div className="space-y-2">
                {expiringDocs.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">
                          {doc.targetType === "equipment" ? "장비" : "인력"} 서류
                        </div>
                        <div className="text-xs text-muted-foreground">
                          만료일: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("ko-KR") : "-"}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-orange-500">
                      {doc.expiryDate
                        ? `${Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 남음`
                        : "-"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                만료 예정 서류가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>대기 중인 작업확인서</CardTitle>
            <CardDescription>승인 대기 중인 작업확인서 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingWorkJournals.length > 0 ? (
              <div className="space-y-2">
                {pendingWorkJournals.slice(0, 5).map((journal) => (
                  <div key={journal.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{journal.siteName}</div>
                        <div className="text-xs text-muted-foreground">
                          {journal.workDate ? new Date(journal.workDate).toLocaleDateString("ko-KR") : "-"}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">대기중</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                대기 중인 작업확인서가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 모바일 앱(Capacitor)인 경우 모바일 전용 페이지로 리다이렉트
  useEffect(() => {
    if (Capacitor.isNativePlatform() && user) {
      if (user.role === "worker") {
        setLocation("/mobile/worker");
      } else if (user.role === "inspector") {
        setLocation("/mobile/inspector");
      }
      // 다른 역할(admin, owner 등)은 모바일에서도 데스크탑 뷰 유지 (또는 필요시 추가)
    }
  }, [user, setLocation]);

  // 모바일 앱이면 리다이렉트 중이므로 아무것도 렌더링하지 않음 (깜빡임 방지)
  if (Capacitor.isNativePlatform() && (user?.role === "worker" || user?.role === "inspector")) {
    return null;
  }

  // 역할별 대시보드 렌더링
  switch (user?.role) {
    case "admin":
      return <AdminDashboard />;
    case "owner":
      return <OwnerDashboard />;
    case "bp":
      return <BpEpDashboard role="bp" />;
    case "ep":
      return <BpEpDashboard role="ep" />;
    case "worker":
      return <WorkerDashboard />;
    case "inspector":
      return <InspectorDashboard />;
    default:
      return <DefaultDashboard />;
  }
}

