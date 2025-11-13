/**
 * Owner 또는 BP: 반입 요청 생성 페이지
 * - Owner: BP 회사 선택 → 장비/인력 선택
 * - BP: EP 회사 선택 → 유도원만 선택 가능
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type RequestItem = {
  id: string;
  requestType: 'equipment_with_worker' | 'equipment_only' | 'worker_only';
  equipmentId?: string;
  workerId?: string;
};

export default function EntryRequestCreate() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const isBp = role === 'bp';

  const [targetBpCompanyId, setTargetBpCompanyId] = useState("");
  const [targetEpCompanyId, setTargetEpCompanyId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [requestedStartDate, setRequestedStartDate] = useState("");
  const [requestedEndDate, setRequestedEndDate] = useState("");
  const [items, setItems] = useState<RequestItem[]>([
    { id: crypto.randomUUID(), requestType: isBp ? 'worker_only' : 'equipment_with_worker' }
  ]);

  // BP 회사 목록 조회 (Owner만)
  const { data: bpCompanies, isLoading: loadingBpCompanies } = trpc.companies.listByType.useQuery({
    companyType: 'bp'
  }, { enabled: !isBp });

  // EP 회사 목록 조회 (BP만)
  const { data: epCompanies, isLoading: loadingEpCompanies } = trpc.companies.listByType.useQuery({
    companyType: 'ep'
  }, { enabled: isBp });

  // 장비 목록 조회 (Owner만)
  const { data: equipmentList } = trpc.equipment.list.useQuery(undefined, { enabled: !isBp });

  // 인력 목록 조회
  const { data: workersList } = trpc.workers.list.useQuery();
  
  // 인력 유형 목록 조회 (유도원 필터링용)
  const { data: workerTypes } = trpc.workerTypes.list.useQuery();
  
  // 유도원 workerTypeId 찾기
  const guideWorkerTypeId = useMemo(() => {
    if (!workerTypes) return null;
    const guideType = workerTypes.find((wt: any) => wt.name === "유도원");
    return guideType?.id || null;
  }, [workerTypes]);
  
  // 유도원만 필터링 (BP가 인력만 요청할 때)
  const guideWorkersList = useMemo(() => {
    if (!isBp || !workersList || !guideWorkerTypeId) return workersList || [];
    // workerTypeId가 "유도원"인 인력만 필터링
    return workersList.filter((worker: any) => worker.workerTypeId === guideWorkerTypeId);
  }, [isBp, workersList, guideWorkerTypeId]);
  
  // 인력 목록 (BP는 유도원만, Owner는 전체)
  const availableWorkersList = isBp ? guideWorkersList : workersList;

  // 반입 요청 생성 mutation
  const createMutation = trpc.entryRequests.create.useMutation({
    onSuccess: (data) => {
      toast.success(`${isBp ? '등록' : '반입'} 요청이 생성되었습니다. (${data.requestNumber})`);
      setLocation('/entry-requests');
    },
    onError: (error) => {
      toast.error(error.message || `${isBp ? '등록' : '반입'} 요청 생성에 실패했습니다.`);
    },
  });

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), requestType: 'equipment_with_worker' }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error("최소 1개 이상의 항목이 필요합니다.");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<RequestItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Owner는 BP 회사 선택 필수, BP는 EP 회사 선택 필수
    if (!isBp && !targetBpCompanyId) {
      toast.error("BP 회사를 선택해주세요.");
      return;
    }
    if (isBp && !targetEpCompanyId) {
      toast.error("EP 회사를 선택해주세요.");
      return;
    }

    if (!purpose.trim()) {
      toast.error(`${isBp ? '등록' : '반입'} 목적을 입력해주세요.`);
      return;
    }

    if (!requestedStartDate || !requestedEndDate) {
      toast.error(`${isBp ? '등록' : '반입'} 기간을 입력해주세요.`);
      return;
    }

    // 아이템 검증
    for (const item of items) {
      if (item.requestType === 'equipment_with_worker' || item.requestType === 'equipment_only') {
        if (!item.equipmentId) {
          toast.error("장비를 선택해주세요.");
          return;
        }
      }
      if (item.requestType === 'equipment_with_worker' || item.requestType === 'worker_only') {
        if (!item.workerId) {
          toast.error("인력을 선택해주세요.");
          return;
        }
      }
    }

    createMutation.mutate({
      targetBpCompanyId: isBp ? undefined : targetBpCompanyId,
      targetEpCompanyId: isBp ? targetEpCompanyId : undefined,
      purpose,
      requestedStartDate,
      requestedEndDate,
      items: items.map(item => ({
        requestType: item.requestType,
        equipmentId: item.equipmentId,
        workerId: item.workerId,
      })),
    });
  };

  if ((!isBp && loadingBpCompanies) || (isBp && loadingEpCompanies)) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isBp ? '등록요청' : '반입 요청'} 생성</h1>
        <p className="text-muted-foreground mt-2">
          {isBp 
            ? '유도원 등록을 요청합니다. EP 회사에서 검토 후 승인됩니다.'
            : '장비 및 인력의 반입을 요청합니다. BP 회사에서 검토 후 승인됩니다.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BP 회사 선택 (Owner만) 또는 EP 회사 선택 (BP만) */}
        {!isBp ? (
          <Card>
            <CardHeader>
              <CardTitle>1. BP 회사 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="bp-company">협력사 (BP) *</Label>
              <Select value={targetBpCompanyId} onValueChange={setTargetBpCompanyId}>
                <SelectTrigger id="bp-company" className="mt-2">
                  <SelectValue placeholder="BP 회사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {bpCompanies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>1. EP 회사 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="ep-company">시공사 (EP) *</Label>
              <Select value={targetEpCompanyId} onValueChange={setTargetEpCompanyId}>
                <SelectTrigger id="ep-company" className="mt-2">
                  <SelectValue placeholder="EP 회사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {epCompanies?.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* 장비/인력 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>2. 장비 및 인력 선택</span>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                항목 추가
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">항목 {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                {/* 요청 유형 */}
                <div>
                  <Label>요청 유형 *</Label>
                  <Select
                    value={item.requestType}
                    onValueChange={(value: any) => updateItem(item.id, { requestType: value })}
                    disabled={isBp} // BP는 인력만 선택 가능
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!isBp && (
                        <>
                          <SelectItem value="equipment_with_worker">장비 + 운전자</SelectItem>
                          <SelectItem value="equipment_only">장비만</SelectItem>
                        </>
                      )}
                      <SelectItem value="worker_only">인력만</SelectItem>
                    </SelectContent>
                  </Select>
                  {isBp && (
                    <p className="text-sm text-muted-foreground mt-1">
                      BP는 유도원만 등록 요청할 수 있습니다.
                    </p>
                  )}
                </div>

                {/* 장비 선택 */}
                {(item.requestType === 'equipment_with_worker' || item.requestType === 'equipment_only') && (
                  <div>
                    <Label>장비 선택 *</Label>
                    <Select
                      value={item.equipmentId}
                      onValueChange={(value) => updateItem(item.id, { equipmentId: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="장비를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentList?.map((equip: any) => (
                          <SelectItem key={equip.id} value={equip.id}>
                            {equip.reg_num} ({equip.equip_type_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 인력 선택 */}
                {(item.requestType === 'equipment_with_worker' || item.requestType === 'worker_only') && (
                  <div>
                    <Label>인력 선택 * {isBp && '(유도원만)'}</Label>
                    <Select
                      value={item.workerId}
                      onValueChange={(value) => updateItem(item.id, { workerId: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={isBp ? "유도원을 선택하세요" : "인력을 선택하세요"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWorkersList?.length === 0 ? (
                          <SelectItem value="" disabled>
                            {isBp ? "유도원이 없습니다." : "인력이 없습니다."}
                          </SelectItem>
                        ) : (
                          availableWorkersList?.map((worker: any) => {
                            const workerType = workerTypes?.find((wt: any) => wt.id === worker.workerTypeId);
                            return (
                              <SelectItem key={worker.id} value={worker.id}>
                                {worker.name} {workerType && `(${workerType.name})`}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {isBp && availableWorkersList?.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        유도원을 먼저 인력 관리에서 생성해주세요.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 반입 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>3. 반입 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="purpose">반입 목적 *</Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="반입 목적을 입력하세요"
                className="mt-2"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">{isBp ? '등록' : '반입'} 시작일 *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={requestedStartDate}
                  onChange={(e) => setRequestedStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="end-date">{isBp ? '등록' : '반입'} 종료일 *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={requestedEndDate}
                  onChange={(e) => setRequestedEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation('/entry-requests')}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                요청 중...
              </>
            ) : (
              "반입 요청 제출"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

