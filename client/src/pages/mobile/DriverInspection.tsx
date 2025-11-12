import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileBottomNav, { workerNavItems } from "@/components/mobile/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Truck, ClipboardCheck, Calendar, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

/**
 * 운전자 점검표 - 시작 페이지
 * 1. 내 장비 표시
 * 2. 해당 장비 타입의 템플릿 목록
 * 3. 템플릿 선택 → 점검 수행 화면으로
 */
export default function DriverInspection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 로그인 체크
  useEffect(() => {
    if (!user || user.role !== "worker") {
      setLocation("/mobile/login");
    }
  }, [user, setLocation]);

  // 배정된 장비 조회
  const { data: assignedEquipment, isLoading: isLoadingEquipment } =
    trpc.mobile.worker.getMyAssignedEquipment.useQuery();

  // 템플릿 목록 조회 (장비 타입별 + 전체)
  const { data: templates, isLoading: isLoadingTemplates } =
    trpc.driverInspection.listTemplates.useQuery({
      isActive: true,
    });

  // 장비에 맞는 템플릿 필터링
  const filteredTemplates = templates?.filter(
    (t) => !t.equipTypeId || t.equipTypeId === assignedEquipment?.equipTypeId
  );

  const handleSelectTemplate = (templateId: string) => {
    setLocation(`/mobile/driver-inspection/${templateId}/perform`);
  };

  if (isLoadingEquipment || isLoadingTemplates) {
    return (
      <MobileLayout title="운전자 점검표" showMenu={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!assignedEquipment) {
    return (
      <MobileLayout title="운전자 점검표" showMenu={false}>
        <div className="p-4">
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <Truck className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <div className="text-lg font-medium text-yellow-800 mb-2">
                배정된 장비가 없습니다
              </div>
              <div className="text-sm text-yellow-700">
                관리자에게 장비 배정을 요청하세요
              </div>
              <Button
                className="mt-4"
                onClick={() => setLocation("/mobile/worker")}
              >
                메인으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
        <MobileBottomNav items={workerNavItems} />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="운전자 점검표" showMenu={false}>
      <div className="pb-24">
        {/* 장비 정보 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="h-6 w-6" />
            <div className="text-sm opacity-90">내 장비</div>
          </div>
          <div className="text-2xl font-bold">{assignedEquipment.regNum}</div>
          {assignedEquipment.equipType?.name && (
            <div className="text-sm opacity-90 mt-1">
              {assignedEquipment.equipType.name}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="px-4 mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <div className="font-medium mb-1">점검표 작성 안내</div>
                  <ul className="space-y-1 text-xs text-blue-800">
                    <li>• 일일점검: 운행 시작 전 매일</li>
                    <li>• 주간점검: 매주 정기적으로</li>
                    <li>• 월간점검: 매월 심층 점검</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 템플릿 목록 */}
        <div className="px-4">
          <div className="text-sm font-medium text-gray-700 mb-3">
            점검표 선택 ({filteredTemplates?.length || 0}개)
          </div>

          {!filteredTemplates || filteredTemplates.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-6 text-center">
                <ClipboardCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <div className="text-gray-600">
                  사용 가능한 점검표가 없습니다
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  관리자가 템플릿을 생성하면 표시됩니다
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          {template.name}
                        </div>
                        {template.description && (
                          <div className="text-sm text-gray-600 mb-2">
                            {template.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {template.equipTypeId ? (
                            <Badge variant="secondary" className="text-xs">
                              {assignedEquipment.equipType?.name || "전용"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              전체 장비
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 점검 이력 보기 버튼 */}
        <div className="px-4 mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/mobile/driver-inspection/history")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            내 점검 이력 보기
          </Button>
        </div>
      </div>

      <MobileBottomNav items={workerNavItems} />
    </MobileLayout>
  );
}






















