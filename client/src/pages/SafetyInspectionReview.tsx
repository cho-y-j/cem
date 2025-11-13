import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  FileText,
  Calendar,
  User,
  Eye,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function SafetyInspectionReview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const isAdmin = role === "admin";
  const isEp = role === "ep";
  const [statusFilter, setStatusFilter] = useState<"all" | "submitted" | "reviewed">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [bpFilter, setBpFilter] = useState<string>("");
  const [epFilter, setEpFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewComments, setReviewComments] = useState("");

  const reviewFilters = useMemo(() => {
    const payload: Record<string, string> = {};
    if (statusFilter !== "all") {
      payload.status = statusFilter;
    }
    if (ownerFilter) {
      payload.ownerCompanyId = ownerFilter;
    }
    if (bpFilter) {
      payload.bpCompanyId = bpFilter;
    }
    if (epFilter) {
      payload.epCompanyId = epFilter;
    }
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      payload.search = trimmedSearch;
    }
    if (startDate) {
      payload.startDate = startDate;
    }
    if (endDate) {
      payload.endDate = endDate;
    }
    return Object.keys(payload).length > 0 ? payload : undefined;
  }, [statusFilter, ownerFilter, bpFilter, epFilter, searchTerm, startDate, endDate]);

  // 제출된 점검 목록 조회
  const {
    data: inspectionsData,
    refetch,
    isLoading,
  } = trpc.safetyInspection.listSubmittedInspections.useQuery(reviewFilters, {
    keepPreviousData: true,
  });
  const inspections = inspectionsData || [];

  const { data: ownerCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "owner" },
    { enabled: isAdmin }
  );
  const { data: bpCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "bp" },
    { enabled: isAdmin || isEp }
  );
  const { data: epCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "ep" },
    { enabled: isAdmin }
  );

  // 점검 상세 조회
  const { data: inspectionDetail } = trpc.safetyInspection.getInspection.useQuery(
    { id: selectedInspection?.id || "" },
    { enabled: !!selectedInspection?.id }
  );

  // 점검 확인(승인) mutation
  const reviewMutation = trpc.safetyInspection.reviewInspection.useMutation({
    onSuccess: () => {
      toast.success("점검이 확인되었습니다.");
      setShowReviewDialog(false);
      setShowDetailDialog(false);
      setSelectedInspection(null);
      setReviewComments("");
      refetch();
    },
    onError: (error) => {
      toast.error("확인 실패: " + error.message);
    },
  });

  const handleViewDetail = (inspection: any) => {
    setSelectedInspection(inspection);
    setShowDetailDialog(true);
  };

  const handleReview = () => {
    if (!selectedInspection) return;
    reviewMutation.mutate({
      id: selectedInspection.id,
      comments: reviewComments || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-500">제출됨</Badge>;
      case "reviewed":
        return <Badge className="bg-green-500">확인완료</Badge>;
      case "draft":
        return <Badge variant="outline">임시저장</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "good":
        return <Badge className="bg-green-500">양호</Badge>;
      case "adjust":
        return <Badge className="bg-yellow-500">조정</Badge>;
      case "replace":
        return <Badge className="bg-orange-500">교환</Badge>;
      case "manufacture":
        return <Badge className="bg-purple-500">제작/설치</Badge>;
      case "discard":
        return <Badge className="bg-red-500">폐기/불량</Badge>;
      case "na":
        return <Badge variant="outline">해당없음</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">안전점검 확인</h1>
        <p className="text-muted-foreground mt-1">
          점검원이 제출한 안전점검을 확인하고 승인합니다
        </p>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">검색 및 필터</CardTitle>
          <CardDescription>차량번호, 날짜, 소속별로 점검 내역을 좁혀보세요</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 필터 UI - 한 줄 통일 디자인 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">차량 / 장비 검색</Label>
              <Input
                id="inspection-search"
                placeholder="차량번호 또는 장비명"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">점검 상태</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "submitted" | "reviewed") => setStatusFilter(value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="submitted">제출됨</SelectItem>
                  <SelectItem value="reviewed">확인완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">시작일</Label>
              <Input
                id="inspection-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">종료일</Label>
              <Input
                id="inspection-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-9"
              />
            </div>
            {isAdmin && (
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">Owner 회사</Label>
                <Select
                  value={ownerFilter || "all"}
                  onValueChange={(value) => setOwnerFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {ownerCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(isAdmin || isEp) && (
              <div className="flex flex-col gap-1.5">
                <Label>BP 회사</Label>
                <Select
                  value={bpFilter || "all"}
                  onValueChange={(value) => setBpFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {bpCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <Label>EP 회사</Label>
                <Select
                  value={epFilter || "all"}
                  onValueChange={(value) => setEpFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {epCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setOwnerFilter("");
                setBpFilter("");
                setEpFilter("");
                setSearchTerm("");
                setStartDate("");
                setEndDate("");
                refetch();
              }}
            >
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              대기 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-blue-500" />
              <div className="text-3xl font-bold">
                {inspections.filter((i: any) => i.status === "submitted").length}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              확인 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="text-3xl font-bold">
                {inspections.filter((i: any) => i.status === "reviewed").length}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              전체
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-gray-500" />
              <div className="text-3xl font-bold">
                {inspections.length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 점검 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>점검 목록</CardTitle>
          <CardDescription>
            제출된 안전점검을 확인하고 승인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              불러오는 중입니다...
            </div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              조건에 맞는 점검이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>점검일자</TableHead>
                  <TableHead>차량번호</TableHead>
                  <TableHead>장비명</TableHead>
                  <TableHead>점검 빈도</TableHead>
                  <TableHead>Owner / BP</TableHead>
                  <TableHead>점검원</TableHead>
                  <TableHead>제출일시</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection: any) => (
                  <TableRow key={inspection.id}>
                    <TableCell>
                      {new Date(inspection.inspectionDate).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {inspection.vehicleNumber}
                    </TableCell>
                    <TableCell>{inspection.equipmentName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {inspection.checkFrequency === "daily"
                          ? "일일"
                          : inspection.checkFrequency === "weekly"
                          ? "주간"
                          : inspection.checkFrequency === "monthly"
                          ? "월간"
                          : "필요시"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span>Owner: {inspection.ownerCompany?.name || "-"}</span>
                        <span>BP: {inspection.bpCompany?.name || "-"}</span>
                        <span>EP: {inspection.epCompany?.name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{inspection.inspector?.name || "-"}</TableCell>
                    <TableCell>
                      {inspection.submittedAt
                        ? new Date(inspection.submittedAt).toLocaleString('ko-KR')
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(inspection)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 상세보기 다이얼로그 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>안전점검 상세</DialogTitle>
            <DialogDescription>
              점검 내용을 확인하고 승인하세요
            </DialogDescription>
          </DialogHeader>

          {inspectionDetail && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      점검원 정보
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
                      <span className="font-medium">
                        {inspectionDetail.submittedAt
                          ? new Date(inspectionDetail.submittedAt).toLocaleString('ko-KR')
                          : "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 점검 결과 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">점검 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>점검 항목</TableHead>
                        <TableHead>결과</TableHead>
                        <TableHead>조치사항</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspectionDetail.results?.map((result: any) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.itemText}</TableCell>
                          <TableCell>
                            {result.result ? (
                              getResultBadge(result.result)
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {result.resultText || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {result.actionRequired || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 전자서명 */}
              {inspectionDetail.inspectorSignature && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">점검원 서명</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={inspectionDetail.inspectorSignature}
                      alt="점검원 서명"
                      className="border rounded-md max-w-md"
                    />
                  </CardContent>
                </Card>
              )}

              {/* 확인 정보 (이미 확인된 경우) */}
              {inspectionDetail.status === "reviewed" && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      확인 완료
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">확인일시</span>
                      <span className="font-medium">
                        {inspectionDetail.reviewedAt
                          ? new Date(inspectionDetail.reviewedAt).toLocaleString('ko-KR')
                          : "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              닫기
            </Button>
            {inspectionDetail?.status === "submitted" && (
              <Button
                onClick={() => {
                  setShowDetailDialog(false);
                  setShowReviewDialog(true);
                }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                확인 완료
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 확인(승인) 다이얼로그 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>점검 확인</DialogTitle>
            <DialogDescription>
              점검 내용을 확인하셨습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-comments">의견 (선택)</Label>
              <Textarea
                id="review-comments"
                placeholder="확인 의견을 입력하세요"
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewDialog(false);
                setShowDetailDialog(true);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? "처리 중..." : "확인 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
