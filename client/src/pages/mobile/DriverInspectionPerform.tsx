import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useRoute } from "wouter";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  Gauge,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

/**
 * 운전자 점검표 - 점검 수행 페이지
 */
export default function DriverInspectionPerform() {
  const { user } = useAuth();
  const [, params] = useRoute("/mobile/driver-inspection/:id/perform");
  const templateId = params?.id;
  const [, setLocation] = useLocation();
  const signatureRef = useRef<any>(null);

  const [currentTab, setCurrentTab] = useState("daily");
  const [checkResults, setCheckResults] = useState<Record<string, { result: string; resultText?: string; numericValue?: number }>>({});
  const [operationData, setOperationData] = useState({
    accumulatedHours: "",
    accumulatedMileage: "",
    operationHoursToday: "",
    mileageToday: "",
    lastOilChangeDate: "",
    lastOilChangeHours: "",
    lastOilChangeMileage: "",
    lastHydraulicOilChangeDate: "",
    lastFilterChangeDate: "",
    notes: "",
  });
  const [signature, setSignature] = useState("");

  // 로그인 체크
  useEffect(() => {
    if (!user || user.role !== "worker") {
      setLocation("/mobile/login");
    }
  }, [user, setLocation]);

  // 배정된 장비 조회
  const { data: assignedEquipment } = trpc.mobile.worker.getMyAssignedEquipment.useQuery();

  // 템플릿 조회
  const { data: template, isLoading } = trpc.driverInspection.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // 점검 제출
  const submitMutation = trpc.driverInspection.createRecord.useMutation({
    onSuccess: () => {
      toast.success("점검이 완료되었습니다!");
      setLocation("/mobile/driver-inspection");
    },
    onError: (error) => {
      toast.error("점검 제출 실패: " + error.message);
    },
  });

  const handleCheckResult = (itemId: string, result: string) => {
    setCheckResults({
      ...checkResults,
      [itemId]: { ...checkResults[itemId], result },
    });
  };

  const handleResultText = (itemId: string, text: string) => {
    setCheckResults({
      ...checkResults,
      [itemId]: { ...checkResults[itemId], resultText: text },
    });
  };

  const handleNumericValue = (itemId: string, value: number) => {
    setCheckResults({
      ...checkResults,
      [itemId]: { ...checkResults[itemId], numericValue: value },
    });
  };

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setSignature("");
  };

  const handleSaveSignature = () => {
    if (signatureRef.current?.isEmpty()) {
      toast.error("서명을 입력해주세요");
      return;
    }
    const signatureData = signatureRef.current?.toDataURL();
    setSignature(signatureData);
    toast.success("서명이 저장되었습니다");
  };

  const handleSubmit = async () => {
    if (!template || !assignedEquipment) return;

    // 필수 항목 체크
    const requiredItems = template.items?.filter((item: any) => item.isRequired) || [];
    const missingItems = requiredItems.filter((item: any) => !checkResults[item.id]?.result);

    if (missingItems.length > 0) {
      toast.error(`필수 항목을 모두 체크해주세요 (${missingItems.length}개 미완성)`);
      return;
    }

    if (!signature) {
      toast.error("서명을 입력해주세요");
      return;
    }

    // 항목 결과 변환
    const items = template.items?.map((item: any) => ({
      templateItemId: item.id,
      category: item.category,
      itemText: item.itemText,
      result: checkResults[item.id]?.result || "good",
      resultText: checkResults[item.id]?.resultText,
      numericValue: checkResults[item.id]?.numericValue,
    })) || [];

    submitMutation.mutate({
      templateId: template.id,
      equipmentId: assignedEquipment.id,
      inspectionDate: new Date().toISOString().split("T")[0],
      checkFrequency: currentTab as "daily" | "weekly" | "monthly",
      accumulatedHours: operationData.accumulatedHours ? parseFloat(operationData.accumulatedHours) : undefined,
      accumulatedMileage: operationData.accumulatedMileage ? parseFloat(operationData.accumulatedMileage) : undefined,
      operationHoursToday: operationData.operationHoursToday ? parseFloat(operationData.operationHoursToday) : undefined,
      mileageToday: operationData.mileageToday ? parseFloat(operationData.mileageToday) : undefined,
      lastOilChangeDate: operationData.lastOilChangeDate || undefined,
      lastOilChangeHours: operationData.lastOilChangeHours ? parseFloat(operationData.lastOilChangeHours) : undefined,
      lastOilChangeMileage: operationData.lastOilChangeMileage ? parseFloat(operationData.lastOilChangeMileage) : undefined,
      lastHydraulicOilChangeDate: operationData.lastHydraulicOilChangeDate || undefined,
      lastFilterChangeDate: operationData.lastFilterChangeDate || undefined,
      notes: operationData.notes || undefined,
      driverSignature: signature,
      items,
    });
  };

  const getItemsByFrequency = (frequency: string) => {
    return template?.items?.filter((item: any) => item.checkFrequency === frequency) || [];
  };

  const renderCheckItem = (item: any) => {
    const result = checkResults[item.id];

    return (
      <Card key={item.id} className="mb-3">
        <CardContent className="p-4">
          <div className="mb-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                {item.category && (
                  <Badge variant="secondary" className="text-xs mb-1">
                    {item.category}
                  </Badge>
                )}
                <div className="font-medium text-gray-900">{item.itemText}</div>
              </div>
              {item.isRequired && (
                <Badge variant="destructive" className="text-xs">
                  필수
                </Badge>
              )}
            </div>

            {/* 상태 선택 (status type) */}
            {item.resultType === "status" && (
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={result?.result === "good" ? "default" : "outline"}
                  className={result?.result === "good" ? "bg-green-600" : ""}
                  onClick={() => handleCheckResult(item.id, "good")}
                >
                  <Check className="h-4 w-4 mr-1" />
                  양호
                </Button>
                <Button
                  variant={result?.result === "bad" ? "default" : "outline"}
                  className={result?.result === "bad" ? "bg-red-600" : ""}
                  onClick={() => handleCheckResult(item.id, "bad")}
                >
                  <X className="h-4 w-4 mr-1" />
                  불량
                </Button>
                <Button
                  variant={result?.result === "warning" ? "default" : "outline"}
                  className={result?.result === "warning" ? "bg-yellow-600" : ""}
                  onClick={() => handleCheckResult(item.id, "warning")}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  주의
                </Button>
              </div>
            )}

            {/* 텍스트 입력 (text type) */}
            {item.resultType === "text" && (
              <Textarea
                placeholder="점검 결과를 입력하세요"
                value={result?.resultText || ""}
                onChange={(e) => {
                  handleCheckResult(item.id, "text");
                  handleResultText(item.id, e.target.value);
                }}
                rows={3}
              />
            )}

            {/* 숫자 입력 (numeric type) */}
            {item.resultType === "numeric" && (
              <Input
                type="number"
                placeholder="측정값을 입력하세요"
                value={result?.numericValue || ""}
                onChange={(e) => {
                  handleCheckResult(item.id, "numeric");
                  handleNumericValue(item.id, parseFloat(e.target.value) || 0);
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <MobileLayout title="점검 수행" showMenu={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!template || !assignedEquipment) {
    return (
      <MobileLayout title="점검 수행" showMenu={false}>
        <div className="p-4">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <div className="text-lg font-medium text-red-800 mb-2">
                템플릿을 찾을 수 없습니다
              </div>
              <Button onClick={() => setLocation("/mobile/driver-inspection")}>
                목록으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  const dailyItems = getItemsByFrequency("daily");
  const weeklyItems = getItemsByFrequency("weekly");
  const monthlyItems = getItemsByFrequency("monthly");

  return (
    <MobileLayout title={template.name} showMenu={false}>
      <div className="pb-32">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 mb-2"
            onClick={() => setLocation("/mobile/driver-inspection")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <div className="text-2xl font-bold mb-1">{template.name}</div>
          <div className="text-sm opacity-90">{assignedEquipment.regNum}</div>
        </div>

        {/* 점검 주기 탭 */}
        <div className="p-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">
                일일 ({dailyItems.length})
              </TabsTrigger>
              <TabsTrigger value="weekly">
                주간 ({weeklyItems.length})
              </TabsTrigger>
              <TabsTrigger value="monthly">
                월간 ({monthlyItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              {dailyItems.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    일일 점검 항목이 없습니다
                  </CardContent>
                </Card>
              ) : (
                dailyItems.map(renderCheckItem)
              )}
            </TabsContent>

            <TabsContent value="weekly" className="mt-4">
              {weeklyItems.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    주간 점검 항목이 없습니다
                  </CardContent>
                </Card>
              ) : (
                weeklyItems.map(renderCheckItem)
              )}
            </TabsContent>

            <TabsContent value="monthly" className="mt-4">
              {monthlyItems.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    월간 점검 항목이 없습니다
                  </CardContent>
                </Card>
              ) : (
                monthlyItems.map(renderCheckItem)
              )}
            </TabsContent>
          </Tabs>

          {/* 운행 정보 */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                운행 정보
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">누적 시간 (h)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={operationData.accumulatedHours}
                    onChange={(e) => setOperationData({ ...operationData, accumulatedHours: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">누적 거리 (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={operationData.accumulatedMileage}
                    onChange={(e) => setOperationData({ ...operationData, accumulatedMileage: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">금일 시간 (h)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={operationData.operationHoursToday}
                    onChange={(e) => setOperationData({ ...operationData, operationHoursToday: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">금일 거리 (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={operationData.mileageToday}
                    onChange={(e) => setOperationData({ ...operationData, mileageToday: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 소모품 정보 */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                소모품 교환 이력
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">엔진오일 교환일</Label>
                  <Input
                    type="date"
                    value={operationData.lastOilChangeDate}
                    onChange={(e) => setOperationData({ ...operationData, lastOilChangeDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">유압오일 교환일</Label>
                  <Input
                    type="date"
                    value={operationData.lastHydraulicOilChangeDate}
                    onChange={(e) => setOperationData({ ...operationData, lastHydraulicOilChangeDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">필터 교환일</Label>
                  <Input
                    type="date"
                    value={operationData.lastFilterChangeDate}
                    onChange={(e) => setOperationData({ ...operationData, lastFilterChangeDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 특이사항 */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                특이사항
              </div>
              <Textarea
                placeholder="특이사항을 입력하세요"
                value={operationData.notes}
                onChange={(e) => setOperationData({ ...operationData, notes: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* 서명 */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="font-bold text-gray-900 mb-3">서명 *</div>
              {!signature ? (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: "w-full h-40",
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={handleClearSignature} className="flex-1">
                      지우기
                    </Button>
                    <Button onClick={handleSaveSignature} className="flex-1">
                      서명 저장
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <img src={signature} alt="서명" className="border rounded-lg w-full" />
                  <Button
                    variant="outline"
                    onClick={() => setSignature("")}
                    className="w-full mt-2"
                  >
                    서명 다시하기
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* 제출 버튼 */}
          <Button
            size="lg"
            className="w-full h-16 text-xl font-bold mt-6 mb-4 bg-gradient-to-r from-blue-600 to-blue-700 shadow-xl"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                제출 중...
              </>
            ) : (
              "점검 완료"
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}






















