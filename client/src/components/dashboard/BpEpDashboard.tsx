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
  Shield,
  Activity
} from "lucide-react";
import { Link } from "wouter";

interface BpEpDashboardProps {
  role: "bp" | "ep";
}

export default function BpEpDashboard({ role }: BpEpDashboardProps) {
  const { user } = useAuth();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ id: string; requestNumber: string } | null>(null);
  const [approvalType, setApprovalType] = useState<"owner" | "bp" | "ep" | "reject">("ep");
  const { data: entryRequests } = trpc.entryRequestsV2.list.useQuery();
  const { data: workJournals } = trpc.workJournal.list.useQuery();
  const { data: equipmentList } = trpc.equipment.list.useQuery();
  const { data: workersList } = trpc.workers.list.useQuery();

  const isBp = role === "bp";
  const isEp = role === "ep";

  // 역할별 대기 중인 요청 필터링
  const myPendingRequests = entryRequests?.filter(r => {
    if (isBp) {
      // BP: owner_requested 상태의 요청 (Owner가 BP에게 요청한 상태)
      return r.status === "owner_requested";
    } else {
      // EP: bp_approved 또는 ep_reviewing 상태의 요청 (EP가 최종 승인해야 함)
      return r.status === "bp_approved" || r.status === "ep_reviewing";
    }
  }) || [];

  // 내가 제출한 요청 (BP만)
  const mySubmittedRequests = isBp 
    ? entryRequests?.filter(r => r.requestedBy === user?.id) || []
    : [];

  // 승인 완료된 요청
  const approvedRequests = entryRequests?.filter(r => r.status === "ep_approved") || [];

  // 반려된 요청
  const rejectedRequests = entryRequests?.filter(r => r.status === "rejected") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isBp ? "협력사" : "시행사"} 대시보드
        </h1>
        <p className="text-muted-foreground">
          {user?.name || "사용자"}님의 {isBp ? "반입 요청 및 승인" : "최종 승인"} 현황을 확인할 수 있습니다.
        </p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isBp && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내 요청</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mySubmittedRequests.length}</div>
              <p className="text-xs text-muted-foreground">제출한 반입 요청</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{myPendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              {isBp ? "BP 승인 대기" : "EP 최종 승인 대기"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승인 완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">최종 승인 완료</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">반려</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{rejectedRequests.length}</div>
            <p className="text-xs text-muted-foreground">반려된 요청</p>
          </CardContent>
        </Card>
      </div>

      {/* 승인 프로세스 안내 */}
      <Card className={isBp ? "border-blue-200 bg-blue-50" : "border-purple-200 bg-purple-50"}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isBp ? "text-blue-700" : "text-purple-700"}`}>
            <Shield className="h-5 w-5" />
            {isBp ? "BP 승인 프로세스" : "EP 최종 승인 프로세스"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isBp ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-blue-700">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-medium">반입 요청 제출</div>
                    <div className="text-xs text-muted-foreground">장비 및 인력 투입 요청</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-blue-700">
                    2
                  </div>
                  <div>
                    <div className="text-sm font-medium">Owner 서류 확인</div>
                    <div className="text-xs text-muted-foreground">장비 운영사의 서류 검토 및 승인</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-medium">BP 작업계획서 첨부 및 승인</div>
                    <div className="text-xs text-muted-foreground">작업계획서 첨부 후 승인 (현재 단계)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                    4
                  </div>
                  <div>
                    <div className="text-sm font-medium">EP 최종 승인</div>
                    <div className="text-xs text-muted-foreground">시행사의 최종 승인</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-medium">반입 요청 제출</div>
                    <div className="text-xs text-muted-foreground">협력사의 반입 요청</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                    2
                  </div>
                  <div>
                    <div className="text-sm font-medium">Owner 서류 확인</div>
                    <div className="text-xs text-muted-foreground">장비 운영사의 서류 검토</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-500">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-medium">BP 작업계획서 첨부</div>
                    <div className="text-xs text-muted-foreground">협력사의 작업계획서 첨부</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                    4
                  </div>
                  <div>
                    <div className="text-sm font-medium">EP 최종 승인</div>
                    <div className="text-xs text-muted-foreground">시행사의 최종 승인 (현재 단계)</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>승인 대기 중인 요청</CardTitle>
            <CardDescription>
              {isBp ? "작업계획서를 첨부하고 승인해주세요" : "최종 승인이 필요한 요청"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myPendingRequests.length > 0 ? (
              <div className="space-y-2">
                {myPendingRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className={`h-4 w-4 ${isBp ? "text-blue-500" : "text-purple-500"}`} />
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
                    {isEp ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedRequest({ id: request.id, requestNumber: request.requestNumber });
                            setApprovalType("ep");
                            setApprovalDialogOpen(true);
                          }}
                        >
                          최종 승인
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
                    ) : isBp ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            setSelectedRequest({ id: request.id, requestNumber: request.requestNumber });
                            setApprovalType("bp");
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
                    ) : (
                      <span className="rounded-full px-2 py-1 text-xs bg-purple-100 text-purple-700">
                        대기중
                      </span>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                승인 대기 중인 요청이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {isBp && (
          <Card>
            <CardHeader>
              <CardTitle>내가 제출한 요청</CardTitle>
              <CardDescription>진행 상황을 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              {mySubmittedRequests.length > 0 ? (
                <div className="space-y-2">
                  {mySubmittedRequests.slice(0, 5).map((request) => {
                    const statusText = 
                      request.status === "pending" ? "Owner 검토중" :
                      request.status === "owner_approved" ? "BP 승인 대기" :
                      request.status === "bp_approved" ? "EP 승인 대기" :
                      request.status === "ep_approved" ? "승인 완료" :
                      request.status === "rejected" ? "반려" : "처리중";
                    
                    const statusColor =
                      request.status === "ep_approved" ? "bg-green-100 text-green-700" :
                      request.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700";

                    return (
                      <div key={request.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">반입 요청 {request.requestNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                            </div>
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  제출한 요청이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isEp && (
          <Card>
            <CardHeader>
              <CardTitle>최근 승인 완료</CardTitle>
              <CardDescription>최종 승인된 반입 요청</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedRequests.length > 0 ? (
                <div className="space-y-2">
                  {approvedRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium">반입 요청 {request.requestNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {request.epApprovedAt ? new Date(request.epApprovedAt).toLocaleDateString("ko-KR") : "-"}
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        승인 완료
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  승인 완료된 요청이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/entry-requests" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
              <FileText className={`h-8 w-8 ${isBp ? "text-blue-500" : "text-purple-500"}`} />
              <span className="text-sm font-medium">
                {isBp ? "반입 요청 관리" : "승인 요청 관리"}
              </span>
            </Link>
            <Link href="/equipment" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
              <Truck className="h-8 w-8 text-green-500" />
              <span className="text-sm font-medium">장비 현황</span>
            </Link>
            <Link href="/workers" className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
              <HardHat className="h-8 w-8 text-orange-500" />
              <span className="text-sm font-medium">인력 현황</span>
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

