import { useEffect, useState } from "react";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileBottomNav, { inspectorNavItems } from "@/components/mobile/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Search, Truck, AlertCircle, FileText, Settings, Lock, User, Nfc } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function InspectorMain() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [lastNfcTag, setLastNfcTag] = useState<string | null>(null);
  const [pendingNfcTag, setPendingNfcTag] = useState<string | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogEquipment, setTagDialogEquipment] = useState<any | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");
  const [isDialogScanning, setIsDialogScanning] = useState(false);

  // PIN 변경 관련 상태
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // 차량번호로 검색 (부분 검색)
  const { data: equipmentList, refetch, isLoading } = trpc.safetyInspection.searchEquipment.useQuery(
    { partialNumber: searchInput },
    {
      enabled: false, // 수동으로 검색 트리거
    }
  );
  const utils = trpc.useUtils();
  const assignNfcTagMutation = trpc.safetyInspection.assignNfcTag.useMutation();

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).NDEFReader) {
      setIsNfcSupported(true);
      if (!(window as any).__cemNfcListening) {
        (window as any).__cemNfcListening = true;
        try {
          const NDEFReader = (window as any).NDEFReader;
          const reader = new NDEFReader();
          reader.addEventListener("reading", async (event: any) => {
            if (!event) return;
            try {
              let tagValue = typeof event.serialNumber === "string" ? event.serialNumber.trim() : "";
              if (!tagValue && event.message?.records?.length) {
                for (const record of event.message.records) {
                  if (record.recordType === "text" || record.recordType === "url") {
                    const decoder = new TextDecoder(record.encoding || "utf-8");
                    const decoded = decoder.decode(record.data);
                    if (decoded?.trim()) {
                      tagValue = decoded.trim();
                      break;
                    }
                  }
                }
              }

              if (!tagValue) return;

              toast.info(`NFC 태그 인식: ${tagValue}`);
              const context = await utils.safetyInspection.getEquipmentByNfcTag.fetch({ nfcTagId: tagValue });
              if (!context?.equipment?.id) {
                setPendingNfcTag(tagValue);
                setLastNfcTag(null);
                setSearchResults([]);
                toast.error("등록되지 않은 태그입니다. 장비를 검색한 뒤 '태그 등록'을 눌러 연결해주세요.");
                return;
              }

              const equipmentResult = {
                ...context.equipment,
                activeDeployment: context.activeDeployment || null,
              };

              setPendingNfcTag(null);
              setLastNfcTag(tagValue);
              setSearchInput(context.equipment.regNum || "");
              setSearchResults([equipmentResult]);
              toast.success("태그와 매칭된 장비를 불러왔습니다. 목록에서 선택해 주세요.");
            } catch (error: any) {
              console.error("[InspectorMain] NFC 자동 스캔 처리 중 오류:", error);
            }
          });
          reader
            .scan()
            .then(() => {
              toast.info("NFC 태그를 기기에 가까이 가져다주시면 자동으로 인식합니다.");
            })
            .catch((error: any) => {
              console.warn("[InspectorMain] 자동 스캔 시작 실패:", error?.message || error);
            });
        } catch (error) {
          console.warn("[InspectorMain] NFC Reader 초기화 실패:", error);
        }
      }
    }
  }, []);

  const handleNfcScan = async () => {
    if (!isNfcSupported) {
      toast.error("이 기기는 NFC 스캔을 지원하지 않습니다.");
      return;
    }

    setIsNfcScanning(true);
    toast.info("NFC 태그를 기기에 가까이 가져다주세요.");
    setTimeout(() => setIsNfcScanning(false), 2500);
  };

  const handleDialogNfcScan = async () => {
    if (!isNfcSupported) {
      toast.error("이 기기는 NFC 스캔을 지원하지 않습니다.");
      return;
    }

    try {
      const NDEFReader = (window as any).NDEFReader;
      const reader = new NDEFReader();
      await reader.scan();
      setIsDialogScanning(true);
      toast.info("등록할 NFC 태그를 기기에 가까이 가져다주세요.");

      const handleError = (event: any) => {
        console.error("[InspectorMain] NFC 스캔 오류:", event?.message || event);
        setIsDialogScanning(false);
        toast.error("NFC 스캔 중 오류가 발생했습니다.");
        reader.removeEventListener("error", handleError);
      };

      const handleReading = (event: any) => {
        reader.removeEventListener("reading", handleReading);
        reader.removeEventListener("error", handleError);
        setIsDialogScanning(false);

        try {
          let tagValue = typeof event.serialNumber === "string" ? event.serialNumber.trim() : "";
          if (event.message?.records?.length) {
            for (const record of event.message.records) {
              if (record.recordType === "text" || record.recordType === "url") {
                const decoder = new TextDecoder(record.encoding || "utf-8");
                const decoded = decoder.decode(record.data);
                if (decoded?.trim()) {
                  tagValue = decoded.trim();
                  break;
                }
              }
            }
          }

          if (!tagValue) {
            toast.error("인식된 NFC 태그에서 식별 정보를 찾지 못했습니다.");
            return;
          }

          setTagInputValue(tagValue);
          toast.success(`NFC 태그 인식: ${tagValue}`);
        } catch (error: any) {
          console.error("[InspectorMain] NFC 태그 처리 중 오류:", error);
          toast.error(error?.message || "NFC 태그를 처리하는 중 오류가 발생했습니다.");
        }
      };

      reader.addEventListener("error", handleError);
      reader.addEventListener("reading", handleReading, { once: true });
    } catch (error: any) {
      console.error("[InspectorMain] NFC 스캔 시작 실패:", error);
      setIsDialogScanning(false);
      toast.error(error?.message || "NFC 스캔을 시작할 수 없습니다.");
    }
  };

  const openTagDialog = (equipment: any) => {
    setTagDialogEquipment(equipment);
    setTagInputValue(equipment.nfcTagId || pendingNfcTag || "");
    setTagDialogOpen(true);
  };

  const handleAssignNfcTag = async () => {
    if (!tagDialogEquipment) return;

    const value = tagInputValue.trim();
    if (!value) {
      toast.error("등록할 NFC 태그를 입력해주세요.");
      return;
    }

    try {
      const updated = await assignNfcTagMutation.mutateAsync({
        equipmentId: tagDialogEquipment.id,
        nfcTagId: value,
      });

      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, nfcTagId: updated.nfcTagId } : item
        )
      );
      setTagDialogOpen(false);
      setPendingNfcTag(null);
      setLastNfcTag(updated.nfcTagId || null);
      toast.success("NFC 태그를 등록했습니다.");
    } catch (error: any) {
      toast.error(error?.message || "NFC 태그 등록에 실패했습니다.");
    }
  };

  const handleSearch = async () => {
    if (searchInput.trim().length === 0) {
      toast.error("차량번호를 입력해주세요.");
      return;
    }

    const result = await refetch();

    setLastNfcTag(null);
    setPendingNfcTag(null);

    if (!result.data || result.data.length === 0) {
      toast.error("해당 차량번호를 가진 장비를 찾을 수 없습니다.");
      setSearchResults([]);
    } else if (result.data.length === 1) {
      // 결과가 1개면 바로 점검 화면으로 이동
      setLocation(`/mobile/inspector/inspection/${result.data[0].id}`);
    } else {
      // 결과가 여러 개면 목록 표시
      setSearchResults(result.data);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <MobileLayout title="안전점검" showBottomNav={false}>
      <div className="p-4 space-y-5 pb-24">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-slate-700">장비 검색</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            차량번호를 입력하거나 NFC 태그를 스캔하면 배정된 장비를 바로 확인할 수 있습니다.
          </p>
        </div>

        {/* 검색 입력 */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">차량번호로 검색</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              1234, 12가3456 등 일부 번호만 입력해도 검색됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-5">
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="차량번호 입력"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-14 px-4 text-base"
                autoFocus
              />
              <Button
                size="lg"
                onClick={handleSearch}
                disabled={!searchInput.trim() || isLoading}
                className="h-14 px-6 text-base font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    검색
                  </>
                )}
              </Button>
            </div>
            <div className="pt-3 border-t border-dashed">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  NFC 자동 인식
                </span>
                {!isNfcSupported && (
                  <Badge variant="outline" className="text-xs">
                    지원되지 않는 기기
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleNfcScan}
                disabled={!isNfcSupported || isNfcScanning}
                className="w-full h-12 text-base"
              >
                {isNfcScanning ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                    NFC 태그 인식 중...
                  </>
                ) : (
                  <>
                    <Nfc className="h-5 w-5 mr-2" />
                    태그 인식 다시 시도
                  </>
                )}
              </Button>
              {!isNfcSupported && (
                <p className="text-xs text-muted-foreground mt-2">
                  NFC 스캔은 Android Chrome 최신 버전에서만 지원됩니다.
                </p>
              )}
            </div>
            {isNfcSupported && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                페이지 진입 시 자동으로 태그를 인식합니다. 인식이 되지 않으면 위 버튼으로 다시 시도하세요.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                검색 결과 ({searchResults.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent>
            {lastNfcTag && (
              <div className="mb-3">
                <Badge variant="outline" className="text-xs">
                  NFC 태그 인식: {lastNfcTag}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  태그와 연결된 장비를 확인 후 선택해 주세요.
                </p>
              </div>
            )}
            {pendingNfcTag && (
              <div className="mb-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    등록되지 않은 태그
                  </Badge>
                  <span className="text-xs font-medium text-slate-700">{pendingNfcTag}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  장비를 검색한 뒤 카드의 <strong>태그 등록</strong> 버튼을 눌러 연결해 주세요.
                </p>
              </div>
            )}
              <div className="space-y-3">
                {searchResults.map((equipment) => (
                  <button
                    key={equipment.id}
                    onClick={() => setLocation(`/mobile/inspector/inspection/${equipment.id}`)}
                    className="w-full text-left p-5 border-2 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-98"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Truck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-lg text-gray-900">
                          {equipment.regNum}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {(equipment.equipType?.name || "장비 종류 미상") +
                            (equipment.specification ? ` · ${equipment.specification}` : "")}
                        </div>
                        {equipment.activeDeployment?.worker ? (
                          <div className="mt-2 space-y-1">
                          <div className="mt-2 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                              <User className="h-4 w-4 text-slate-400" />
                              <span className="font-semibold">
                                {equipment.activeDeployment.worker.name}
                              </span>
                              {equipment.activeDeployment.worker.licenseNum && (
                                <span className="text-xs text-muted-foreground">
                                  (면허 {equipment.activeDeployment.worker.licenseNum})
                                </span>
                              )}
                              {equipment.activeDeployment?.bpCompany?.name && (
                                <Badge variant="outline" className="text-xs">
                                  {equipment.activeDeployment.bpCompany.name}
                                </Badge>
                              )}
                              {equipment.ownerCompany?.name && (
                                <Badge variant="outline" className="text-xs">
                                  {equipment.ownerCompany.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Badge variant="destructive" className="text-xs">
                              배정된 운전자 없음
                            </Badge>
                          </div>
                        )}
                        {equipment.nfcTagId && (
                          <div className="text-xs text-muted-foreground mt-2">
                            NFC 태그: {equipment.nfcTagId}
                          </div>
                        )}
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <Button
                            size="sm"
                            className="w-full h-11 text-sm font-semibold"
                            onClick={(event) => {
                              event.stopPropagation();
                              setLocation(`/mobile/inspector/inspection/${equipment.id}`);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            점검 시작
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-11 text-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTagDialog(equipment);
                            }}
                          >
                            <Nfc className="h-4 w-4 mr-2" />
                            태그 등록 / 수정
                          </Button>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 사용 안내 */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">점검 진행 순서</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              NFC 태그를 인식하면 1~3 단계가 자동으로 연결됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                1
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">장비 검색 또는 태그 인식</div>
                <div className="text-xs text-muted-foreground">차량번호·태그로 장비 정보를 확인합니다.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                2
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">점검표 작성</div>
                <div className="text-xs text-muted-foreground">차종별 템플릿으로 체크리스트를 진행합니다.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                3
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">제출 및 공유</div>
                <div className="text-xs text-muted-foreground">
                  점검 결과와 사진을 저장하고 관리자에게 공유합니다.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주의사항 */}
        <Card className="shadow-sm border border-amber-100 bg-amber-50">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-900">주의사항</div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  안전과 기록 정확도를 위해 다음 사항을 지켜주세요.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              {[
                "이상 항목 발견 시 반드시 사진을 첨부합니다.",
                "점검이 끝나면 즉시 제출하고 관리자와 공유합니다.",
                "위험 요소 발견 시 현장 관리자에게 우선 보고합니다.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-amber-800">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 간단한 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="flex items-center justify-around py-3">
          <button
            onClick={() => setLocation("/mobile/inspector")}
            className="flex flex-col items-center gap-1 px-6 py-2"
          >
            <Search className="h-6 w-6 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">점검 작성</span>
          </button>
          <button
            onClick={() => setLocation("/mobile/inspector/history")}
            className="flex flex-col items-center gap-1 px-6 py-2"
          >
            <FileText className="h-6 w-6 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">점검 내역</span>
          </button>
        </div>
      </div>

      <Dialog
        open={tagDialogOpen}
        onOpenChange={(open) => {
          setTagDialogOpen(open);
          if (!open) {
            setTagDialogEquipment(null);
            setTagInputValue("");
            setIsDialogScanning(false);
          }
        }}
      >
        <DialogContent className="max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>NFC 태그 등록</DialogTitle>
            <DialogDescription>
              선택한 장비에 연결할 NFC 태그를 입력하거나 스캔하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tagDialogEquipment && (
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="py-3 text-sm space-y-1">
                  <div className="font-semibold text-slate-800">
                    {tagDialogEquipment.regNum}
                  </div>
                  <div className="text-slate-600">
                    {tagDialogEquipment.equipType?.name || "장비 종류 미상"}
                  </div>
                  {tagDialogEquipment.activeDeployment?.worker?.name && (
                    <div className="text-xs text-slate-500">
                      배정 운전자: {tagDialogEquipment.activeDeployment.worker.name}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="nfcTagInput">NFC 태그 ID</Label>
              <Input
                id="nfcTagInput"
                placeholder="태그 값을 입력하거나 스캔하세요."
                value={tagInputValue}
                onChange={(e) => setTagInputValue(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                태그 표면에 인쇄된 값이 있으면 그대로 입력해도 됩니다.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={!isNfcSupported || isDialogScanning}
                onClick={handleDialogNfcScan}
              >
                {isDialogScanning ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    스캔 중...
                  </>
                ) : (
                  <>
                    <Nfc className="h-4 w-4 mr-2" />
                    태그 스캔
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleAssignNfcTag}
                disabled={assignNfcTagMutation.isPending}
              >
                {assignNfcTagMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    저장 중...
                  </>
                ) : (
                  "태그 저장"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

