import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  HardHat, 
  Truck, 
  Users, 
  Activity,
  TrendingUp,
  Shield
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: equipmentList } = trpc.equipment.list.useQuery();
  const { data: workersList } = trpc.workers.list.useQuery();
  const { data: expiringDocs } = trpc.docsCompliance.getExpiring.useQuery({ daysAhead: 30 });
  const { data: workJournals } = trpc.workJournal.list.useQuery();
  const { data: entryRequests } = trpc.entryRequests.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();

  const pendingWorkJournals = workJournals?.filter((j) => j.status === "pending") || [];
  const pendingEntryRequests = entryRequests?.filter((r) => 
    r.status === "pending" || r.status === "owner_approved" || r.status === "bp_approved"
  ) || [];

  // 장비 상태별 통계
  const equipmentByStatus = {
    idle: equipmentList?.filter(e => e.status === "idle").length || 0,
    operating: equipmentList?.filter(e => e.status === "operating").length || 0,
    maintenance: equipmentList?.filter(e => e.status === "maintenance").length || 0,
  };

  // 인력 면허 상태 통계
  const workersWithValidLicense = workersList?.filter(w => w.licenseStatus === "valid").length || 0;
  const workersWithExpiredLicense = workersList?.filter(w => w.licenseStatus === "expired").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">관리자 대시보드</h1>
        <p className="text-muted-foreground">
          시스템 전체 현황을 확인하고 관리할 수 있습니다.
        </p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 장비</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              운영중 {equipmentByStatus.operating} · 유휴 {equipmentByStatus.idle}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 인력</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workersList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              유효 면허 {workersWithValidLicense} · 만료 {workersWithExpiredLicense}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">등록된 사용자 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {pendingEntryRequests.length + pendingWorkJournals.length}
            </div>
            <p className="text-xs text-muted-foreground">
              반입 {pendingEntryRequests.length} · 작업 {pendingWorkJournals.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 경고 및 알림 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              만료 예정 서류
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{expiringDocs?.length || 0}</div>
            <p className="text-sm text-orange-600">30일 이내 만료 예정</p>
            <Link href="/documents" className="mt-2 inline-block text-sm text-orange-700 underline">
              자세히 보기 →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <FileText className="h-5 w-5" />
              반입 요청 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{pendingEntryRequests.length}</div>
            <p className="text-sm text-blue-600">승인 대기 중</p>
            <Link href="/entry-requests" className="mt-2 inline-block text-sm text-blue-700 underline">
              자세히 보기 →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Activity className="h-5 w-5" />
              작업 확인서 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{pendingWorkJournals.length}</div>
            <p className="text-sm text-purple-600">승인 대기 중</p>
            <Link href="/work-journal" className="mt-2 inline-block text-sm text-purple-700 underline">
              자세히 보기 →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 상세 정보 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 만료 예정 서류</CardTitle>
            <CardDescription>30일 이내 만료 예정인 서류 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringDocs && expiringDocs.length > 0 ? (
              <div className="space-y-2">
                {expiringDocs.slice(0, 5).map((doc) => {
                  const daysRemaining = doc.expiryDate
                    ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const isUrgent = daysRemaining <= 7;
                  
                  return (
                    <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <FileText className={`h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-orange-500'}`} />
                        <div>
                          <div className="text-sm font-medium">{doc.docName}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.targetType === "equipment" ? "장비" : "인력"} 서류
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs ${isUrgent ? 'text-red-500 font-semibold' : 'text-orange-500'}`}>
                        {daysRemaining}일 남음
                      </span>
                    </div>
                  );
                })}
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
            <CardTitle>대기 중인 승인 요청</CardTitle>
            <CardDescription>처리가 필요한 요청 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingEntryRequests.length > 0 || pendingWorkJournals.length > 0 ? (
              <div className="space-y-2">
                {pendingEntryRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">반입 요청 {request.requestNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      {request.status === "pending" ? "대기중" : 
                       request.status === "owner_approved" ? "Owner 승인" :
                       request.status === "bp_approved" ? "BP 승인" : "처리중"}
                    </span>
                  </div>
                ))}
                {pendingWorkJournals.slice(0, 2).map((journal) => (
                  <div key={journal.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="text-sm font-medium">작업 확인서</div>
                        <div className="text-xs text-muted-foreground">
                          {journal.workDate ? new Date(journal.workDate).toLocaleDateString("ko-KR") : "-"}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">대기중</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                대기 중인 요청이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 관리 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/users" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-sm font-medium">사용자 관리</span>
            </Link>
            <Link href="/admin/equip-types" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
              <Truck className="h-8 w-8 text-green-500" />
              <span className="text-sm font-medium">장비 종류</span>
            </Link>
            <Link href="/admin/worker-types" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
              <HardHat className="h-8 w-8 text-orange-500" />
              <span className="text-sm font-medium">인력 유형</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

