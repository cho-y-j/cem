import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Truck,
  Briefcase,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * 작업확인서 작성 페이지 (Worker 모바일)
 * Deployment 기반으로 자동 입력, 작업위치와 내용만 입력
 * MobileLayout으로 하단 네비게이션 포함
 */
export default function WorkLog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 데이터 조회
  const { data: deployments, isLoading } = trpc.deployments.myActiveDeployments.useQuery();

  // 디버그: 장비 정보 확인
  useEffect(() => {
    if (deployments) {
      console.log('[WorkLog] 배정 정보:', deployments);
      deployments.forEach((dep, idx) => {
        console.log(`[WorkLog] 배정 #${idx + 1}:`, {
          id: dep.id,
          siteName: dep.siteName,
          equipment: dep.equipment,
          equipmentId: dep.equipmentId,
        });
      });
    }
  }, [deployments]);

  // 폼 상태
  const [selectedDeploymentId, setSelectedDeploymentId] = useState("");
  const [formData, setFormData] = useState({
    workDate: new Date().toISOString().split('T')[0],
    workLocation: "",
    workContent: "",
    startTime: "08:00",
    endTime: "18:00",
    regularHours: 0,
    otHours: 0,
    nightHours: 0,
  });

  const selectedDeployment = deployments?.find(d => d.id === selectedDeploymentId);

  // 시간 계산 함수 (혼합 방식)
  const calculateHours = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // 다음날까지

    const totalHours = totalMinutes / 60;

    // 기본 구분 (예시 - 실제로는 deployment의 계약 타입에 따라)
    let regularHours = 0;
    let otHours = 0;
    let nightHours = 0;

    // 간단한 로직: 8시간까지는 일반, 이후는 OT
    if (totalHours <= 8) {
      regularHours = totalHours;
    } else {
      regularHours = 8;
      otHours = totalHours - 8;
    }

    // 철야 시간 계산 (22:00 ~ 06:00)
    if (endHour >= 22 || endHour < 6) {
      nightHours = Math.min(2, totalHours); // 예시
    }

    return {
      total: Math.round(totalHours * 100) / 100,
      regular: Math.round(regularHours * 100) / 100,
      ot: Math.round(otHours * 100) / 100,
      night: Math.round(nightHours * 100) / 100,
    };
  };

  const hours = calculateHours(formData.startTime, formData.endTime);

  // 시작/종료 시간이 변경되면 자동 계산값을 formData에 업데이트
  useEffect(() => {
    const calculated = calculateHours(formData.startTime, formData.endTime);
    setFormData(prev => ({
      ...prev,
      regularHours: calculated.regular,
      otHours: calculated.ot,
      nightHours: calculated.night,
    }));
  }, [formData.startTime, formData.endTime]);

  // 작업확인서 생성 mutation
  const createMutation = trpc.workJournal.create.useMutation({
    onSuccess: () => {
      toast.success("작업확인서가 제출되었습니다!");
      // 폼 초기화
      setSelectedDeploymentId("");
      setFormData({
        workDate: new Date().toISOString().split('T')[0],
        workLocation: "",
        workContent: "",
        startTime: "08:00",
        endTime: "18:00",
        regularHours: 0,
        otHours: 0,
        nightHours: 0,
      });
      setLocation('/mobile/worker');
    },
    onError: (error) => {
      console.error('[제출 오류]', error);
      toast.error(error.message || "제출 중 오류가 발생했습니다");
    }
  });

  const handleSubmit = async () => {
    if (!selectedDeploymentId) {
      toast.error("투입 현장을 선택해주세요");
      return;
    }
    if (!formData.workLocation || !formData.workContent) {
      toast.error("작업위치와 작업내용을 입력해주세요");
      return;
    }

    createMutation.mutate({
      deploymentId: selectedDeploymentId,
      workDate: formData.workDate,
      workLocation: formData.workLocation,
      workContent: formData.workContent,
      startTime: formData.startTime,
      endTime: formData.endTime,
      regularHours: formData.regularHours,
      otHours: formData.otHours,
      nightHours: formData.nightHours,
    });
  };

  return (
    <MobileLayout title="작업확인서 작성" showBack>
      <div className="p-4 pb-36 space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">투입 정보를 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : deployments && deployments.length === 0 ? (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-orange-500" />
              <p className="font-medium text-orange-900 mb-2">투입된 현장이 없습니다</p>
              <p className="text-sm text-orange-700">
                소속 회사에 투입 등록을 요청해주세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 투입 현장 선택 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  투입 현장 선택
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deployment">현장/장비</Label>
                  <Select
                    value={selectedDeploymentId}
                    onValueChange={setSelectedDeploymentId}
                  >
                    <SelectTrigger id="deployment" className="h-12">
                      <SelectValue placeholder="작업할 현장을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {deployments?.map((dep) => (
                        <SelectItem key={dep.id} value={dep.id}>
                          <div className="py-1">
                            <div className="font-medium">{dep.siteName || "현장명 없음"}</div>
                            <div className="text-xs text-muted-foreground">
                              {dep.equipment?.regNum || dep.equipment?.reg_num || "차량번호 없음"} | {dep.equipment?.equipType?.name || dep.equipment?.equip_type?.name || "장비명 없음"}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 선택된 투입 정보 표시 */}
                {selectedDeployment && (
                  <div className="border rounded-lg p-3 bg-blue-50 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">현장명:</span>
                        <p className="font-medium">{selectedDeployment.siteName || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">협력사:</span>
                        <p className="font-medium">{selectedDeployment.bpCompany?.name || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">차량번호:</span>
                        <p className="font-medium">
                          {selectedDeployment.equipment?.regNum || 
                           selectedDeployment.equipment?.reg_num || 
                           "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">장비명:</span>
                        <p className="font-medium">
                          {selectedDeployment.equipment?.equipType?.name || 
                           selectedDeployment.equipment?.equip_type?.name || 
                           "-"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">규격:</span>
                        <p className="font-medium">
                          {selectedDeployment.equipment?.specification || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-blue-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      위 정보는 자동으로 작업확인서에 입력됩니다
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 작업 정보 입력 */}
            {selectedDeploymentId && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">작업 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workDate" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        작업 날짜
                      </Label>
                      <Input
                        id="workDate"
                        type="date"
                        value={formData.workDate}
                        onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workLocation" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        작업 위치 *
                      </Label>
                      <Input
                        id="workLocation"
                        placeholder="예: A구역 3번 지점"
                        value={formData.workLocation}
                        onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workContent" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        작업 내용 *
                      </Label>
                      <Textarea
                        id="workContent"
                        placeholder="오늘 수행한 작업을 상세히 기록하세요"
                        value={formData.workContent}
                        onChange={(e) => setFormData({ ...formData, workContent: e.target.value })}
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 작업 시간 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      작업 시간
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">시작 시간</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">종료 시간</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="h-12"
                        />
                      </div>
                    </div>

                    {/* 근무 시간 수동 입력 (자동 계산값 기본) */}
                    <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-900">근무 시간 (수정 가능)</p>
                        <Badge variant="outline" className="text-xs bg-white">
                          총 {hours.total}시간
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="regularHours" className="text-xs text-muted-foreground">
                            일반 근무
                          </Label>
                          <Input
                            id="regularHours"
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.regularHours}
                            onChange={(e) => setFormData({ ...formData, regularHours: parseFloat(e.target.value) || 0 })}
                            className="h-10 text-center font-semibold"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="otHours" className="text-xs text-muted-foreground">
                            OT
                          </Label>
                          <Input
                            id="otHours"
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.otHours}
                            onChange={(e) => setFormData({ ...formData, otHours: parseFloat(e.target.value) || 0 })}
                            className="h-10 text-center font-semibold text-orange-600"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="nightHours" className="text-xs text-muted-foreground">
                            철야
                          </Label>
                          <Input
                            id="nightHours"
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.nightHours}
                            onChange={(e) => setFormData({ ...formData, nightHours: parseFloat(e.target.value) || 0 })}
                            className="h-10 text-center font-semibold text-purple-600"
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-blue-700 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        자동 계산값이 입력되며, 필요시 수정 가능합니다
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 안내 사항 */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex gap-2">
                      <Truck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-medium mb-1">작업확인서 작성 안내</p>
                        <ul className="space-y-1 text-blue-700">
                          <li>• 매일 작업 종료 후 작성해주세요</li>
                          <li>• 작업위치와 작업내용은 필수 입력 항목입니다</li>
                          <li>• 제출하면 BP 확인자에게 승인 요청이 전송됩니다</li>
                          <li>• BP 승인 후 작업확인서가 확정됩니다</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </>
            )}
          </>
        )}
      </div>

      {/* 하단 고정 제출 버튼 - 네비게이션 위에 표시 */}
      {deployments && deployments.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent z-[60]">
          <Button
            onClick={handleSubmit}
            disabled={!selectedDeploymentId || !formData.workLocation || !formData.workContent || createMutation.isPending}
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 shadow-xl"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                작업확인서 제출
              </>
            )}
          </Button>
        </div>
      )}
    </MobileLayout>
  );
}
