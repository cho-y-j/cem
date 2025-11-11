import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle,
  Truck,
  FileText,
  Calendar,
  Save,
  Send,
  X,
  Search,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";

export default function SafetyInspectionNew() {
  const [, params] = useRoute("/mobile/inspector/inspection/:equipmentId");
  const [location, setLocation] = useLocation();
  const equipmentId = params?.equipmentId;
  const { user } = useAuth();

  // URL 쿼리 파라미터에서 inspectionId 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const existingInspectionId = urlParams.get("inspectionId");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [checkFrequency, setCheckFrequency] = useState<"daily" | "weekly" | "monthly" | "as_needed">("daily");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [results, setResults] = useState<Record<string, {
    result?: string;
    resultText?: string;
    actionRequired?: string;
    checkTiming?: string; // 작업전, 작업중, 작업후
  }>>({});
  const [inspectorName, setInspectorName] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string>(""); // 서명 데이터 저장
  const signatureRef = useRef<SignatureCanvas>(null);

  // 생성된 점검 ID 저장 (임시저장 후 제출 시 재사용)
  const [createdInspectionId, setCreatedInspectionId] = useState<string | null>(null);

  // 장비 정보 조회
  const { data: equipmentContext, isLoading: equipmentLoading } = trpc.safetyInspection.getEquipmentContext.useQuery(
    { equipmentId: equipmentId || "" },
    { enabled: !!equipmentId }
  );

  const equipment = equipmentContext?.equipment;
  const activeDeployment = equipmentContext?.activeDeployment;
  const equipmentDocs = equipmentContext?.docs?.equipment || [];
  const workerDocs = equipmentContext?.docs?.worker || [];

  // 작업계획서 조회
  const { data: workPlan } = trpc.entryRequestsV2.getWorkPlanByEquipment.useQuery(
    { equipmentId: equipment?.id || "" },
    { enabled: !!equipment?.id }
  );

  // 적용 가능한 템플릿 조회
  const { data: templates, isLoading: templatesLoading } = trpc.safetyInspection.getApplicableTemplates.useQuery(
    { equipmentId: equipmentId!, inspectorType: "inspector" },
    { enabled: !!equipmentId }
  );

  // 선택된 템플릿 상세 조회
  const { data: template } = trpc.safetyInspection.getTemplate.useQuery(
    { id: selectedTemplateId },
    { enabled: !!selectedTemplateId }
  );

  // 기존 점검 데이터 불러오기 (수정 모드)
  const { data: existingInspection } = trpc.safetyInspection.getInspection.useQuery(
    { id: existingInspectionId || "" },
    { enabled: !!existingInspectionId }
  );

  // 점검원 이름 자동 입력
  useEffect(() => {
    if (user?.name) {
      setInspectorName(user.name);
    }
  }, [user]);

  // 기존 점검 데이터 불러와서 폼 채우기 (수정 모드)
  useEffect(() => {
    if (existingInspection) {
      console.log("기존 점검 데이터 로드:", existingInspection);
      setCreatedInspectionId(existingInspection.id);
      setSelectedTemplateId(existingInspection.templateId);
      setCheckFrequency(existingInspection.checkFrequency);
      setInspectionDate(existingInspection.inspectionDate.split("T")[0]);
      setInspectorName(existingInspection.inspectorName || "");

      // 점검 결과 데이터 변환
      const resultsMap: Record<string, any> = {};
      existingInspection.results?.forEach((result: any) => {
        resultsMap[result.itemId] = {
          result: result.result,
          resultText: result.resultText,
          actionRequired: result.actionRequired,
          checkTiming: result.checkTiming,
        };
      });
      setResults(resultsMap);

      // 서명 데이터
      if (existingInspection.inspectorSignature) {
        setSignatureData(existingInspection.inspectorSignature);
      }
    }
  }, [existingInspection]);

  // 점검 생성 mutation
  const createInspectionMutation = trpc.safetyInspection.createInspection.useMutation();

  // 점검 결과 저장 mutation
  const saveResultMutation = trpc.safetyInspection.saveInspectionResult.useMutation();

  // 점검 제출 mutation
  const submitInspectionMutation = trpc.safetyInspection.submitInspection.useMutation({
    onSuccess: () => {
      toast.success("점검이 성공적으로 제출되었습니다.");
      setLocation("/mobile/inspector");
    },
    onError: (error) => {
      toast.error("제출 실패: " + error.message);
    },
  });

  // 첫 번째 템플릿 자동 선택
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  // 작업계획서 보기
  const handleViewWorkPlan = () => {
    if (workPlan?.workPlanUrl) {
      window.open(workPlan.workPlanUrl, '_blank');
    } else {
      toast.error("작업계획서를 찾을 수 없습니다.");
    }
  };

  const [showDocsDialog, setShowDocsDialog] = useState(false);
  const [docTab, setDocTab] = useState<"equipment" | "worker">("equipment");

  // 필터링된 항목들
  const filteredItems = template?.items?.filter(
    (item: any) => item.checkFrequency === checkFrequency
  ) || [];

  // 카테고리별 그룹화
  const groupedItems = filteredItems.reduce((acc: any, item: any) => {
    const category = item.category || "기타";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const handleResultChange = (itemId: string, field: string, value: string) => {
    setResults((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSaveDraft = async () => {
    if (!equipmentId || !selectedTemplateId) {
      toast.error("장비 또는 템플릿이 선택되지 않았습니다.");
      return;
    }

    try {
      // 점검 생성 (이미 생성된 것이 있으면 재사용)
      let inspectionId = createdInspectionId;

      if (!inspectionId) {
        const inspection = await createInspectionMutation.mutateAsync({
          equipmentId,
          templateId: selectedTemplateId,
          checkFrequency,
          inspectionDate,
        });
        inspectionId = inspection.id;
        setCreatedInspectionId(inspectionId);
      }

      // 결과 저장
      for (const [itemId, result] of Object.entries(results)) {
        const item = template?.items?.find((i: any) => i.id === itemId);
        if (item && (result.result || result.resultText)) {
          await saveResultMutation.mutateAsync({
            inspectionId,
            templateItemId: itemId,
            itemText: item.itemText,
            checkTiming: result.checkTiming || undefined,
            result: result.result,
            resultText: result.resultText,
            actionRequired: result.actionRequired,
          });
        }
      }

      toast.success("임시 저장되었습니다.");
    } catch (error: any) {
      toast.error("저장 실패: " + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!inspectorName.trim()) {
      toast.error("점검원 이름을 입력해주세요.");
      return;
    }

    // 서명 검증 - 저장된 서명 데이터 확인
    console.log("저장된 서명 데이터 길이:", signatureData.length);
    if (!signatureData || signatureData.length < 100) {
      toast.error("서명을 해주세요. 서명 후 '완료' 버튼을 눌러주세요.");
      return;
    }

    // 필수 항목 체크
    const requiredItems = filteredItems.filter((item: any) => item.isRequired);
    const missingRequired = requiredItems.filter((item: any) => {
      const itemResult = results[item.id];
      if (!itemResult) return true;

      // 작업 시점이 여러 개인 경우 선택 필수
      if (item.checkTiming && item.checkTiming.includes(',') && !itemResult.checkTiming) {
        return true;
      }

      // 결과 입력 확인
      if (!itemResult.result && !itemResult.resultText) {
        return true;
      }

      return false;
    });

    if (missingRequired.length > 0) {
      toast.error(`${missingRequired.length}개의 필수 항목이 완료되지 않았습니다.`);
      return;
    }

    try {
      // 점검 생성 (이미 생성된 것이 있으면 재사용)
      let inspectionId = createdInspectionId;

      if (!inspectionId) {
        const inspection = await createInspectionMutation.mutateAsync({
          equipmentId: equipmentId!,
          templateId: selectedTemplateId,
          checkFrequency,
          inspectionDate,
        });
        inspectionId = inspection.id;
        setCreatedInspectionId(inspectionId);
      }

      // 결과 저장 (이미 저장된 것이 있어도 업데이트)
      for (const [itemId, result] of Object.entries(results)) {
        const item = template?.items?.find((i: any) => i.id === itemId);
        if (item && (result.result || result.resultText)) {
          await saveResultMutation.mutateAsync({
            inspectionId,
            templateItemId: itemId,
            itemText: item.itemText,
            checkTiming: result.checkTiming || undefined,
            result: result.result,
            resultText: result.resultText,
            actionRequired: result.actionRequired,
          });
        }
      }

      // 점검 제출 (서명 데이터는 위에서 이미 확인함)
      await submitInspectionMutation.mutateAsync({
        id: inspectionId,
        signatureData,
        inspectorName,
      });
    } catch (error: any) {
      toast.error("제출 실패: " + error.message);
    }
  };

  if (templatesLoading || equipmentLoading) {
    return (
      <MobileLayout title="안전점검" showBack showBottomNav={false}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!equipment || !templates || templates.length === 0) {
    return (
      <MobileLayout title="안전점검" showBack showBottomNav={false}>
        <div className="p-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <div className="font-medium text-orange-900">
                사용 가능한 점검 템플릿이 없습니다.
              </div>
              <div className="text-sm text-orange-700 mt-2">
                관리자에게 문의하세요.
              </div>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="안전점검" showBack showBottomNav={false}>
      <div className="p-4 space-y-4 pb-48">
        {/* 장비 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              점검 장비
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">차량번호</span>
                  <span className="font-medium">{equipment?.regNum || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">장비 종류</span>
                  <span className="font-medium">{equipment?.equipType?.name || "-"}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">배정 운전자</span>
                  {activeDeployment?.worker ? (
                    <span className="font-semibold text-blue-700">
                      {activeDeployment.worker.name}
                    </span>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      배정된 운전자 없음
                    </Badge>
                  )}
                </div>
                {activeDeployment?.worker?.licenseNum && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>면허번호</span>
                    <span>{activeDeployment.worker.licenseNum}</span>
                  </div>
                )}
                {activeDeployment?.bpCompany?.name && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>소속 (BP)</span>
                    <span>{activeDeployment.bpCompany.name}</span>
                  </div>
                )}
                {equipment.ownerCompany?.name && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Owner</span>
                    <span>{equipment.ownerCompany.name}</span>
                  </div>
                )}
              </div>

              {/* 작업계획서 보기 버튼 */}
              {workPlan?.hasWorkPlan && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleViewWorkPlan}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  작업계획서 보기
                </Button>
              )}

              {(equipmentDocs.length > 0 || workerDocs.length > 0) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDocTab(equipmentDocs.length > 0 ? "equipment" : "worker");
                    setShowDocsDialog(true);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  서류 보기
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 점검 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              점검 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 템플릿 선택 */}
            {templates.length > 1 && (
              <div className="space-y-2">
                <Label>점검 템플릿</Label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full border rounded-md p-2"
                >
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 점검 빈도 */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">점검 빈도</Label>
              <RadioGroup value={checkFrequency} onValueChange={(val: any) => setCheckFrequency(val)}>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="freq-daily"
                    className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-4 cursor-pointer transition-all ${
                      checkFrequency === "daily"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <RadioGroupItem value="daily" id="freq-daily" />
                    <span className="text-base font-medium">일일</span>
                  </label>
                  <label
                    htmlFor="freq-weekly"
                    className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-4 cursor-pointer transition-all ${
                      checkFrequency === "weekly"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <RadioGroupItem value="weekly" id="freq-weekly" />
                    <span className="text-base font-medium">주간</span>
                  </label>
                  <label
                    htmlFor="freq-monthly"
                    className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-4 cursor-pointer transition-all ${
                      checkFrequency === "monthly"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <RadioGroupItem value="monthly" id="freq-monthly" />
                    <span className="text-base font-medium">월간</span>
                  </label>
                  <label
                    htmlFor="freq-as-needed"
                    className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-4 cursor-pointer transition-all ${
                      checkFrequency === "as_needed"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <RadioGroupItem value="as_needed" id="freq-as-needed" />
                    <span className="text-base font-medium">필요시</span>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* 점검 날짜 */}
            <div className="space-y-2">
              <Label>점검 날짜</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 점검 항목 */}
        {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {category}
                <Badge variant="outline">{items.length}개 항목</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {items.map((item: any) => (
                <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.itemText}</div>
                    </div>
                    {item.isRequired && (
                      <Badge variant="destructive" className="text-xs">필수</Badge>
                    )}
                  </div>

                  {/* 작업 시점 선택 */}
                  {item.checkTiming && item.checkTiming.includes(',') && (
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground mb-2 block">작업 시점 선택 *</Label>
                      <RadioGroup
                        value={results[item.id]?.checkTiming || ""}
                        onValueChange={(val) => handleResultChange(item.id, "checkTiming", val)}
                      >
                        <div className="flex gap-2">
                          {item.checkTiming.split(',').filter((t: string) => t).map((timing: string) => (
                            <label
                              key={timing}
                              className={`flex-1 flex items-center justify-center space-x-1 border-2 rounded-lg px-3 py-2 cursor-pointer transition-all ${
                                results[item.id]?.checkTiming === timing
                                  ? "border-purple-500 bg-purple-50"
                                  : "border-gray-200 hover:border-purple-300"
                              }`}
                            >
                              <RadioGroupItem value={timing} id={`${item.id}-${timing}`} />
                              <span className="text-xs font-medium">
                                {timing === "before_use" ? "작업전" : timing === "during_use" ? "작업중" : "작업후"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {item.resultType === "status" ? (
                    <RadioGroup
                      value={results[item.id]?.result || ""}
                      onValueChange={(val) => handleResultChange(item.id, "result", val)}
                    >
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <label
                          htmlFor={`${item.id}-good`}
                          className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-3 cursor-pointer transition-all ${
                            results[item.id]?.result === "good"
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-green-300"
                          }`}
                        >
                          <RadioGroupItem value="good" id={`${item.id}-good`} />
                          <span className="text-base font-medium">양호</span>
                        </label>
                        <label
                          htmlFor={`${item.id}-adjust`}
                          className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-3 cursor-pointer transition-all ${
                            results[item.id]?.result === "adjust"
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-gray-200 hover:border-yellow-300"
                          }`}
                        >
                          <RadioGroupItem value="adjust" id={`${item.id}-adjust`} />
                          <span className="text-base font-medium">조정</span>
                        </label>
                        <label
                          htmlFor={`${item.id}-replace`}
                          className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-3 cursor-pointer transition-all ${
                            results[item.id]?.result === "replace"
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <RadioGroupItem value="replace" id={`${item.id}-replace`} />
                          <span className="text-base font-medium">교환</span>
                        </label>
                        <label
                          htmlFor={`${item.id}-na`}
                          className={`flex items-center justify-center space-x-2 border-2 rounded-lg px-4 py-3 cursor-pointer transition-all ${
                            results[item.id]?.result === "na"
                              ? "border-gray-500 bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <RadioGroupItem value="na" id={`${item.id}-na`} />
                          <span className="text-base font-medium">해당없음</span>
                        </label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <Textarea
                      placeholder="점검 내용을 입력하세요"
                      value={results[item.id]?.resultText || ""}
                      onChange={(e) => handleResultChange(item.id, "resultText", e.target.value)}
                      rows={3}
                      className="mt-3 text-base"
                    />
                  )}

                  {/* 조치사항 */}
                  <div className="mt-2">
                    <Textarea
                      placeholder="조치사항 (선택)"
                      value={results[item.id]?.actionRequired || ""}
                      onChange={(e) => handleResultChange(item.id, "actionRequired", e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* 점검원 정보 및 서명 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">점검원 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>점검원 이름 *</Label>
              <Input
                placeholder="이름을 입력하세요"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>전자서명 *</Label>
              {!showSignature ? (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className={`w-full ${signatureData ? "border-green-500 bg-green-50" : ""}`}
                    onClick={() => setShowSignature(true)}
                  >
                    {signatureData ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        서명 완료 (다시 서명하기)
                      </>
                    ) : (
                      "서명하기"
                    )}
                  </Button>
                  {signatureData && (
                    <div className="border rounded-md p-2">
                      <img src={signatureData} alt="서명" className="w-full h-24 object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-md p-2 space-y-2">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: "w-full h-32 border rounded",
                      style: { touchAction: "none" },
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signatureRef.current?.clear()}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      지우기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // 서명 데이터를 state에 저장
                        if (signatureRef.current) {
                          const data = signatureRef.current.toDataURL();
                          setSignatureData(data);
                          console.log("서명 저장됨, 길이:", data.length);
                        }
                        setShowSignature(false);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      완료
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t-2 shadow-lg space-y-3 z-40">
          <Button
            variant="outline"
            className="w-full h-14 text-base font-semibold"
            onClick={handleSaveDraft}
            disabled={createInspectionMutation.isPending || saveResultMutation.isPending}
          >
            {createInspectionMutation.isPending || saveResultMutation.isPending ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                임시 저장
              </>
            )}
          </Button>
          <Button
            className="w-full h-14 text-base font-semibold bg-green-600 hover:bg-green-700"
            onClick={handleSubmit}
            disabled={submitInspectionMutation.isPending}
          >
            {submitInspectionMutation.isPending ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                저장 완료
              </>
            )}
          </Button>
        </div>

        {/* 하단 네비게이션 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="flex items-center justify-around py-3">
            <button
              onClick={() => setLocation("/mobile/inspector")}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <Search className="h-6 w-6 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">점검 작성</span>
            </button>
            <button
              onClick={() => setLocation("/mobile/inspector/history")}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <FileText className="h-6 w-6 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">점검 내역</span>
            </button>
            <button
              onClick={() => {
                if ((equipmentDocs.length === 0) && (workerDocs.length === 0)) {
                  toast.info("확인 가능한 서류가 없습니다.");
                  return;
                }
                setDocTab(equipmentDocs.length > 0 ? "equipment" : "worker");
                setShowDocsDialog(true);
              }}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <BookOpen className="h-6 w-6 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">서류 보기</span>
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>서류 목록</DialogTitle>
            <DialogDescription>
              장비 및 운전자 서류를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4 flex gap-2">
            <Button
              variant={docTab === "equipment" ? "default" : "outline"}
              size="sm"
              onClick={() => setDocTab("equipment")}
              disabled={equipmentDocs.length === 0}
            >
              장비 서류 ({equipmentDocs.length})
            </Button>
            <Button
              variant={docTab === "worker" ? "default" : "outline"}
              size="sm"
              onClick={() => setDocTab("worker")}
              disabled={workerDocs.length === 0}
            >
              운전자 서류 ({workerDocs.length})
            </Button>
          </div>
          <div className="space-y-3">
            {(docTab === "equipment" ? equipmentDocs : workerDocs).map((doc: any) => (
              <Card key={doc.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{doc.docType}</span>
                    <Badge
                      variant={
                        doc.status === "approved" || doc.status === "valid"
                          ? "outline"
                          : doc.status === "expired"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {doc.status || "미정"}
                    </Badge>
                  </div>
                  {doc.expiryDate && (
                    <div className="text-xs text-muted-foreground">
                      만료일: {new Date(doc.expiryDate).toLocaleDateString("ko-KR")}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                  >
                    파일 열기
                  </Button>
                </CardContent>
              </Card>
            ))}

            {(docTab === "equipment" ? equipmentDocs : workerDocs).length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  서류가 없습니다.
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
