import { useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Search, Truck, AlertCircle, FileText, Settings, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function InspectorMain() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

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

  const handleSearch = async () => {
    if (searchInput.trim().length === 0) {
      toast.error("차량번호를 입력해주세요.");
      return;
    }

    const result = await refetch();

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
      <div className="p-4 space-y-4 pb-24">
        {/* 검색 안내 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Search className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">장비 검색</div>
                <div className="text-sm text-blue-700 mt-1">
                  차량번호를 입력하여 점검할 장비를 검색하세요
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 검색 입력 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">차량번호 검색</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="차량번호 입력 (예: 1234 또는 12가3456)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-xl h-14 px-4"
                autoFocus
              />
              <Button
                size="lg"
                onClick={handleSearch}
                disabled={!searchInput.trim() || isLoading}
                className="h-14 px-6 text-base"
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
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                • 전체 차량번호 또는 일부만 입력 가능
              </p>
              <p className="text-sm text-muted-foreground">
                • 예: "3456", "가3456", "12가3456" 모두 가능
              </p>
            </div>
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
                        <div className="text-base text-gray-600 mt-1">
                          {equipment.equipType?.name || "장비 종류 미상"}
                        </div>
                        {equipment.specification && (
                          <div className="text-sm text-gray-500 mt-0.5">
                            {equipment.specification}
                          </div>
                        )}
                        {equipment.activeDeployment?.worker ? (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                              <User className="h-4 w-4" />
                              <span className="font-semibold">
                                {equipment.activeDeployment.worker.name}
                              </span>
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
                            {equipment.activeDeployment.worker.licenseNum && (
                              <div className="text-xs text-muted-foreground">
                                면허번호: {equipment.activeDeployment.worker.licenseNum}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Badge variant="destructive" className="text-xs">
                              배정된 운전자 없음
                            </Badge>
                          </div>
                        )}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">점검 프로세스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 flex-shrink-0">
                  1
                </div>
                <div>
                  <div className="text-sm font-medium">장비 검색</div>
                  <div className="text-xs text-muted-foreground">
                    차량번호 뒷 4자리로 장비 검색
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="text-sm font-medium">점검표 작성</div>
                  <div className="text-xs text-muted-foreground">
                    차종에 맞는 점검표로 안전점검 수행
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="text-sm font-medium">결과 제출</div>
                  <div className="text-xs text-muted-foreground">
                    점검 결과를 시스템에 기록
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주의사항 */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-900">주의사항</div>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1 list-disc list-inside">
                  <li>이상 항목 발견 시 반드시 사진 첨부</li>
                  <li>점검 완료 후 즉시 제출</li>
                  <li>심각한 안전 문제 발견 시 즉시 보고</li>
                </ul>
              </div>
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
    </MobileLayout>
  );
}

