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
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function DriverInspectionTemplateEdit() {
  const [, params] = useRoute("/admin/driver-templates/:id/edit");
  const templateId = params?.id;
  const [, setLocation] = useLocation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // 템플릿 조회
  const { data: template, isLoading } = trpc.driverInspection.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // 템플릿 수정 mutation
  const updateMutation = trpc.driverInspection.updateTemplate.useMutation({
    onSuccess: () => {
      setLocation(`/admin/driver-templates/${templateId}`);
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">템플릿을 찾을 수 없습니다.</p>
          <Link href="/admin/driver-templates">
            <Button className="mt-4">목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/driver-templates/${templateId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">템플릿 수정</h1>
          </div>
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
              템플릿의 기본 정보를 입력하세요
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
                required
              />
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
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">
                {formData.isActive ? "활성" : "비활성"}
              </Label>
              <p className="text-sm text-muted-foreground ml-2">
                {formData.isActive
                  ? "이 템플릿을 사용할 수 있습니다"
                  : "이 템플릿을 사용할 수 없습니다"}
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end pt-4">
              <Link href={`/admin/driver-templates/${templateId}`}>
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!formData.name.trim() || updateMutation.isPending}
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
