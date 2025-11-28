import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  FileText,
  User,
  Truck,
  Bell,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 긴급도 레벨별 스타일
const URGENCY_STYLES = {
  expired: {
    bg: "bg-red-100",
    border: "border-red-500",
    text: "text-red-700",
    badge: "bg-red-500 text-white",
    icon: AlertTriangle,
    label: "만료됨",
  },
  urgent: {
    bg: "bg-orange-100",
    border: "border-orange-500",
    text: "text-orange-700",
    badge: "bg-orange-500 text-white",
    icon: AlertCircle,
    label: "긴급 (3일 이내)",
  },
  warning: {
    bg: "bg-yellow-100",
    border: "border-yellow-500",
    text: "text-yellow-700",
    badge: "bg-yellow-500 text-white",
    icon: Clock,
    label: "주의 (7일 이내)",
  },
  normal: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    badge: "bg-blue-500 text-white",
    icon: FileText,
    label: "정상",
  },
};

export default function ExpiringDocuments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTargetType, setFilterTargetType] = useState<string>("all");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  const { data: documents, isLoading, refetch } = trpc.notifications.getExpiringDocuments.useQuery(
    { daysAhead: 30, includeExpired: true }
  );

  const sendNotificationMutation = trpc.notifications.triggerDocumentExpiryNotifications.useMutation({
    onSuccess: (result) => {
      alert(`${result.createdCount}건의 알림이 발송되었습니다.`);
      refetch();
    },
    onError: (error) => {
      alert(`알림 발송 실패: ${error.message}`);
    },
  });

  // 필터링
  const filteredDocuments = documents?.filter((doc: any) => {
    // 검색어 필터
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !doc.targetName?.toLowerCase().includes(search) &&
        !doc.docType?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    // 대상 유형 필터
    if (filterTargetType !== "all" && doc.targetType !== filterTargetType) {
      return false;
    }
    // 긴급도 필터
    if (filterUrgency !== "all" && doc.urgencyLevel !== filterUrgency) {
      return false;
    }
    return true;
  }) || [];

  // 통계
  const stats = {
    total: documents?.length || 0,
    expired: documents?.filter((d: any) => d.urgencyLevel === "expired").length || 0,
    urgent: documents?.filter((d: any) => d.urgencyLevel === "urgent").length || 0,
    warning: documents?.filter((d: any) => d.urgencyLevel === "warning").length || 0,
    normal: documents?.filter((d: any) => d.urgencyLevel === "normal").length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">서류 만료 관리</h1>
          <p className="text-muted-foreground">
            만료 예정 및 만료된 서류를 확인하고 관리합니다.
            <br />
            <span className="text-xs text-blue-600">
              * 자동 알림: 매일 오전 9시에 D-30, D-14, D-7, D-3, D-day 서류 알림 자동 발송
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button
            onClick={() => sendNotificationMutation.mutate()}
            disabled={sendNotificationMutation.isPending}
            variant="secondary"
          >
            <Bell className="h-4 w-4 mr-2" />
            {sendNotificationMutation.isPending ? "발송 중..." : "수동 알림 발송"}
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">전체</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.expired}</div>
              <div className="text-sm text-red-700">만료됨</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.urgent}</div>
              <div className="text-sm text-orange-700">긴급 (3일)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats.warning}</div>
              <div className="text-sm text-yellow-700">주의 (7일)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.normal}</div>
              <div className="text-sm text-blue-700">정상</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름 또는 서류 유형 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTargetType} onValueChange={setFilterTargetType}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="대상 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="worker">인력</SelectItem>
                <SelectItem value="equipment">장비</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterUrgency} onValueChange={setFilterUrgency}>
              <SelectTrigger className="w-[150px]">
                <AlertCircle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="긴급도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="expired">만료됨</SelectItem>
                <SelectItem value="urgent">긴급 (3일)</SelectItem>
                <SelectItem value="warning">주의 (7일)</SelectItem>
                <SelectItem value="normal">정상</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 서류 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            만료 서류 목록 ({filteredDocuments.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">만료 예정 서류가 없습니다.</p>
              <p className="text-sm">모든 서류가 정상 상태입니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">긴급도</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>서류 유형</TableHead>
                  <TableHead>만료일</TableHead>
                  <TableHead>D-Day</TableHead>
                  <TableHead className="text-right">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc: any) => {
                  const style = URGENCY_STYLES[doc.urgencyLevel as keyof typeof URGENCY_STYLES] || URGENCY_STYLES.normal;
                  const IconComponent = style.icon;

                  return (
                    <TableRow key={doc.id} className={`${style.bg} border-l-4 ${style.border}`}>
                      <TableCell>
                        <Badge className={style.badge}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {style.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.targetType === "worker" ? (
                            <User className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Truck className="h-4 w-4 text-green-500" />
                          )}
                          <span className="font-medium">{doc.targetName}</span>
                          <Badge variant="outline" className="text-xs">
                            {doc.targetType === "worker" ? "인력" : "장비"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{doc.docType}</TableCell>
                      <TableCell>
                        {doc.expiryDate
                          ? format(new Date(doc.expiryDate), "yyyy년 MM월 dd일", { locale: ko })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${style.text}`}>
                          {doc.daysUntilExpiry < 0
                            ? `D+${Math.abs(doc.daysUntilExpiry)}`
                            : doc.daysUntilExpiry === 0
                            ? "D-Day"
                            : `D-${doc.daysUntilExpiry}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {doc.fileUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            보기
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
