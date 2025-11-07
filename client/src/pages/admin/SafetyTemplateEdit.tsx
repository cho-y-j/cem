import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SafetyTemplateEdit() {
  const [, params] = useRoute("/admin/safety-templates/:id/edit");
  const templateId = params?.id;
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // 템플릿 조회
  const { data: template, isLoading } = trpc.safetyInspection.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // 템플릿 수정 mutation
  const updateMutation = trpc.safetyInspection.updateTemplate.useMutation({
    onSuccess: () => {
      setLocation(`/admin/safety-templates/${templateId}`);
    },
  });

  // 템플릿 데이터 로드 시 폼 초기화
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        isActive: template.isActive ?? true,
      });
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateId) return;

    updateMutation.mutate({
      id: templateId,
      name: formData.name,
      description: formData.description || undefined,
      isActive: formData.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">
          템플릿을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const isFormValid = formData.name.trim().length > 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/safety-templates/${templateId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">안전점검 템플릿 수정</h1>
          <p className="text-muted-foreground mt-1">
            템플릿의 기본 정보를 수정합니다
          </p>
        </div>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>템플릿 정보</CardTitle>
            <CardDescription>
              수정할 정보를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 템플릿명 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                템플릿명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 스카이장비 안전점검"
                required
              />
            </div>

            {/* 장비 종류 (수정 불가 - 표시만) */}
            <div className="space-y-2">
              <Label>장비 종류 (수정 불가)</Label>
              <div className="p-3 bg-muted rounded-md">
                {template.equipType ? (
                  <Badge variant="outline">{template.equipType.name}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">전체 장비</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                장비 종류는 템플릿 생성 후 변경할 수 없습니다.
              </p>
            </div>

            {/* 점검자 유형 (수정 불가 - 표시만) */}
            <div className="space-y-2">
              <Label>점검자 유형 (수정 불가)</Label>
              <div className="p-3 bg-muted rounded-md">
                <Badge variant={template.inspectorType === "inspector" ? "default" : "secondary"}>
                  {template.inspectorType === "inspector" ? "점검원" : "운전자"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                점검자 유형은 템플릿 생성 후 변경할 수 없습니다.
              </p>
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="템플릿에 대한 설명을 입력하세요"
                rows={4}
              />
            </div>

            {/* 활성 상태 */}
            <div className="flex items-center justify-between space-y-2 border rounded-lg p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">활성 상태</Label>
                <div className="text-sm text-muted-foreground">
                  비활성화하면 새로운 점검에 이 템플릿을 사용할 수 없습니다
                </div>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end">
              <Link href={`/admin/safety-templates/${templateId}`}>
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!isFormValid || updateMutation.isPending}
              >
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
