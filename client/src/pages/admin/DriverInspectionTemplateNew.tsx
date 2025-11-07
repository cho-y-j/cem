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
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function DriverInspectionTemplateNew() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    equipTypeId: "",
    description: "",
  });

  // 장비 타입 목록 조회
  const { data: equipTypes } = trpc.equipment.listEquipTypes.useQuery();

  // 템플릿 생성 mutation
  const createMutation = trpc.driverInspection.createTemplate.useMutation({
    onSuccess: (data) => {
      // 생성 후 상세 페이지로 이동
      setLocation(`/admin/driver-templates/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createMutation.mutate({
      name: formData.name,
      equipTypeId: formData.equipTypeId || undefined,
      description: formData.description || undefined,
    });
  };

  const isFormValid = formData.name.trim().length > 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/admin/driver-templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">새 운전자 점검표 템플릿 생성</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            차종별 운전자 점검 체크리스트 템플릿을 생성합니다
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
                placeholder="예: 크레인 점검표, 덤프트럭 점검표"
                required
              />
              <p className="text-sm text-muted-foreground">
                💡 차종별로 템플릿을 생성하세요. 점검 주기는 각 항목 추가 시 선택합니다.
              </p>
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
            <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
              <h4 className="font-medium mb-2 text-blue-900">📋 운전자 점검표 특징</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>운전자가 직접 장비 상태를 점검하고 기록합니다</li>
                <li>누적 운행시간, 주행거리를 입력할 수 있습니다</li>
                <li>소모품 교환 이력을 추적할 수 있습니다</li>
                <li>안전점검원 템플릿과 별도로 관리됩니다</li>
              </ul>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">📋 다음 단계: 항목 추가</h4>
              <p className="text-sm text-muted-foreground mb-2">
                템플릿을 생성한 후, 상세 페이지에서 점검 항목을 추가할 수 있습니다.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>✅ 각 항목마다 점검 주기를 선택합니다:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>일일점검:</strong> 유체레벨 확인, 외관 손상, 누유/소음</li>
                  <li><strong>주간점검:</strong> 볼트 체결, 필터 점검, 윤활 상태</li>
                  <li><strong>월간점검:</strong> 유압시스템, 와이어로프, 브레이크</li>
                </ul>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 justify-end">
              <Link href="/admin/driver-templates">
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

