import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Upload, 
  Loader2, 
  FileText,
  AlertTriangle,
  RefreshCw,
  X
} from "lucide-react";
import { toast } from "sonner";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import type { DocumentStatus } from "@/components/DocumentStatusBadge";
import { EntryRequestDetail } from "@/components/EntryRequestDetail";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

// ============================================================
// 타입 정의
// ============================================================

interface ValidationResult {
  isValid: boolean;
  items: Array<{
    itemId: string;
    itemType: "equipment" | "worker";
    itemName: string;
    overallStatus: DocumentStatus;
    documents: Array<{
      docName: string;
      status: DocumentStatus;
      expiryDate?: string;
      daysUntilExpiry?: number;
    }>;
    issues: string[];
  }>;
  summary: {
    totalItems: number;
    validItems: number;
    warningItems: number;
    invalidItems: number;
  };
}

export default function EntryRequestsNew() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [comment, setComment] = useState("");
  const [workPlanUrl, setWorkPlanUrl] = useState("");

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bpCompanyFilter, setBpCompanyFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  // 다중 선택 상태
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  
  // 차량-인력 페어링 (equipmentId -> workerId)
  const [equipmentWorkerPairs, setEquipmentWorkerPairs] = useState<Record<string, string>>({});
  
  // 서류 검증 결과
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const role = user?.role?.toLowerCase();
  const isBp = role === 'bp';
  
  const [formData, setFormData] = useState({
    targetBpCompanyId: "",
    targetEpCompanyId: "", // BP가 EP 회사 선택
    purpose: "",
    requestedStartDate: "",
    requestedEndDate: "",
  });

  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.entryRequestsV2.list.useQuery();
  const { data: equipment, isLoading: equipmentLoading } = trpc.equipment.list.useQuery();
  const { data: workers } = trpc.workers.list.useQuery();
  
  // 디버깅: 장비 목록 확인
  useEffect(() => {
    console.log('[EntryRequestsNew] Equipment data:', equipment);
    console.log('[EntryRequestsNew] Equipment loading:', equipmentLoading);
    console.log('[EntryRequestsNew] Equipment count:', equipment?.length);
    if (equipment && equipment.length > 0) {
      console.log('[EntryRequestsNew] First equipment item:', equipment[0]);
      console.log('[EntryRequestsNew] First equipment keys:', Object.keys(equipment[0]));
      console.log('[EntryRequestsNew] First equipment regNum:', equipment[0].regNum, equipment[0].reg_num);
      console.log('[EntryRequestsNew] First equipment equipTypeName:', equipment[0].equipTypeName, equipment[0].equip_type);
    }
  }, [equipment, equipmentLoading, isDialogOpen]);
  const { data: bpCompanies } = trpc.companies.listByType.useQuery({ companyType: "bp" }, { enabled: !isBp });
  const { data: epCompanies } = trpc.companies.listByType.useQuery({ companyType: "ep" }, { enabled: isBp });

  // BP사 목록 (필터용)
  const uniqueBpCompanies = [...new Set(requests?.map((r: any) => r.bpCompanyName).filter(Boolean))];

  // 상세 보기 상태
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<any>(null);

  // ============================================================
  // 서류 검증 Mutation
  // ============================================================

  const validateMutation = trpc.entryRequestsV2.validateDocuments.useMutation({
    onSuccess: (result) => {
      setValidationResult(result);
      setIsValidating(false);
      
      if (result.isValid) {
        toast.success("모든 서류가 정상입니다.");
      } else {
        toast.warning(`서류 검증 완료: ${result.summary.invalidItems}개 항목에 문제가 있습니다.`);
      }
    },
    onError: (error) => {
      toast.error("서류 검증 실패: " + error.message);
      setIsValidating(false);
    },
  });

  // ============================================================
  // 반입 요청 생성 Mutation
  // ============================================================

  const createMutation = trpc.entryRequestsV2.create.useMutation({
    onSuccess: (result) => {
      toast.success(`반입 요청이 등록되었습니다. (${result.requestNumber})`);
      utils.entryRequestsV2.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("등록 실패: " + error.message),
  });

  // ============================================================
  // 승인 Mutations
  // ============================================================

  const ownerApproveMutation = trpc.entryRequestsV2.ownerApprove.useMutation({
    onSuccess: () => {
      toast.success("Owner 승인이 완료되었습니다.");
      utils.entryRequests.list.invalidate();
      setApproveDialogOpen(false);
      setComment("");
      setWorkPlanUrl("");
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const epApproveMutation = trpc.entryRequestsV2.epApprove.useMutation({
    onSuccess: () => {
      toast.success("EP 최종 승인이 완료되었습니다.");
      utils.entryRequests.list.invalidate();
      setApproveDialogOpen(false);
      setComment("");
    },
    onError: (error) => toast.error("승인 실패: " + error.message),
  });

  const rejectMutation = trpc.entryRequestsV2.reject.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 반려되었습니다.");
      utils.entryRequests.list.invalidate();
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error) => toast.error("반려 실패: " + error.message),
  });

  const cancelMutation = trpc.entryRequestsV2.cancel.useMutation({
    onSuccess: () => {
      toast.success("반입 요청이 취소되었습니다.");
      utils.entryRequestsV2.list.invalidate();
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error) => toast.error("취소 실패: " + error.message),
  });

  // ============================================================
  // 폼 핸들러
  // ============================================================

  const resetForm = () => {
    setFormData({
      targetBpCompanyId: "",
      targetEpCompanyId: "",
      purpose: "",
      requestedStartDate: "",
      requestedEndDate: "",
    });
    setSelectedEquipmentIds([]);
    setSelectedWorkerIds([]);
    setValidationResult(null);
  };

  const handleEquipmentToggle = (equipmentId: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(equipmentId)
        ? prev.filter((id) => id !== equipmentId)
        : [...prev, equipmentId]
    );
    // 선택이 변경되면 검증 결과 초기화
    setValidationResult(null);
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
    // 선택이 변경되면 검증 결과 초기화
    setValidationResult(null);
  };

  const handleValidate = () => {
    if (selectedEquipmentIds.length === 0 && selectedWorkerIds.length === 0) {
      toast.error("장비 또는 인력을 최소 1개 이상 선택해주세요.");
      return;
    }

    setIsValidating(true);
    validateMutation.mutate({
      equipmentIds: selectedEquipmentIds,
      workerIds: selectedWorkerIds,
    });
  };

  const handleSubmit = () => {
    // Owner는 BP 회사 선택 필수, BP는 EP 회사 선택 필수
    if (!isBp && !formData.targetBpCompanyId) {
      toast.error("BP 회사를 선택해주세요.");
      return;
    }
    if (isBp && !formData.targetEpCompanyId) {
      toast.error("EP 회사를 선택해주세요.");
      return;
    }

    if (!validationResult) {
      toast.error("먼저 서류 검증을 진행해주세요.");
      return;
    }

    if (!validationResult.isValid) {
      toast.error("서류에 문제가 있어 반입 요청을 할 수 없습니다.");
      return;
    }

    // items 배열 생성 (백엔드 API 형식에 맞게)
    const items = [];

    // 장비-인력 페어링
    for (const equipmentId of selectedEquipmentIds) {
      const workerId = equipmentWorkerPairs[equipmentId];
      if (workerId) {
        items.push({
          requestType: 'equipment_with_worker' as const,
          equipmentId,
          workerId,
        });
      } else {
        items.push({
          requestType: 'equipment_only' as const,
          equipmentId,
        });
      }
    }

    // 인력 단독 (페어링되지 않은 인력)
    for (const workerId of selectedWorkerIds) {
      const isPaired = Object.values(equipmentWorkerPairs).includes(workerId);
      if (!isPaired) {
        items.push({
          requestType: 'worker_only' as const,
          workerId,
        });
      }
    }

    createMutation.mutate({
      targetBpCompanyId: isBp ? undefined : formData.targetBpCompanyId,
      targetEpCompanyId: isBp ? formData.targetEpCompanyId : undefined,
      purpose: formData.purpose,
      requestedStartDate: formData.requestedStartDate,
      requestedEndDate: formData.requestedEndDate,
      items,
    });
  };

  const handleOwnerApprove = () => {
    if (!workPlanUrl) {
      toast.error("작업계획서를 업로드해주세요.");
      return;
    }

    ownerApproveMutation.mutate({
      id: selectedRequest.id,
      workPlanFileUrl: workPlanUrl,
      comment,
    });
  };

  const handleEpApprove = () => {
    epApproveMutation.mutate({
      id: selectedRequest.id,
      comment,
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    rejectMutation.mutate({
      id: selectedRequest.id,
      reason: rejectReason,
    });
  };

  // ============================================================
  // 상태 표시 함수
  // ============================================================

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      bp_draft: { label: "임시저장", className: "bg-gray-100 text-gray-700 border-gray-300" },
      owner_requested: { label: "승인 대기", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
      bp_requested: { label: "BP 요청", className: "bg-blue-100 text-blue-700 border-blue-300" },
      bp_reviewing: { label: "BP 검토중", className: "bg-indigo-100 text-indigo-700 border-indigo-300" },
      bp_approved: { label: "결제 대기", className: "bg-orange-100 text-orange-700 border-orange-300" },
      ep_reviewing: { label: "EP 검토중", className: "bg-purple-100 text-purple-700 border-purple-300" },
      owner_approved: { label: "Owner 승인", className: "bg-teal-100 text-teal-700 border-teal-300" },
      ep_approved: { label: "EP 최종 승인", className: "bg-green-100 text-green-700 border-green-300" },
      cancelled: { label: "취소됨", className: "bg-slate-100 text-slate-700 border-slate-300" },
      rejected: { label: "반려", className: "bg-red-100 text-red-700 border-red-300" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-300" };
    return <Badge className={`${config.className} border`}>{config.label}</Badge>;
  };

  // ============================================================
  // 필터링 및 정렬 로직
  // ============================================================

  // 1. 필터링
  const filteredRequests = requests?.filter((request: any) => {
    // 상태 필터
    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    
    // BP사 필터
    if (bpCompanyFilter !== "all" && request.bpCompanyName !== bpCompanyFilter) return false;
    
    // 검색어 필터
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        request.request_number?.toLowerCase().includes(search) ||
        request.bpCompanyName?.toLowerCase().includes(search) ||
        request.ownerName?.toLowerCase().includes(search)
      );
    }
    
    return true;
  }) || [];

  // 2. 정렬 (승인 대기 우선)
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // EP 사용자: bp_approved (결제 대기) 최우선, 그 다음 ep_reviewing, bp_requested
    if (user?.role === "ep") {
      const getEpPriority = (status: string) => {
        if (status === "bp_approved") return 3; // 결제 대기 최우선
        if (status === "ep_reviewing") return 2;
        if (status === "bp_requested") return 1;
        return 0;
      };
      const aPriority = getEpPriority(a.status);
      const bPriority = getEpPriority(b.status);
      if (aPriority !== bPriority) return bPriority - aPriority; // 높은 우선순위가 위로
    }
    
    // BP 사용자: owner_requested 우선
    if (user?.role === "bp") {
      const aPriority = a.status === "owner_requested" ? 1 : 0;
      const bPriority = b.status === "owner_requested" ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
    }
    
    // Owner 사용자: bp_requested 우선
    if (user?.role === "owner") {
      const aPriority = a.status === "bp_requested" ? 1 : 0;
      const bPriority = b.status === "bp_requested" ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
    }
    
    // 그 외: 요청일(created_at) 기준 최신순 (최근 것이 위로)
    // 날짜 파싱 개선: ISO 문자열 또는 타임스탬프 모두 처리
    const parseDate = (dateStr: any): number => {
      if (!dateStr) return 0;
      if (typeof dateStr === 'string') {
        // ISO 형식 또는 다른 형식 처리
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }
      if (dateStr instanceof Date) {
        return dateStr.getTime();
      }
      return 0;
    };
    
    const aDate = parseDate(a.created_at || a.createdAt || a.requested_start_date || a.requestedStartDate);
    const bDate = parseDate(b.created_at || b.createdAt || b.requested_start_date || b.requestedStartDate);
    return bDate - aDate; // 내림차순 (최신이 위로)
  });

  // 승인 대기 개수
  const pendingCount = user?.role === "ep"
    ? requests?.filter((r: any) => r.status === "bp_approved" || r.status === "ep_reviewing" || r.status === "bp_requested").length || 0
    : user?.role === "bp"
    ? requests?.filter((r: any) => r.status === "owner_requested").length || 0
    : user?.role === "owner"
    ? requests?.filter((r: any) => r.status === "bp_requested").length || 0
    : 0;

  // ============================================================
  // 렌더링
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">반입,출입 요청 관리</h1>
          <p className="text-muted-foreground mt-1">
            장비 및 인력 반입,출입 요청을 관리합니다.
            {pendingCount > 0 && (
              <span className="ml-2 text-orange-600 font-semibold">
                ⚠️ 승인 대기 {pendingCount}건
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          반입,출입 요청 등록
        </Button>
      </div>

      {/* 반입 요청 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>반입,출입 요청 목록 ({sortedRequests.length}건)</CardTitle>
          <CardDescription>등록된 반입,출입 요청을 확인하고 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터 UI - 한 줄 통일 디자인 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="owner_requested">승인 대기</SelectItem>
                  <SelectItem value="bp_approved">BP 승인</SelectItem>
                  <SelectItem value="ep_reviewing">EP 검토중</SelectItem>
                  <SelectItem value="ep_approved">최종 승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">협력업체</Label>
              <Select value={bpCompanyFilter} onValueChange={setBpCompanyFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {uniqueBpCompanies.map((company: string) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[250px]">
              <Label className="text-sm font-medium mb-1.5 block">검색</Label>
              <Input
                placeholder="요청번호, 업체명, 요청자..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>요청 번호</TableHead>
                <TableHead>협력업체 (BP)</TableHead>
                <TableHead>요청자</TableHead>
                <TableHead>장비/인력</TableHead>
                <TableHead>요청일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRequests.length > 0 ? (
                sortedRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.request_number || request.id}</TableCell>
                    <TableCell>{request.bpCompanyName || "-"}</TableCell>
                    <TableCell>{request.ownerName || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.equipmentCount > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-300">🚜 장비 {request.equipmentCount}</Badge>
                        )}
                        {request.workerCount > 0 && (
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-300">👷 인력 {request.workerCount}</Badge>
                        )}
                        {request.equipmentCount === 0 && request.workerCount === 0 && (
                          <Badge variant="secondary">없음</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.created_at ? new Date(request.created_at).toLocaleDateString("ko-KR") : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequestForDetail(request);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          상세
                        </Button>

                        {/* BP 승인 버튼 */}
                        {user?.role === "bp" && request.status === "owner_requested" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setSelectedRequestForDetail(request);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            승인
                          </Button>
                        )}

                        {/* Owner 승인 버튼 */}
                        {user?.role === "owner" && request.status === "bp_requested" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedRequestForDetail(request);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            승인
                          </Button>
                        )}

                        {/* EP 승인 버튼 (승인 대기 상태) */}
                        {user?.role === "ep" && (request.status === "bp_approved" || request.status === "ep_reviewing" || request.status === "bp_requested") && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => {
                              // 다이얼로그에서 상세 보기 및 승인
                              setSelectedRequestForDetail(request);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            승인 대기
                          </Button>
                        )}

                        {/* EP 승인 완료 표시 */}
                        {user?.role === "ep" && request.status === "ep_approved" && (
                          <Badge variant="default" className="bg-green-600 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            승인 완료
                          </Badge>
                        )}

                        {/* 취소 버튼 (Owner: owner_requested/bp_reviewing, BP: owner_requested/bp_reviewing/bp_approved) */}
                        {((user?.role === "owner" && (request.status === "owner_requested" || request.status === "bp_reviewing")) ||
                          (user?.role === "bp" && (request.status === "owner_requested" || request.status === "bp_reviewing" || request.status === "bp_approved"))) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm("정말 이 반입 요청을 취소하시겠습니까?")) {
                                cancelMutation.mutate({
                                  id: request.id,
                                  reason: "요청자에 의해 취소됨",
                                });
                              }
                            }}
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-1" />
                            )}
                            취소
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {requests && requests.length > 0 ? "필터 조건에 맞는 요청이 없습니다." : "등록된 반입 요청이 없습니다."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 반입 요청 등록 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>반입 요청 등록</DialogTitle>
            <DialogDescription>
              장비 및 인력을 선택하고 반입 요청을 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 장비 선택 */}
            <div className="w-full">
              <Label className="text-lg font-semibold mb-3 block">장비 선택</Label>
              <div 
                className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto bg-background"
                style={{ minHeight: '100px' }}
              >
                {equipmentLoading ? (
                  <div className="text-center text-muted-foreground py-4">
                    장비 목록을 불러오는 중...
                  </div>
                ) : equipment && equipment.length > 0 ? (
                  equipment.map((equip: any) => {
                    // 필드명 호환성 처리
                    const regNum = equip.regNum || equip.reg_num || equip.id;
                    const equipTypeName = equip.equipTypeName || equip.equip_type?.name || "장비 종류 없음";
                    
                    console.log('[EntryRequestsNew] Rendering equipment:', equip.id, regNum, equipTypeName);
                    
                    return (
                      <div
                        key={equip.id}
                        className="flex items-center space-x-3 p-2 hover:bg-accent rounded-md"
                      >
                        <Checkbox
                          id={`equipment-${equip.id}`}
                          checked={selectedEquipmentIds.includes(equip.id)}
                          onCheckedChange={() => handleEquipmentToggle(equip.id)}
                        />
                        <label
                          htmlFor={`equipment-${equip.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{regNum}</div>
                          <div className="text-sm text-muted-foreground">
                            {equipTypeName}
                          </div>
                        </label>
                        {selectedEquipmentIds.includes(equip.id) && (
                          <Select
                            value={equipmentWorkerPairs[equip.id] || ""}
                            onValueChange={(value) => {
                              setEquipmentWorkerPairs({
                                ...equipmentWorkerPairs,
                                [equip.id]: value,
                              });
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="운전자 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {workers?.filter(w => w.phone && w.pinCode).map((worker: any) => (
                                <SelectItem key={worker.id} value={worker.id}>
                                  {worker.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {validationResult && (
                          <div>
                            {(() => {
                              const item = validationResult.items.find(
                                (i) => i.itemId === equip.id && i.itemType === "equipment"
                              );
                              return item ? (
                                <DocumentStatusBadge status={item.overallStatus} />
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    {equipment === undefined 
                      ? "장비 목록을 불러오는 중..." 
                      : "등록된 장비가 없습니다."}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                선택된 장비: {selectedEquipmentIds.length}개
              </p>
            </div>

            {/* 인력 선택 */}
            <div>
              <Label className="text-lg font-semibold mb-3 block">인력 선택</Label>
              <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                {workers && workers.length > 0 ? (
                  workers.map((worker: any) => (
                    <div
                      key={worker.id}
                      className="flex items-center space-x-3 p-2 hover:bg-accent rounded-md"
                    >
                      <Checkbox
                        id={`worker-${worker.id}`}
                        checked={selectedWorkerIds.includes(worker.id)}
                        onCheckedChange={() => handleWorkerToggle(worker.id)}
                      />
                      <label
                        htmlFor={`worker-${worker.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{worker.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {worker.workerTypeName || "인력 유형 없음"}
                        </div>
                      </label>
                      {validationResult && (
                        <div>
                          {(() => {
                            const item = validationResult.items.find(
                              (i) => i.itemId === worker.id && i.itemType === "worker"
                            );
                            return item ? (
                              <DocumentStatusBadge status={item.overallStatus} />
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    등록된 인력이 없습니다.
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                선택된 인력: {selectedWorkerIds.length}개
              </p>
            </div>

            {/* 서류 검증 버튼 */}
            <div>
              <Button
                onClick={handleValidate}
                disabled={
                  isValidating ||
                  (selectedEquipmentIds.length === 0 && selectedWorkerIds.length === 0)
                }
                className="w-full"
                variant="outline"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    서류 검증 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    서류 검증
                  </>
                )}
              </Button>
            </div>

            {/* 서류 검증 결과 */}
            {validationResult && (
              <div className="space-y-4">
                <Alert
                  variant={validationResult.isValid ? "default" : "destructive"}
                >
                  {validationResult.isValid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {validationResult.isValid
                      ? "서류 검증 통과"
                      : "서류 검증 실패"}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.isValid ? (
                      <p>모든 서류가 정상입니다. 반입 요청을 진행할 수 있습니다.</p>
                    ) : (
                      <div>
                        <p className="mb-2">
                          {validationResult.summary.invalidItems}개 항목에 문제가
                          있습니다.
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.items
                            .filter((item) => item.issues.length > 0)
                            .map((item) => (
                              <li key={item.itemId}>
                                <strong>{item.itemName}</strong>
                                <ul className="list-circle list-inside ml-4">
                                  {item.issues.map((issue, idx) => (
                                    <li key={idx} className="text-sm">
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>

                {/* 상세 검증 결과 */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">상세 검증 결과</h4>
                  <div className="space-y-3">
                    {validationResult.items.map((item) => (
                      <div key={item.itemId} className="border-b pb-3 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{item.itemName}</span>
                          <DocumentStatusBadge status={item.overallStatus} />
                        </div>
                        <div className="space-y-1 ml-4">
                          {item.documents.map((doc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{doc.docName}</span>
                              <DocumentStatusBadge
                                status={doc.status}
                                daysUntilExpiry={doc.daysUntilExpiry}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 반입 정보 입력 */}
            <div className="space-y-4">
              {/* Owner는 BP 회사 선택, BP는 EP 회사 선택 */}
              {!isBp ? (
                <div>
                  <Label htmlFor="targetBpCompanyId">BP 회사 선택 *</Label>
                  <Select
                    value={formData.targetBpCompanyId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, targetBpCompanyId: value })
                    }
                  >
                    <SelectTrigger>
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
                </div>
              ) : (
                <div>
                  <Label htmlFor="targetEpCompanyId">EP 회사 선택 *</Label>
                  <Select
                    value={formData.targetEpCompanyId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, targetEpCompanyId: value })
                    }
                  >
                    <SelectTrigger>
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
                </div>
              )}

              <div>
                <Label htmlFor="purpose">투입 목적</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  placeholder="투입 목적을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requestedStartDate">투입 예정일</Label>
                  <Input
                    id="requestedStartDate"
                    type="date"
                    value={formData.requestedStartDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestedStartDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="requestedEndDate">철수 예정일</Label>
                  <Input
                    id="requestedEndDate"
                    type="date"
                    value={formData.requestedEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestedEndDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !validationResult ||
                !validationResult.isValid ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                "반입 요청 등록"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Owner/EP 승인 다이얼로그 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>반입 요청 승인</DialogTitle>
            <DialogDescription>
              반입 요청을 검토하고 승인합니다.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label>요청 번호</Label>
                <p className="text-sm font-medium">{selectedRequest.requestNumber}</p>
              </div>

              <div>
                <Label>요청일</Label>
                <p className="text-sm">
                  {new Date(selectedRequest.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>

              <div>
                <Label>현재 상태</Label>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>

              {/* Owner 승인 시 작업계획서 업로드 */}
              {user?.role === "owner" &&
                selectedRequest.status === "bp_requested" && (
                  <div>
                    <Label htmlFor="workPlanUrl">작업계획서 URL</Label>
                    <Input
                      id="workPlanUrl"
                      value={workPlanUrl}
                      onChange={(e) => setWorkPlanUrl(e.target.value)}
                      placeholder="작업계획서 파일 URL을 입력하세요"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      작업계획서를 업로드하고 URL을 입력해주세요.
                    </p>
                  </div>
                )}

              <div>
                <Label htmlFor="comment">코멘트 (선택사항)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="코멘트를 입력하세요"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(true);
                setApproveDialogOpen(false);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              반려
            </Button>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              취소
            </Button>
            {user?.role === "owner" &&
              selectedRequest?.status === "bp_requested" && (
                <Button
                  onClick={handleOwnerApprove}
                  disabled={ownerApproveMutation.isPending}
                >
                  {ownerApproveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      승인 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Owner 승인
                    </>
                  )}
                </Button>
              )}
            {user?.role === "ep" && selectedRequest?.status === "owner_approved" && (
              <Button
                onClick={handleEpApprove}
                disabled={epApproveMutation.isPending}
              >
                {epApproveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    승인 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    EP 최종 승인
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반려 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반입 요청 반려</DialogTitle>
            <DialogDescription>
              반입 요청을 반려하는 사유를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="rejectReason">반려 사유</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setApproveDialogOpen(true);
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  반려 중...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  반려
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상세 보기 */}
      <EntryRequestDetail
        request={selectedRequestForDetail}
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedRequestForDetail(null);
        }}
        userRole={user?.role}
      />
    </div>
  );
}

