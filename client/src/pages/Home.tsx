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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 장비</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">등록된 장비 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 인력</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workersList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">등록된 인력 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">만료 예정 서류</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{expiringDocs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">30일 이내 만료</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중 작업확인서</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWorkJournals.length}</div>
            <p className="text-xs text-muted-foreground">승인 대기 중</p>
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

