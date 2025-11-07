import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Edit, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function SafetyTemplates() {
  const [inspectorType, setInspectorType] = useState<string | undefined>();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(true);

  // 템플릿 목록 조회
  const { data: templates, isLoading } = trpc.safetyInspection.listTemplates.useQuery({
    inspectorType: inspectorType as "inspector" | "driver" | undefined,
    isActive: isActiveFilter,
  });

  // 템플릿 삭제(비활성화)
  const deleteMutation = trpc.safetyInspection.deleteTemplate.useMutation({
    onSuccess: () => {
      // 목록 갱신
      window.location.reload();
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`"${name}" 템플릿을 비활성화하시겠습니까?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">안전점검 템플릿 관리</h1>
          <p className="text-muted-foreground mt-1">
            장비별 안전점검 체크리스트 템플릿을 관리합니다
          </p>
        </div>
        <Link href="/admin/safety-templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 템플릿 생성
          </Button>
        </Link>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="w-[200px]">
            <label className="text-sm font-medium mb-2 block">점검자 유형</label>
            <Select
              value={inspectorType || "all"}
              onValueChange={(val) => setInspectorType(val === "all" ? undefined : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="inspector">점검원</SelectItem>
                <SelectItem value="driver">운전자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[200px]">
            <label className="text-sm font-medium mb-2 block">활성 상태</label>
            <Select
              value={isActiveFilter === undefined ? "all" : isActiveFilter ? "active" : "inactive"}
              onValueChange={(val) =>
                setIsActiveFilter(val === "all" ? undefined : val === "active")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 템플릿 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>템플릿 목록</CardTitle>
          <CardDescription>
            {templates?.length || 0}개의 템플릿이 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              템플릿이 없습니다. 새로운 템플릿을 생성해주세요.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>템플릿명</TableHead>
                  <TableHead>점검자 유형</TableHead>
                  <TableHead>장비 타입</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {template.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.inspectorType === "inspector" ? "default" : "secondary"}>
                        {template.inspectorType === "inspector" ? "점검원" : "운전자"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.equipTypeId ? (
                        <span className="text-sm">{template.equipTypeId}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">전체 장비</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {template.description || "-"}
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          비활성
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.createdAt
                        ? format(new Date(template.createdAt), "yyyy.MM.dd", { locale: ko })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/safety-templates/${template.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/safety-templates/${template.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id, template.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
