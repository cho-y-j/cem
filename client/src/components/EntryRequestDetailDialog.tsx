/**
 * 반입 요청 상세 보기 다이얼로그
 * - 요청 정보, 장비/인력 목록, 서류 상태 표시
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  User, 
  Truck, 
  Calendar, 
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface EntryRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
}

export default function EntryRequestDetailDialog({
  open,
  onOpenChange,
  requestId,
}: EntryRequestDetailDialogProps) {
  const { data: request, isLoading } = trpc.entryRequests.getById.useQuery(
    { id: requestId },
    { enabled: open && !!requestId }
  );

  if (!request && !isLoading) return null;

  // 상태 배지
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      bp_requested: { label: "BP 요청", className: "bg-blue-100 text-blue-700" },
      owner_approved: { label: "Owner 승인", className: "bg-green-100 text-green-700" },
      ep_approved: { label: "최종 승인", className: "bg-purple-100 text-purple-700" },
      rejected: { label: "반려", className: "bg-red-100 text-red-700" },
    };
    const s = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  // 서류 상태 배지
  const getDocumentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: any; className: string }> = {
      valid: { label: "정상", icon: CheckCircle, className: "text-green-600" },
      warning: { label: "경고", icon: AlertCircle, className: "text-yellow-600" },
      expired: { label: "만료", icon: XCircle, className: "text-red-600" },
      missing: { label: "누락", icon: XCircle, className: "text-red-600" },
      pending: { label: "대기", icon: Clock, className: "text-gray-600" },
    };
    const s = statusMap[status] || { label: status, icon: FileText, className: "text-gray-600" };
    const Icon = s.icon;
    return (
      <div className={`flex items-center gap-1 ${s.className}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs">{s.label}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            반입 요청 상세 정보
          </DialogTitle>
          <DialogDescription>
            {request ? `요청 번호: ${request.requestNumber}` : "로딩 중..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : request ? (
          <div className="space-y-6">
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">요청 번호:</span>
                    <span className="font-medium">{request.requestNumber}</span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">협력사:</span>
                  <span className="font-medium">{request.bpCompanyName || "정보 없음"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">요청자:</span>
                  <span className="font-medium">{request.bpUserName || "정보 없음"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">요청일:</span>
                  <span className="font-medium">
                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString("ko-KR") : "-"}
                  </span>
                </div>

                {request.purpose && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">목적:</div>
                    <div className="text-sm rounded-md bg-muted p-2">{request.purpose}</div>
                  </div>
                )}

                {request.requestedStartDate && request.requestedEndDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">반입 기간:</span>
                    <span className="font-medium">
                      {new Date(request.requestedStartDate).toLocaleDateString("ko-KR")} ~{" "}
                      {new Date(request.requestedEndDate).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 장비 목록 */}
            {request.items?.filter((item: any) => item.itemType === "equipment").length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4" />
                    장비 목록 ({request.items.filter((item: any) => item.itemType === "equipment").length}대)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.items
                      .filter((item: any) => item.itemType === "equipment")
                      .map((item: any, index: number) => (
                        <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="text-sm font-medium">장비 #{index + 1}</div>
                              <div className="text-xs text-muted-foreground">ID: {item.itemId}</div>
                            </div>
                          </div>
                          {item.documentStatus && getDocumentStatusBadge(item.documentStatus)}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 인력 목록 */}
            {request.items?.filter((item: any) => item.itemType === "worker").length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    인력 목록 ({request.items.filter((item: any) => item.itemType === "worker").length}명)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {request.items
                      .filter((item: any) => item.itemType === "worker")
                      .map((item: any, index: number) => (
                        <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-sm font-medium">인력 #{index + 1}</div>
                              <div className="text-xs text-muted-foreground">ID: {item.itemId}</div>
                            </div>
                          </div>
                          {item.documentStatus && getDocumentStatusBadge(item.documentStatus)}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 승인 이력 */}
            {(request.ownerApprovedAt || request.epApprovedAt || request.rejectedAt) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">승인 이력</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {request.ownerApprovedAt && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Owner 승인</span>
                        <span className="text-muted-foreground">
                          {new Date(request.ownerApprovedAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      {request.ownerComment && (
                        <div className="ml-6 text-sm text-muted-foreground">{request.ownerComment}</div>
                      )}
                      {request.workPlanFileUrl && (
                        <div className="ml-6 text-sm">
                          <a
                            href={request.workPlanFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            작업계획서 보기
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {request.epApprovedAt && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">EP 최종 승인</span>
                        <span className="text-muted-foreground">
                          {new Date(request.epApprovedAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      {request.epComment && (
                        <div className="ml-6 text-sm text-muted-foreground">{request.epComment}</div>
                      )}
                    </div>
                  )}

                  {request.rejectedAt && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">반려</span>
                        <span className="text-muted-foreground">
                          {new Date(request.rejectedAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      {request.rejectReason && (
                        <div className="ml-6 text-sm text-red-600">{request.rejectReason}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

