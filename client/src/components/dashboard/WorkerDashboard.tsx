import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Plus,
  Calendar,
  XCircle
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { data: workJournals } = trpc.workJournal.list.useQuery();
  const { data: workerInfo } = trpc.workers.getById.useQuery({ id: user?.id || "" }, {
    enabled: !!user?.id
  });
  const { data: expiringDocs } = trpc.docsCompliance.getExpiring.useQuery({ daysAhead: 30 });

  // 내 작업 확인서만 필터링
  const myJournals = workJournals || [];
  const pendingJournals = myJournals.filter(j => j.status === "pending");
  const approvedJournals = myJournals.filter(j => j.status === "approved");
  const rejectedJournals = myJournals.filter(j => j.status === "rejected");

  // 내 서류만 필터링
  const myDocs = expiringDocs?.filter(doc => doc.workerId === user?.id) || [];

  // 서류 상태별 분류
  const urgentDocs = myDocs.filter(doc => {
    if (!doc.expiryDate) return false;
    const daysRemaining = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 7;
  });

  const getStatusBadge = (status: string) => {
    if (status === "pending") return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">대기중</Badge>;
    if (status === "approved") return <Badge variant="default" className="bg-green-100 text-green-700">승인</Badge>;
    if (status === "rejected") return <Badge variant="destructive">반려</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">운전자 대시보드</h1>
        <p className="text-muted-foreground">
          {user?.name || "사용자"}님의 작업 현황 및 서류 상태를 확인할 수 있습니다.
        </p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 작업 확인서</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myJournals.length}</div>
            <p className="text-xs text-muted-foreground">제출한 작업 확인서</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingJournals.length}</div>
            <p className="text-xs text-muted-foreground">검토 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedJournals.length}</div>
            <p className="text-xs text-muted-foreground">승인됨</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">만료 예정 서류</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{myDocs.length}</div>
            <p className="text-xs text-muted-foreground">
              긴급 {urgentDocs.length}건
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 긴급 알림 */}
      {urgentDocs.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              긴급: 서류 만료 임박
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentDocs.map((doc) => {
                const daysRemaining = doc.expiryDate
                  ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                
                return (
                  <div key={doc.id} className="flex items-center justify-between border-b border-red-200 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="text-sm font-medium text-red-900">{doc.docName}</div>
                        <div className="text-xs text-red-600">
                          만료일: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("ko-KR") : "-"}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-red-600">
                      {daysRemaining}일 남음
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Link href="/documents">
                <Button variant="destructive" size="sm" className="w-full">
                  서류 갱신하러 가기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 작업 확인서 상태 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Clock className="h-5 w-5" />
              승인 대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">{pendingJournals.length}</div>
            <p className="text-sm text-yellow-600">협력사 검토 중</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              승인 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{approvedJournals.length}</div>
            <p className="text-sm text-green-600">정산 가능</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              반려
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{rejectedJournals.length}</div>
            <p className="text-sm text-red-600">수정 필요</p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 정보 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 작업 확인서</CardTitle>
            <CardDescription>최근 제출한 작업 확인서 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {myJournals.length > 0 ? (
              <div className="space-y-2">
                {myJournals.slice(0, 5).map((journal) => (
                  <div key={journal.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{journal.siteName}</div>
                        <div className="text-xs text-muted-foreground">
                          {journal.workDate ? new Date(journal.workDate).toLocaleDateString("ko-KR") : "-"}
                          {" · "}
                          {journal.startTime} - {journal.endTime}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(journal.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <FileText className="mr-2 h-4 w-4" />
                작업 확인서가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내 서류 상태</CardTitle>
            <CardDescription>만료 예정 서류 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {myDocs.length > 0 ? (
              <div className="space-y-2">
                {myDocs.slice(0, 5).map((doc) => {
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
                            만료일: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("ko-KR") : "-"}
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
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/work-journal">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Plus className="h-8 w-8 text-blue-500" />
                <span className="text-sm font-medium">작업 확인서 제출</span>
              </a>
            </Link>
            <Link href="/documents">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <FileText className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium">내 서류 관리</span>
              </a>
            </Link>
            <Link href="/work-journal">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Calendar className="h-8 w-8 text-green-500" />
                <span className="text-sm font-medium">작업 이력 조회</span>
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

