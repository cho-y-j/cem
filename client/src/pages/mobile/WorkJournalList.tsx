import { useState } from "react";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * Worker 작업확인서 목록 페이지 (모바일)
 * 자신이 제출한 작업확인서 목록과 상태 확인
 */
export default function WorkJournalList() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 작업확인서 목록 조회
  const { data: journals, isLoading } = trpc.workJournal.myList.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // 상태별 뱃지 스타일
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_bp":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            BP 승인 대기
          </Badge>
        );
      case "bp_approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            승인 완료
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            반려됨
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  return (
    <MobileLayout title="작업확인서 목록" showBack>
      <div className="p-4 space-y-4">
        {/* 필터 섹션 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              상태 필터
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending_bp">BP 승인 대기</SelectItem>
                <SelectItem value="bp_approved">승인 완료</SelectItem>
                <SelectItem value="rejected">반려됨</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 목록 섹션 */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">목록을 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : !journals || journals.length === 0 ? (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-blue-400" />
              <p className="font-medium text-blue-900 mb-2">
                {statusFilter === "all"
                  ? "작성한 작업확인서가 없습니다"
                  : "해당 상태의 작업확인서가 없습니다"}
              </p>
              <p className="text-sm text-blue-700 mb-4">
                작업 종료 후 작업확인서를 작성해주세요
              </p>
              <Button
                onClick={() => setLocation("/mobile/work-log")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                작업확인서 작성하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {journals.map((journal) => (
              <Card
                key={journal.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/mobile/work-journal/${journal.id}`)}
              >
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* 상태 및 날짜 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-base">
                            {journal.workDate
                              ? format(new Date(journal.workDate), "yyyy년 MM월 dd일 (E)", {
                                  locale: ko,
                                })
                              : "-"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          제출:{" "}
                          {journal.submittedAt
                            ? format(new Date(journal.submittedAt), "MM/dd HH:mm")
                            : "-"}
                        </p>
                      </div>
                      {getStatusBadge(journal.status)}
                    </div>

                    {/* 현장 정보 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{journal.siteName || "현장명 없음"}</p>
                          <p className="text-muted-foreground text-xs">
                            {journal.workLocation || "-"}
                          </p>
                        </div>
                      </div>

                      {/* 작업 내용 미리보기 */}
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground line-clamp-2">
                          {journal.workContent || journal.workDetails || "-"}
                        </p>
                      </div>

                      {/* 작업 시간 */}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {journal.startTime} ~ {journal.endTime}
                        </span>
                        <span className="text-muted-foreground">
                          ({journal.totalHours || 0}시간)
                        </span>
                      </div>
                    </div>

                    {/* 반려 사유 표시 */}
                    {journal.status === "rejected" && journal.bpComments && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <p className="text-red-800 font-medium mb-1">반려 사유:</p>
                        <p className="text-red-700">{journal.bpComments}</p>
                      </div>
                    )}

                    {/* 장비 정보 */}
                    <div className="flex items-center gap-3 pt-2 border-t text-xs text-muted-foreground">
                      <span>{journal.vehicleNumber || "-"}</span>
                      <span>•</span>
                      <span>{journal.equipmentName || "-"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 새 작업확인서 작성 버튼 */}
        {journals && journals.length > 0 && (
          <Button
            onClick={() => setLocation("/mobile/work-log")}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="mr-2 h-5 w-5" />
            새 작업확인서 작성
          </Button>
        )}
      </div>
    </MobileLayout>
  );
}
