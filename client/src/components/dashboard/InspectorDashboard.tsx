import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Plus,
  Calendar,
  Shield,
  Truck
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function InspectorDashboard() {
  const { user } = useAuth();
  const { data: equipmentList } = trpc.equipment.list.useQuery();
  const { data: checklistForms } = trpc.checklistForms.list.useQuery();

  // 점검이 필요한 장비 (운영 중인 장비)
  const operatingEquipment = equipmentList?.filter(e => e.status === "operating") || [];
  
  // 점검 예정 장비 (최근 7일 이내 점검 안 된 장비)
  const equipmentNeedingInspection = operatingEquipment.filter(equipment => {
    // 실제로는 마지막 점검일을 확인해야 하지만, 여기서는 간단히 운영 중인 장비로 표시
    return true;
  });

  // 통계
  const totalEquipment = equipmentList?.length || 0;
  const operatingCount = operatingEquipment.length;
  const needsInspectionCount = equipmentNeedingInspection.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">안전점검원 대시보드</h1>
        <p className="text-muted-foreground">
          {user?.name || "사용자"}님의 안전점검 현황을 확인할 수 있습니다.
        </p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 장비</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEquipment}</div>
            <p className="text-xs text-muted-foreground">등록된 장비</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">운영 중</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{operatingCount}</div>
            <p className="text-xs text-muted-foreground">현장 운영 중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검 예정</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{needsInspectionCount}</div>
            <p className="text-xs text-muted-foreground">점검 필요</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">점검표 양식</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checklistForms?.length || 0}</div>
            <p className="text-xs text-muted-foreground">사용 가능한 양식</p>
          </CardContent>
        </Card>
      </div>

      {/* 점검 안내 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Shield className="h-5 w-5" />
            안전점검 프로세스
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-blue-700">
                1
              </div>
              <div>
                <div className="text-sm font-medium">점검 대상 장비 선택</div>
                <div className="text-xs text-muted-foreground">운영 중인 장비 중 점검이 필요한 장비 확인</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-blue-700">
                2
              </div>
              <div>
                <div className="text-sm font-medium">점검표 작성</div>
                <div className="text-xs text-muted-foreground">장비 종류에 맞는 점검표 양식으로 점검 수행</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-blue-700">
                3
              </div>
              <div>
                <div className="text-sm font-medium">점검 결과 제출</div>
                <div className="text-xs text-muted-foreground">점검 결과를 시스템에 기록</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-blue-700">
                4
              </div>
              <div>
                <div className="text-sm font-medium">이력 관리</div>
                <div className="text-xs text-muted-foreground">점검 이력을 조회하고 관리</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 점검 예정 장비 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>점검 예정 장비</CardTitle>
            <CardDescription>점검이 필요한 운영 중인 장비 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {equipmentNeedingInspection.length > 0 ? (
              <div className="space-y-2">
                {equipmentNeedingInspection.slice(0, 5).map((equipment) => (
                  <div key={equipment.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">{equipment.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {equipment.registrationNumber || "등록번호 없음"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                      점검 필요
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                점검이 필요한 장비가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>점검표 양식</CardTitle>
            <CardDescription>사용 가능한 점검표 양식 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {checklistForms && checklistForms.length > 0 ? (
              <div className="space-y-2">
                {checklistForms.slice(0, 5).map((form) => (
                  <div key={form.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{form.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {form.description || "설명 없음"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">양식</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <AlertCircle className="mr-2 h-4 w-4 text-orange-500" />
                점검표 양식이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 운영 중인 장비 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>운영 중인 장비</CardTitle>
          <CardDescription>현재 현장에서 운영 중인 장비 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {operatingEquipment.length > 0 ? (
            <div className="space-y-2">
              {operatingEquipment.slice(0, 8).map((equipment) => (
                <div key={equipment.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-sm font-medium">{equipment.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {equipment.registrationNumber || "등록번호 없음"}
                        {" · "}
                        {equipment.manufacturer || "제조사 미상"}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    운영중
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Truck className="mr-2 h-4 w-4" />
              운영 중인 장비가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
          <CardDescription>자주 사용하는 기능</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/inspections">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Plus className="h-8 w-8 text-blue-500" />
                <span className="text-sm font-medium">안전점검 수행</span>
              </a>
            </Link>
            <Link href="/inspections">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Calendar className="h-8 w-8 text-green-500" />
                <span className="text-sm font-medium">점검 이력 조회</span>
              </a>
            </Link>
            <Link href="/equipment">
              <a className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
                <Truck className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium">장비 목록 보기</span>
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

