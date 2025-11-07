import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import EntryRequestApprovalDialog from "@/components/EntryRequestApprovalDialog";
import EntryRequestDetailDialog from "@/components/EntryRequestDetailDialog";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  HardHat, 
  Truck,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Link } from "wouter";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; requestNumber: string } | null>(null);
  const [approvalType, setApprovalType] = useState<"owner" | "ep" | "reject">("owner");
  const { data: equipmentList } = trpc.equipment.list.useQuery();
  const { data: workersList } = trpc.workers.list.useQuery();
  const { data: expiringDocs } = trpc.docsCompliance.getExpiring.useQuery({ daysAhead: 30 });
  const { data: entryRequests } = trpc.entryRequests.list.useQuery();

  // 내 장비만 필터링
  const myEquipment = equipmentList?.filter(e => e.ownerId === user?.id) || [];
  const myWorkers = workersList?.filter(w => w.ownerId === user?.id) || [];
  
  // 내 장비/인력 관련 서류만 필터링
  const myExpiringDocs = expiringDocs?.filter(doc => 
    (doc.equipmentId && myEquipment.some(e => e.id === doc.equipmentId)) ||
    (doc.workerId && myWorkers.some(w => w.id === doc.workerId))
  ) || [];

  // 내 장비/인력 관련 반입 요청만 필터링
  const myPendingRequests = entryRequests?.filter(r => 
    r.status === "pending" && 
    ((r.equipmentId && myEquipment.some(e => e.id === r.equipmentId)) ||
     (r.workerId && myWorkers.some(w => w.id === r.workerId)))
  ) || [];

  // 장비 상태별 통계
  const equipmentByStatus = {
    idle: myEquipment.filter(e => e.status === "idle").length,
    operating: myEquipment.filter(e => e.status === "operating").length,
    maintenance: myEquipment.filter(e => e.status === "maintenance").length,
  };

  // 인력 면허 상태 통계
  const workersWithValidLicense = myWorkers.filter(w => w.licenseStatus === "valid").length;
  const workersWithExpiredLicense = myWorkers.filter(w => w.licenseStatus === "expired").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">임대사업자 대시보드</h1>
        <p className="text-muted-foreground">
          {user?.name || "사용자"}님의 장비 및 인력 현황을 확인할 수 있습니다.
        </p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">내 장비</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEquipment.length}</div>
            <p className="text-xs text-muted-foreground">
              운영중 {equipmentByStatus.operating} · 유휴 {equipmentByStatus.idle}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">내 인력</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myWorkers.length}</div>
            <p className="text-xs text-muted-foreground">
              유효 {workersWithValidLicense} · 만료 {workersWithExpiredLicense}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">만료 예정 서류</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{myExpiringDocs.length}</div>
            <p className="text-xs text-muted-foreground">30일 이내 만료</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{myPendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">반입 요청 대기</p>
          </CardContent>
        </Card>
      </div>

      {/* 장비 상태 차트 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              운영 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{equipmentByStatus.operating}</div>
            <p className="text-sm text-green-600">현재 현장에서 운영 중인 장비</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Truck className="h-5 w-5" />
              유휴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{equipmentByStatus.idle}</div>
            <p className="text-sm text-blue-600">투입 가능한 장비</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              점검 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{equipmentByStatus.maintenance}</div>
            <p className="text-sm text-orange-600">정비 및 점검 중인 장비</p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 정보 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>만료 예정 서류</CardTitle>
            <CardDescription>30일 이내 만료 예정인 서류 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {myExpiringDocs.length > 0 ? (
              <div className="space-y-2">
                {myExpiringDocs.slice(0, 5).map((doc) => {
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
            <CardTitle>승인 대기 중인 반입 요청</CardTitle>
            <CardDescription>검토가 필요한 반입 요청</CardDescription>
          </CardHeader>
          <CardContent>
            {myPendingRequests.length > 0 ? (
              <div className="space-y-2">
                {myPendingRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">반입 요청 {request.requestNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedRequest({ id: request.id, requestNumber: request.requestNumber });
                          setDetailDialogOpen(true);
                        }}
                      >
                        상세
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedRequest({ id: request.id, requestNumber: request.requestNumber });
                          setApprovalType("owner");
                          setApprovalDialogOpen(true);
                        }}
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        onClick={() => {
                          setSelectedRequest({ id: request.id, requestNumber: request.requestNumber });
                          setApprovalType("reject");
                          setApprovalDialogOpen(true);
                        }}
                      >
                        반려
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                대기 중인 반입 요청이 없습니다.
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
          <div className="grid gap-4 md:grid-cols-4">
            <Link href="/equipment">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Truck className="h-8 w-8 text-blue-500" />
                <span className="text-sm font-medium">장비 관리</span>
              </a>
            </Link>
            <Link href="/workers">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <HardHat className="h-8 w-8 text-green-500" />
                <span className="text-sm font-medium">인력 관리</span>
              </a>
            </Link>
            <Link href="/documents">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <FileText className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium">서류 관리</span>
              </a>
            </Link>
            <Link href="/entry-requests">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Clock className="h-8 w-8 text-purple-500" />
                <span className="text-sm font-medium">반입 요청</span>
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 승인 다이얼로그 */}
      {selectedRequest && (
        <>
          <EntryRequestApprovalDialog
            open={approvalDialogOpen}
            onOpenChange={setApprovalDialogOpen}
            requestId={selectedRequest.id}
            requestNumber={selectedRequest.requestNumber}
            approvalType={approvalType}
            onSuccess={() => {
              setSelectedRequest(null);
            }}
          />
          <EntryRequestDetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            requestId={selectedRequest.id}
          />
        </>
      )}
    </div>
  );
}

