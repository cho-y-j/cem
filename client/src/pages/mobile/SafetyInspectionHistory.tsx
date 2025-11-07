import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, FileText, Calendar, Eye, Filter, Truck, User } from "lucide-react";

export default function SafetyInspectionHistory() {
  const [, setLocation] = useLocation();
  const [searchVehicle, setSearchVehicle] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 점검 내역 조회
  const { data: inspections, isLoading } = trpc.safetyInspection.listInspections.useQuery({
    equipmentId: undefined,
    inspectorId: undefined, // 현재 로그인한 사용자의 것만
    status: undefined,
  });

  // 점검 상세 조회
  const { data: inspectionDetail } = trpc.safetyInspection.getInspection.useQuery(
    { id: selectedInspection?.id || "" },
    { enabled: !!selectedInspection?.id }
  );

  // 필터링된 내역
  const filteredInspections = inspections?.filter((inspection: any) => {
    const matchVehicle = !searchVehicle ||
      inspection.vehicleNumber?.includes(searchVehicle);
    const matchDate = !searchDate ||
      inspection.inspectionDate?.startsWith(searchDate);
    return matchVehicle && matchDate;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-orange-500">임시저장</Badge>;
      case "submitted":
        return <Badge className="bg-purple-500">제출됨</Badge>;
      case "reviewed":
        return <Badge className="bg-green-500">확인완료</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MobileLayout title="점검 내역" showBottomNav={false}>
      <div className="p-4 space-y-4 pb-24">
        {/* 검색 필터 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              검색
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">차량번호</label>
              <Input
                placeholder="차량번호 입력"
                value={searchVehicle}
                onChange={(e) => setSearchVehicle(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">점검 날짜</label>
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="pt-3 pb-2 text-center">
              <div className="text-xl font-bold text-blue-600">
                {filteredInspections.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">전체</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2 text-center">
              <div className="text-xl font-bold text-orange-600">
                {filteredInspections.filter((i: any) => i.status === "draft").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">임시저장</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2 text-center">
              <div className="text-xl font-bold text-purple-600">
                {filteredInspections.filter((i: any) => i.status === "submitted").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">제출됨</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-2 text-center">
              <div className="text-xl font-bold text-green-600">
                {filteredInspections.filter((i: any) => i.status === "reviewed").length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">확인완료</div>
            </CardContent>
          </Card>
        </div>

        {/* 점검 내역 목록 */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              로딩 중...
            </CardContent>
          </Card>
        ) : filteredInspections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <div>점검 내역이 없습니다</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInspections.map((inspection: any) => (
              <Card key={inspection.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-lg">{inspection.vehicleNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {inspection.equipmentName || "장비명 없음"}
                      </div>
                    </div>
                    {getStatusBadge(inspection.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(inspection.inspectionDate).toLocaleDateString('ko-KR')}
                      </span>
                      <Badge variant="outline" className="ml-auto">
                        {inspection.checkFrequency === "daily"
                          ? "일일"
                          : inspection.checkFrequency === "weekly"
                          ? "주간"
                          : inspection.checkFrequency === "monthly"
                          ? "월간"
                          : "필요시"}
                      </Badge>
                    </div>

                    {inspection.submittedAt && (
                      <div className="text-xs text-muted-foreground">
                        제출: {new Date(inspection.submittedAt).toLocaleString('ko-KR')}
                      </div>
                    )}

                    {inspection.reviewedAt && (
                      <div className="text-xs text-green-600">
                        확인: {new Date(inspection.reviewedAt).toLocaleString('ko-KR')}
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full mt-3"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedInspection(inspection);
                      setShowDetailDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    상세보기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="flex items-center justify-around py-3">
          <button
            onClick={() => setLocation("/mobile/inspector")}
            className="flex flex-col items-center gap-1 px-6 py-2"
          >
            <Search className="h-6 w-6 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">점검 작성</span>
          </button>
          <button
            onClick={() => setLocation("/mobile/inspector/history")}
            className="flex flex-col items-center gap-1 px-6 py-2"
          >
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">점검 내역</span>
          </button>
        </div>
      </div>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>점검 상세</DialogTitle>
            <DialogDescription>
              점검 내용을 확인합니다
            </DialogDescription>
          </DialogHeader>

          {inspectionDetail && (
            <div className="space-y-4">
              {/* 기본 정보 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    장비 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">차량번호</span>
                    <span className="font-medium">{inspectionDetail.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">장비명</span>
                    <span className="font-medium">{inspectionDetail.equipmentName || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">점검 빈도</span>
                    <Badge variant="outline">
                      {inspectionDetail.checkFrequency === "daily"
                        ? "일일"
                        : inspectionDetail.checkFrequency === "weekly"
                        ? "주간"
                        : inspectionDetail.checkFrequency === "monthly"
                        ? "월간"
                        : "필요시"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    점검 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">점검일</span>
                    <span className="font-medium">
                      {new Date(inspectionDetail.inspectionDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">제출일시</span>
                    <span className="font-medium text-xs">
                      {inspectionDetail.submittedAt
                        ? new Date(inspectionDetail.submittedAt).toLocaleString('ko-KR')
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">상태</span>
                    {getStatusBadge(inspectionDetail.status)}
                  </div>
                </CardContent>
              </Card>

              {/* 점검 결과 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">점검 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {inspectionDetail.results?.map((result: any) => (
                      <div key={result.id} className="border-b pb-2 last:border-0">
                        <div className="font-medium text-sm">{result.itemText}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {result.result ? (
                              getResultBadge(result.result)
                            ) : (
                              <span>{result.resultText || "-"}</span>
                            )}
                          </span>
                        </div>
                        {result.actionRequired && (
                          <div className="text-xs text-orange-600 mt-1">
                            조치사항: {result.actionRequired}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 전자서명 */}
              {inspectionDetail.inspectorSignature && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">점검원 서명</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={inspectionDetail.inspectorSignature}
                      alt="점검원 서명"
                      className="border rounded-md w-full max-w-xs"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {inspectionDetail?.status === "draft" && (
              <Button
                variant="default"
                className="flex-1"
                onClick={() => {
                  // draft 상태면 수정 페이지로 이동
                  setLocation(`/mobile/inspector/inspection/${inspectionDetail.equipmentId}?inspectionId=${inspectionDetail.id}`);
                  setShowDetailDialog(false);
                }}
              >
                계속 작성
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDetailDialog(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

const getResultBadge = (result: string) => {
  switch (result) {
    case "good":
      return <Badge className="bg-green-500 text-xs">양호</Badge>;
    case "adjust":
      return <Badge className="bg-yellow-500 text-xs">조정</Badge>;
    case "replace":
      return <Badge className="bg-orange-500 text-xs">교환</Badge>;
    case "manufacture":
      return <Badge className="bg-purple-500 text-xs">제작/설치</Badge>;
    case "discard":
      return <Badge className="bg-red-500 text-xs">폐기/불량</Badge>;
    case "na":
      return <Badge variant="outline" className="text-xs">해당없음</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{result}</Badge>;
  }
};
