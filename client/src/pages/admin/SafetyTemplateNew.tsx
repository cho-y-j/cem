import { useState } from "react";
import { Link, useLocation } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function SafetyTemplateNew() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    equipTypeId: "",
    inspectorType: "inspector" as "inspector" | "driver",
    description: "",
  });

  // 장비 타입 목록 조회
  const { data: equipTypes } = trpc.equipment.listEquipTypes.useQuery();

  // 템플릿 생성 mutation
  const createMutation = trpc.safetyInspection.createTemplate.useMutation({
    onSuccess: (data) => {
      // 생성 후 상세 페이지로 이동
      setLocation(`/admin/safety-templates/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      name: formData.name,
      equipTypeId: formData.equipTypeId || undefined,
      inspectorType: formData.inspectorType,
      description: formData.description || undefined,
    });
  };

  const isFormValid = formData.name.trim().length > 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/admin/safety-templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">새 안전점검 템플릿 생성</h1>
          <p className="text-muted-foreground mt-1">
            장비별 안전점검 체크리스트 템플릿을 생성합니다
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
                placeholder="예: 스카이장비 안전점검"
                required
              />
            </div>

            {/* 장비 종류 */}
            <div className="space-y-2">
              <Label htmlFor="equipTypeId">장비 종류</Label>
              <Select
                value={formData.equipTypeId || "all"}
                onValueChange={(value) =>
                  setFormData({ ...formData, equipTypeId: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="장비 종류를 선택하세요 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 장비</SelectItem>
                  {equipTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                특정 장비 종류를 선택하면 해당 장비에만 이 템플릿이 적용됩니다.
                선택하지 않으면 모든 장비에 적용 가능합니다.
              </p>
            </div>

            {/* 점검자 유형 */}
            <div className="space-y-2">
              <Label htmlFor="inspectorType">
                점검자 유형 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.inspectorType}
                onValueChange={(value: "inspector" | "driver") =>
                  setFormData({ ...formData, inspectorType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector">점검원</SelectItem>
                  <SelectItem value="driver">운전자</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                <strong>점검원:</strong> EP 소속 안전점검 담당자가 사용하는 템플릿
                <br />
                <strong>운전자:</strong> 장비 운전자가 일상 점검에 사용하는 템플릿
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

            {/* 안내 메시지 */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">다음 단계</h4>
              <p className="text-sm text-muted-foreground">
                템플릿을 생성한 후, 상세 페이지에서 체크 항목을 추가할 수 있습니다.
                <br />
                각 체크 항목에는 점검 빈도(일일/주간/월간/필요시), 점검 시점(사용전/사용중/사용후),
                결과 유형(상태/텍스트) 등을 설정할 수 있습니다.
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end">
              <Link href="/admin/safety-templates">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={!isFormValid || createMutation.isPending}
              >
                {createMutation.isPending ? "생성 중..." : "템플릿 생성"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
