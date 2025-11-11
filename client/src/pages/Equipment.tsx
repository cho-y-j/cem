import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, FileText, X, UserPlus, Eye, ClipboardCheck, Check, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import AssignDriverDialog from "@/components/AssignDriverDialog";
import { useAuth } from "@/_core/hooks/useAuth";

interface DocFile {
  docTypeId: string;
  docName: string;
  file: File | null;
  isMandatory: boolean;
  hasExpiry: boolean;
  issueDate?: string;
  expiryDate?: string;
}

// 파일을 base64로 변환하는 헬퍼 함수
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/png;base64," 부분 제거
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function Equipment() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    equipTypeId: "",
    regNum: "",
    specification: "",
    status: "idle",
    nfcTagId: "",
  });
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);
  const [assignDriverDialogOpen, setAssignDriverDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingEquipmentId, setViewingEquipmentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [ownerCompanyFilter, setOwnerCompanyFilter] = useState<string>("");
  const [bpCompanyFilter, setBpCompanyFilter] = useState<string>("");
  const [epCompanyFilter, setEpCompanyFilter] = useState<string>("");
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const utils = trpc.useUtils();
  const { data: ownerCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "owner" },
    { enabled: role === "admin" || role === "bp" || role === "ep" || role === "owner" }
  );
  const { data: bpCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "bp" },
    { enabled: role === "admin" || role === "ep" || role === "owner" }
  );
  const { data: epCompanies = [] } = trpc.companies.listByType.useQuery(
    { companyType: "ep" },
    { enabled: role === "admin" || role === "owner" }
  );

  useEffect(() => {
    if (!user || filtersInitialized) return;

    if (role === "bp" && user.companyId) {
      setBpCompanyFilter(user.companyId);
    }

    if (role === "ep" && user.companyId) {
      setEpCompanyFilter(user.companyId);
    }

    setFiltersInitialized(true);
  }, [user, role, filtersInitialized]);

  const equipmentFilters = useMemo(() => {
    const input: Record<string, string> = {};
    if (searchTerm.trim()) {
      input.search = searchTerm.trim();
    }
    if (ownerCompanyFilter) {
      input.ownerCompanyId = ownerCompanyFilter;
    }

    if (role === "bp" && user?.companyId) {
      input.bpCompanyId = user.companyId;
    } else if (bpCompanyFilter) {
      input.bpCompanyId = bpCompanyFilter;
    }

    if (role === "ep" && user?.companyId) {
      input.epCompanyId = user.companyId;
    } else if (epCompanyFilter) {
      input.epCompanyId = epCompanyFilter;
    }

    return Object.keys(input).length > 0 ? input : undefined;
  }, [searchTerm, ownerCompanyFilter, bpCompanyFilter, epCompanyFilter, role, user?.companyId]);

  const { data: equipmentList, isLoading } = trpc.equipment.list.useQuery(equipmentFilters);
  const { data: equipTypes } = trpc.equipTypes.list.useQuery();
  const { data: typeDocs } = trpc.typeDocs.listByEquipType.useQuery(
    { equipTypeId: formData.equipTypeId },
    { enabled: !!formData.equipTypeId }
  );

  // 장비 종류 변경 시 필수 서류 목록 초기화
  useEffect(() => {
    if (typeDocs && typeDocs.length > 0) {
      setDocFiles(
        typeDocs.map((doc) => ({
          docTypeId: doc.id,
          docName: doc.docName,
          file: null,
          isMandatory: doc.isMandatory,
          hasExpiry: doc.hasExpiry,
        }))
      );
    } else {
      setDocFiles([]);
    }
  }, [typeDocs]);

  const createWithDocsMutation = trpc.equipment.createWithDocs.useMutation({
    onSuccess: () => {
      toast.success("장비와 서류가 등록되었습니다.");
      utils.equipment.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("등록 실패: " + error.message);
    },
  });

  const updateMutation = trpc.equipment.update.useMutation({
    onSuccess: () => {
      toast.success("장비가 수정되었습니다.");
      utils.equipment.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("수정 실패: " + error.message);
    },
  });

  const deleteMutation = trpc.equipment.delete.useMutation({
    onSuccess: () => {
      toast.success("장비가 삭제되었습니다.");
      utils.equipment.list.invalidate();
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ equipTypeId: "", regNum: "", specification: "", status: "idle", nfcTagId: "" });
    setEditingId(null);
    setDocFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNfcTag = formData.nfcTagId.trim();
    const normalizedNfcTag = trimmedNfcTag.length > 0 ? trimmedNfcTag : null;

    if (normalizedNfcTag) {
      const isTagDuplicate = equipmentList?.some(
        (eq) => eq.nfcTagId === normalizedNfcTag && eq.id !== editingId
      );

      if (isTagDuplicate) {
        toast.error(`NFC 태그 "${normalizedNfcTag}"는 이미 다른 장비에 등록되어 있습니다.`);
        return;
      }
    }
    
    if (editingId) {
      // 수정 모드
      updateMutation.mutate({
        id: editingId,
        equipTypeId: formData.equipTypeId,
        regNum: formData.regNum,
        specification: formData.specification,
        status: formData.status,
        nfcTagId: normalizedNfcTag,
      });
    } else {
      // 등록 모드
      // 등록 번호 중복 체크
      const isDuplicate = equipmentList?.some(
        (eq) => eq.regNum === formData.regNum
      );
      
      if (isDuplicate) {
        toast.error(`등록 번호 "${formData.regNum}"는 이미 사용 중입니다.`);
        return;
      }
      
      // 필수 서류 체크
      const missingDocs = docFiles.filter(
        (doc) => doc.isMandatory && !doc.file
      );
      
      if (missingDocs.length > 0) {
        toast.warning(
          `필수 서류를 업로드해주세요: ${missingDocs.map((d) => d.docName).join(", ")}`
        );
        return;
      }
      
      // 만료일이 있는 서류의 만료일 체크
      const missingExpiryDocs = docFiles.filter(
        (doc) => doc.hasExpiry && doc.file && !doc.expiryDate
      );
      
      if (missingExpiryDocs.length > 0) {
        toast.warning(
          `만료일을 입력해주세요: ${missingExpiryDocs.map((d) => d.docName).join(", ")}`
        );
        return;
      }
      
      try {
        // 파일을 base64로 변환
        const docs = await Promise.all(
          docFiles
            .filter((doc) => doc.file)
            .map(async (doc) => ({
              docTypeId: doc.docTypeId,
              docName: doc.docName,
              fileData: await fileToBase64(doc.file!),
              fileName: doc.file!.name,
              mimeType: doc.file!.type,
              issueDate: doc.issueDate,
              expiryDate: doc.expiryDate,
            }))
        );

        createWithDocsMutation.mutate({
          ...formData,
          nfcTagId: normalizedNfcTag ?? undefined,
          docs: docs.length > 0 ? docs : undefined,
        });
      } catch (error) {
        toast.error("파일 처리 중 오류가 발생했습니다.");
        console.error(error);
      }
    }
  };

  const handleEdit = (equipment: any) => {
    setEditingId(equipment.id);
    setFormData({
      equipTypeId: equipment.equipTypeId,
      regNum: equipment.regNum,
      specification: equipment.specification || "",
      status: equipment.status,
      nfcTagId: equipment.nfcTagId || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleFileChange = (docTypeId: string, file: File | null) => {
    setDocFiles((prev) =>
      prev.map((doc) =>
        doc.docTypeId === docTypeId ? { ...doc, file } : doc
      )
    );
  };

  const handleDateChange = (
    docTypeId: string,
    field: "issueDate" | "expiryDate",
    value: string
  ) => {
    setDocFiles((prev) =>
      prev.map((doc) =>
        doc.docTypeId === docTypeId ? { ...doc, [field]: value } : doc
      )
    );
  };

  const getEquipTypeName = (equipTypeId: string) => {
    return equipTypes?.find((t) => t.id === equipTypeId)?.name || "-";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      idle: "유휴",
      operating: "운영중",
      maintenance: "점검중",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idle: "bg-gray-100 text-gray-700",
      operating: "bg-green-100 text-green-700",
      maintenance: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">장비 관리</h1>
          <p className="text-muted-foreground">등록된 장비를 관리합니다.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          장비 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">필터</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            회사별 필터와 검색어를 사용해 장비를 빠르게 찾을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <div className="w-full md:w-56">
              <Label htmlFor="equipment-search">검색</Label>
              <Input
                id="equipment-search"
                placeholder="차량번호 또는 태그"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            {(role === "admin" || role === "bp" || role === "ep") && (
              <div className="w-full md:w-56">
                <Label>Owner 회사</Label>
                <Select
                  value={ownerCompanyFilter || "all"}
                  onValueChange={(value) => setOwnerCompanyFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {ownerCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(role === "admin" || role === "ep" || role === "owner") && (
              <div className="w-full md:w-56">
                <Label>BP 회사</Label>
                <Select
                  value={bpCompanyFilter || "all"}
                  onValueChange={(value) => setBpCompanyFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {bpCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === "admin" && (
              <div className="w-full md:w-56">
                <Label>EP 회사</Label>
                <Select
                  value={epCompanyFilter || "all"}
                  onValueChange={(value) => setEpCompanyFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {epCompanies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>장비 목록</CardTitle>
          <CardDescription>
            총 {equipmentList?.length || 0}개의 장비가 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : equipmentList && equipmentList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>등록번호</TableHead>
                  <TableHead>NFC 태그</TableHead>
                  <TableHead>장비 종류</TableHead>
                  <TableHead>배정 운전자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentList.map((equipment) => (
                  <TableRow key={equipment.id}>
                    <TableCell className="font-medium">{equipment.regNum}</TableCell>
                    <TableCell>
                      {equipment.nfcTagId ? (
                        <Badge variant="outline" className="text-xs">
                          {equipment.nfcTagId}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">미등록</span>
                      )}
                    </TableCell>
                    <TableCell>{getEquipTypeName(equipment.equipTypeId)}</TableCell>
                    <TableCell>
                      {equipment.assignedWorkerId ? (
                        <span className="text-sm">
                          {equipmentList.find(e => e.id === equipment.id)?.assignedWorkerName || '운전자 배정됨'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">미배정</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(equipment.status)}`}>
                        {getStatusLabel(equipment.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {equipment.createdAt
                        ? new Date(equipment.createdAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingEquipmentId(equipment.id);
                          setDetailDialogOpen(true);
                        }}
                        title="상세보기"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipment({
                            id: equipment.id,
                            regNum: equipment.regNum,
                            equipTypeName: getEquipTypeName(equipment.equipTypeId),
                            assignedWorkerId: equipment.assignedWorkerId,
                          });
                          setAssignDriverDialogOpen(true);
                        }}
                        title="운전자 배정"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(equipment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(equipment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              등록된 장비가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "장비 수정" : "장비 등록"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "장비 정보를 수정하세요."
                : "장비 정보와 필수 서류를 입력하세요."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">기본 정보</h3>
                <div className="space-y-2">
                  <Label htmlFor="equipTypeId">장비 종류 *</Label>
                  <Select
                    value={formData.equipTypeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, equipTypeId: value })
                    }
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="장비 종류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNum">등록번호 *</Label>
                  <Input
                    id="regNum"
                    value={formData.regNum}
                    onChange={(e) =>
                      setFormData({ ...formData, regNum: e.target.value })
                    }
                    placeholder="예: 12가3456"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specification">규격</Label>
                  <Input
                    id="specification"
                    value={formData.specification}
                    onChange={(e) =>
                      setFormData({ ...formData, specification: e.target.value })
                    }
                    placeholder="예: 10톤급, 작업높이 20m, 버킷용량 0.5m³"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nfcTagId">NFC 태그</Label>
                  <Input
                    id="nfcTagId"
                    value={formData.nfcTagId}
                    onChange={(e) =>
                      setFormData({ ...formData, nfcTagId: e.target.value })
                    }
                    placeholder="태그 ID (선택)"
                  />
                  <p className="text-xs text-muted-foreground">
                    현장에서 부착한 태그 값이 있는 경우 입력해주세요. 공백이면 태그가 등록되지 않습니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle">유휴</SelectItem>
                      <SelectItem value="operating">운영중</SelectItem>
                      <SelectItem value="maintenance">점검중</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 필수 서류 */}
              {!editingId && docFiles.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-sm font-semibold">
                    필수 서류 {docFiles.filter((d) => d.isMandatory).length > 0 && "*"}
                  </h3>
                  <div className="space-y-4">
                    {docFiles.map((doc) => (
                      <div
                        key={doc.docTypeId}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.docName}</span>
                            {doc.isMandatory && (
                              <span className="text-xs text-red-500">*필수</span>
                            )}
                          </div>
                          {doc.file && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileChange(doc.docTypeId, null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`file-${doc.docTypeId}`}>
                            파일 업로드 {doc.isMandatory && "*"}
                          </Label>
                          <Input
                            id={`file-${doc.docTypeId}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                              handleFileChange(
                                doc.docTypeId,
                                e.target.files?.[0] || null
                              )
                            }
                          />
                          {doc.file && (
                            <p className="text-xs text-muted-foreground">
                              ✓ {doc.file.name} ({(doc.file.size / 1024).toFixed(1)} KB)
                            </p>
                          )}
                        </div>

                        {doc.hasExpiry && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`issue-${doc.docTypeId}`}>
                                발급일
                              </Label>
                              <Input
                                id={`issue-${doc.docTypeId}`}
                                type="date"
                                value={doc.issueDate || ""}
                                onChange={(e) =>
                                  handleDateChange(
                                    doc.docTypeId,
                                    "issueDate",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`expiry-${doc.docTypeId}`}>
                                만료일 *
                              </Label>
                              <Input
                                id={`expiry-${doc.docTypeId}`}
                                type="date"
                                value={doc.expiryDate || ""}
                                onChange={(e) =>
                                  handleDateChange(
                                    doc.docTypeId,
                                    "expiryDate",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createWithDocsMutation.isPending || updateMutation.isPending}
              >
                {createWithDocsMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : editingId ? (
                  "수정"
                ) : (
                  "등록"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 운전자 배정 다이얼로그 */}
      {selectedEquipment && (
        <AssignDriverDialog
          open={assignDriverDialogOpen}
          onOpenChange={setAssignDriverDialogOpen}
          equipment={selectedEquipment}
          onSuccess={() => {
            setSelectedEquipment(null);
          }}
        />
      )}

      {/* 장비 상세 다이얼로그 */}
      <EquipmentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        equipmentId={viewingEquipmentId}
      />
    </div>
  );
}

// ===== 장비 상세 다이얼로그 컴포넌트 =====
interface EquipmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string | null;
}

function EquipmentDetailDialog({ open, onOpenChange, equipmentId }: EquipmentDetailDialogProps) {
  const { data: equipment } = trpc.equipment.getById.useQuery(
    { id: equipmentId! },
    { enabled: !!equipmentId && open }
  );

  const { data: driverInspections } = trpc.driverInspection.listRecordsByEquipment.useQuery(
    { equipmentId: equipmentId! },
    { enabled: !!equipmentId && open }
  );

  if (!equipment) return null;

  const getFrequencyBadge = (frequency: string) => {
    const map: Record<string, { label: string; color: string }> = {
      daily: { label: "일일", color: "bg-blue-100 text-blue-800" },
      weekly: { label: "주간", color: "bg-purple-100 text-purple-800" },
      monthly: { label: "월간", color: "bg-orange-100 text-orange-800" },
    };
    const info = map[frequency] || { label: frequency, color: "bg-gray-100 text-gray-800" };
    return <Badge className={`${info.color} text-xs`}>{info.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      completed: { label: "완료", className: "bg-green-500" },
      pending: { label: "대기", className: "bg-yellow-500" },
      approved: { label: "승인", className: "bg-blue-500" },
      rejected: { label: "반려", className: "bg-red-500" },
    };
    const info = map[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={`${info.className} text-white text-xs`}>{info.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{equipment.regNum} - 장비 관리</DialogTitle>
          <DialogDescription>
            장비의 상세 정보, 운전자 점검 이력, 소모품 관리 정보를 확인합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">기본 정보</TabsTrigger>
            <TabsTrigger value="inspections">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              운전자 점검 이력 ({driverInspections?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* 기본 정보 탭 */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">장비 정보</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">등록번호</div>
                  <div className="font-medium">{equipment.regNum}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">장비 종류</div>
                  <div className="font-medium">{equipment.equipType?.name || "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">상태</div>
                  <div>
                    <Badge variant="secondary">
                      {equipment.status === "idle" ? "유휴" :
                       equipment.status === "operating" ? "운영중" :
                       equipment.status === "maintenance" ? "점검중" : equipment.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">등록일</div>
                  <div className="font-medium">
                    {equipment.createdAt
                      ? format(new Date(equipment.createdAt), "PPP", { locale: ko })
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">NFC 태그</div>
                  <div className="font-medium">
                    {equipment.nfcTagId ? (
                      <Badge variant="outline" className="text-xs">
                        {equipment.nfcTagId}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">미등록</span>
                    )}
                  </div>
                </div>
                {equipment.specification && (
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground">제원</div>
                    <div className="font-medium">{equipment.specification}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {equipment.assignedWorker && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">배정 운전자</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">이름</div>
                    <div className="font-medium">{equipment.assignedWorker.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">전화번호</div>
                    <div className="font-medium">{equipment.assignedWorker.phone || "-"}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 운전자 점검 이력 탭 */}
          <TabsContent value="inspections" className="space-y-4">
            {!driverInspections || driverInspections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <div className="text-muted-foreground">운전자 점검 이력이 없습니다</div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {driverInspections.map((record: any) => (
                  <Card key={record.id} className="hover:border-primary transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{record.template?.name || "점검표"}</CardTitle>
                          <CardDescription>
                            {format(new Date(record.inspectionDate), "PPP", { locale: ko })}
                            {record.driver && ` · 운전자: ${record.driver.name}`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {getFrequencyBadge(record.checkFrequency)}
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* 운행 정보 */}
                      <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">누적 시간</div>
                          <div className="text-xl font-bold text-blue-700">
                            {record.accumulatedHours ? `${record.accumulatedHours}h` : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">누적 거리</div>
                          <div className="text-xl font-bold text-blue-700">
                            {record.accumulatedMileage ? `${record.accumulatedMileage}km` : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">금일 운행시간</div>
                          <div className="text-xl font-bold text-green-700">
                            {record.operationHoursToday ? `${record.operationHoursToday}h` : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">금일 주행거리</div>
                          <div className="text-xl font-bold text-green-700">
                            {record.mileageToday ? `${record.mileageToday}km` : '-'}
                          </div>
                        </div>
                      </div>

                      {/* 소모품 관리 정보 */}
                      {(record.lastOilChangeDate || record.lastHydraulicOilChangeDate || record.lastFilterChangeDate) && (
                        <div className="border rounded-lg p-4 bg-amber-50">
                          <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            소모품 관리 현황
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            {record.lastOilChangeDate && (
                              <div>
                                <div className="text-muted-foreground mb-1">엔진오일 교환</div>
                                <div className="font-medium">
                                  {format(new Date(record.lastOilChangeDate), "yyyy-MM-dd", { locale: ko })}
                                </div>
                                {record.lastOilChangeHours && (
                                  <div className="text-xs text-muted-foreground">
                                    {record.lastOilChangeHours}h 시점
                                  </div>
                                )}
                                {record.lastOilChangeMileage && (
                                  <div className="text-xs text-muted-foreground">
                                    {record.lastOilChangeMileage}km 시점
                                  </div>
                                )}
                              </div>
                            )}
                            {record.lastHydraulicOilChangeDate && (
                              <div>
                                <div className="text-muted-foreground mb-1">유압유 교환</div>
                                <div className="font-medium">
                                  {format(new Date(record.lastHydraulicOilChangeDate), "yyyy-MM-dd", { locale: ko })}
                                </div>
                              </div>
                            )}
                            {record.lastFilterChangeDate && (
                              <div>
                                <div className="text-muted-foreground mb-1">필터 교환</div>
                                <div className="font-medium">
                                  {format(new Date(record.lastFilterChangeDate), "yyyy-MM-dd", { locale: ko })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 점검 항목 */}
                      {record.items && record.items.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-bold mb-3">점검 항목 ({record.items.length})</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {record.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 text-sm p-2 hover:bg-gray-50 rounded">
                                <div className="flex-1">
                                  {item.category && (
                                    <Badge variant="outline" className="text-xs mb-1">{item.category}</Badge>
                                  )}
                                  <div className="font-medium">{item.itemText}</div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  {item.result === 'ok' && <Badge className="bg-green-500">정상</Badge>}
                                  {item.result === 'warning' && <Badge className="bg-yellow-500">주의</Badge>}
                                  {item.result === 'error' && <Badge className="bg-red-500">이상</Badge>}
                                  {item.resultText && <div className="text-xs text-muted-foreground mt-1">{item.resultText}</div>}
                                  {item.numericValue !== null && item.numericValue !== undefined && (
                                    <div className="text-xs font-medium">{item.numericValue}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 특이사항 */}
                      {record.notes && (
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <div className="font-bold text-yellow-900 mb-2">특이사항</div>
                          <div className="text-sm text-yellow-800 whitespace-pre-wrap">{record.notes}</div>
                        </div>
                      )}

                      {/* 서명 정보 */}
                      {record.driverSignature && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-green-600" />
                            운전자 서명 완료
                          </div>
                          {record.signedAt && (
                            <div className="text-xs text-muted-foreground">
                              서명일: {format(new Date(record.signedAt), "yyyy-MM-dd HH:mm", { locale: ko })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

