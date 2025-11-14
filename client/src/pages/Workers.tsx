import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { LicenseUploadWithOCR } from "@/components/LicenseUploadWithOCR";
import type { LicenseInfo } from "@/hooks/useLicenseOCR";
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
import { Plus, Pencil, Trash2, Loader2, FileText, X, Filter } from "lucide-react";
import { toast } from "sonner";
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
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function Workers() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerTypeId: "",
    name: "",
    email: "",
    password: "",
    licenseNum: "",
    licenseType: "12", // 기본값: 1종 보통
    licenseStatus: "valid",
    phone: "",
    address: "",
    residentNumber: "",
    // pinCode는 서버에서 기본값 "0000"으로 자동 설정
  });
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);
  const [licenseVerified, setLicenseVerified] = useState(false); // 면허 인증 완료 여부
  const [searchTerm, setSearchTerm] = useState("");
  const [ownerCompanyFilter, setOwnerCompanyFilter] = useState<string>("");
  const [bpCompanyFilter, setBpCompanyFilter] = useState<string>("");
  const [epCompanyFilter, setEpCompanyFilter] = useState<string>("");
  const [workerTypeFilter, setWorkerTypeFilter] = useState<string>(""); // 인력유형 필터
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

  const workerFilters = useMemo(() => {
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

    if (workerTypeFilter) {
      input.workerTypeId = workerTypeFilter;
    }

    return Object.keys(input).length > 0 ? input : undefined;
  }, [searchTerm, ownerCompanyFilter, bpCompanyFilter, epCompanyFilter, workerTypeFilter, role, user?.companyId]);

  const { data: workersList, isLoading } = trpc.workers.list.useQuery(workerFilters);
  const { data: workerTypes } = trpc.workerTypes.list.useQuery();
  const { data: workerDocs } = trpc.workerDocs.listByWorkerType.useQuery(
    { workerTypeId: formData.workerTypeId },
    { enabled: !!formData.workerTypeId }
  );

  // 선택된 인력유형의 licenseRequired 확인
  const selectedWorkerType = workerTypes?.find((type) => type.id === formData.workerTypeId);
  const isLicenseRequired = selectedWorkerType?.licenseRequired === true; // 명시적으로 true인 경우만
  
  // 디버깅: 인력유형 및 면허 인증 필수 여부 확인
  useEffect(() => {
    if (formData.workerTypeId && selectedWorkerType) {
      console.log('[Workers] Selected worker type:', selectedWorkerType.name, 'licenseRequired:', selectedWorkerType.licenseRequired);
    }
  }, [formData.workerTypeId, selectedWorkerType]);

  // 인력 유형 변경 시 필수 서류 목록 및 면허 검증 상태 초기화
  useEffect(() => {
    // 인력유형이 변경되면 면허 검증 상태 초기화
    setLicenseVerified(false);
    
    if (workerDocs && workerDocs.length > 0) {
      setDocFiles(
        workerDocs.map((doc) => ({
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
  }, [workerDocs]);

  const createWithDocsMutation = trpc.workers.createWithDocs.useMutation({
    onSuccess: () => {
      toast.success("인력과 서류가 등록되었습니다.");
      utils.workers.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("등록 실패: " + error.message);
    },
  });

  const updateMutation = trpc.workers.update.useMutation({
    onSuccess: () => {
      toast.success("인력이 수정되었습니다.");
      utils.workers.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("수정 실패: " + error.message);
    },
  });

  const deleteMutation = trpc.workers.delete.useMutation({
    onSuccess: () => {
      toast.success("인력이 삭제되었습니다.");
      utils.workers.list.invalidate();
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      workerTypeId: "",
      name: "",
      email: "",
      password: "",
      licenseNum: "",
      licenseType: "12",
      licenseStatus: "valid",
      phone: "",
      address: "",
      residentNumber: "",
      // pinCode는 서버에서 기본값 "0000"으로 자동 설정
    });
    setEditingId(null);
    setDocFiles([]);
    setLicenseVerified(false); // 인증 상태도 초기화
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      // 면허 인증 체크 (licenseRequired가 true이고 면허번호가 있는 경우에만)
      // 유도원 등 licenseRequired가 false인 경우에는 면허 인증을 요구하지 않음
      if (isLicenseRequired && formData.licenseNum && !licenseVerified) {
        toast.error("면허 인증을 완료해주세요.");
        return;
      }
      
      const missingDocs = docFiles.filter(
        (doc) => doc.isMandatory && !doc.file
      );
      
      if (missingDocs.length > 0) {
        toast.warning(
          `필수 서류를 업로드해주세요: ${missingDocs.map((d) => d.docName).join(", ")}`
        );
        return;
      }

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
          docs: docs.length > 0 ? docs : undefined,
        });
      } catch (error) {
        toast.error("파일 처리 중 오류가 발생했습니다.");
        console.error(error);
      }
    }
  };

  const handleEdit = (worker: any) => {
    setEditingId(worker.id);
    setFormData({
      workerTypeId: worker.workerTypeId,
      name: worker.name,
      email: worker.email || "",
      password: "", // 편집 시 비밀번호는 비움 (변경하려면 입력)
      licenseNum: worker.licenseNum || "",
      licenseStatus: worker.licenseStatus || "valid",
      phone: worker.phone || "",
      address: worker.address || "",
      residentNumber: worker.residentNumber || "",
      // pinCode는 편집하지 않음 (내정보에서만 수정 가능)
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

  const getWorkerTypeName = (workerTypeId: string) => {
    return workerTypes?.find((t) => t.id === workerTypeId)?.name || "-";
  };

  const getLicenseStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      valid: "유효",
      expired: "만료",
      suspended: "정지",
    };
    return labels[status] || status;
  };

  const getLicenseStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      valid: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      suspended: "bg-yellow-100 text-yellow-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">인력 관리</h1>
          <p className="text-muted-foreground">등록된 인력을 관리합니다.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          인력 등록
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">필터</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            회사별 필터와 검색어를 사용해 인력을 빠르게 찾을 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 필터 UI - 한 줄 통일 디자인 */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">검색</Label>
              <Input
                id="worker-search"
                placeholder="이름, 면허번호, 이메일"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            {(role === "admin" || role === "bp" || role === "ep") && (
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">Owner 회사</Label>
                <Select
                  value={ownerCompanyFilter || "all"}
                  onValueChange={(value) => setOwnerCompanyFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-9">
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
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">BP 회사</Label>
                <Select
                  value={bpCompanyFilter || "all"}
                  onValueChange={(value) => setBpCompanyFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-9">
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
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm font-medium mb-1.5 block">EP 회사</Label>
                <Select
                  value={epCompanyFilter || "all"}
                  onValueChange={(value) => setEpCompanyFilter(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="h-9">
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

            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">인력 유형</Label>
              <Select
                value={workerTypeFilter || "all"}
                onValueChange={(value) => setWorkerTypeFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {workerTypes?.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>인력 목록</CardTitle>
          <CardDescription>
            총 {workersList?.length || 0}명의 인력이 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : workersList && workersList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>인력 유형</TableHead>
                  <TableHead>면허번호</TableHead>
                  <TableHead>면허 상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workersList.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{worker.email || "-"}</span>
                    </TableCell>
                    <TableCell>{getWorkerTypeName(worker.workerTypeId)}</TableCell>
                    <TableCell>{worker.licenseNum || "-"}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs ${getLicenseStatusColor(worker.licenseStatus || "valid")}`}>
                        {getLicenseStatusLabel(worker.licenseStatus || "valid")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {worker.createdAt
                        ? new Date(worker.createdAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(worker)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(worker.id)}
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
              등록된 인력이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인력 수정" : "인력 등록"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "인력 정보를 수정하세요."
                : "인력 정보와 필수 서류를 입력하세요."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">기본 정보</h3>
                <div className="space-y-2">
                  <Label htmlFor="workerTypeId">인력 유형 *</Label>
                  <Select
                    value={formData.workerTypeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, workerTypeId: value })
                    }
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="인력 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {workerTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="예: 홍길동"
                    required
                  />
                </div>
                {/* 면허증 OCR 및 인증 컴포넌트 (licenseRequired가 true인 경우에만 표시) */}
                {!editingId && isLicenseRequired && (
                  <LicenseUploadWithOCR
                    onOCRComplete={(info: LicenseInfo) => {
                      // OCR 결과로 폼 자동 채우기
                      // ⚠️ 이름은 이미 입력된 값이 있으면 유지 (OCR 정확도 낮음)
                      setFormData({
                        ...formData,
                        // 이름: 기존 값이 있으면 유지, 없으면 OCR 결과 사용
                        name: formData.name.trim() || info.name,
                        // 면허번호: OCR 결과 우선
                        licenseNum: info.licenseNum || formData.licenseNum,
                        // 면허종별: OCR 결과 우선
                        licenseType: info.licenseType || formData.licenseType,
                        // 주소: OCR 결과가 있으면 추가
                        address: info.address || formData.address,
                        // 주민등록번호: OCR 결과가 있으면 추가 (뒷자리 마스킹)
                        residentNumber: info.residentNumber || formData.residentNumber,
                      });
                    }}
                    formData={{
                      name: formData.name,
                      licenseNum: formData.licenseNum,
                      licenseType: formData.licenseType,
                    }}
                    onFormChange={(field, value) => {
                      setFormData({ ...formData, [field]: value });
                      if (field === 'licenseNum' || field === 'name') {
                        setLicenseVerified(false); // 정보 수정 시 재인증 필요
                      }
                    }}
                    onVerificationSuccess={() => {
                      console.log('[Workers] License verification successful');
                      setLicenseVerified(true);
                    }}
                    isMobile={false} // Admin/Owner는 데스크톱
                  />
                )}
                
                {/* licenseRequired가 false인 경우 면허번호 입력 필드 (선택사항) */}
                {!editingId && !isLicenseRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="licenseNum">면허번호 (선택사항)</Label>
                    <Input
                      id="licenseNum"
                      value={formData.licenseNum}
                      onChange={(e) =>
                        setFormData({ ...formData, licenseNum: e.target.value })
                      }
                      placeholder="예: 12-34-567890"
                    />
                    <p className="text-xs text-muted-foreground">
                      해당 인력유형은 면허 인증이 필수가 아닙니다.
                    </p>
                  </div>
                )}
                
                {/* 수정 모드: 면허번호만 표시 */}
                {editingId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNum">면허번호</Label>
                      <Input
                        id="licenseNum"
                        value={formData.licenseNum}
                        onChange={(e) =>
                          setFormData({ ...formData, licenseNum: e.target.value })
                        }
                        placeholder="예: 12-34-567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseStatus">면허 상태</Label>
                      <Select
                        value={formData.licenseStatus}
                        onValueChange={(value) =>
                          setFormData({ ...formData, licenseStatus: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="valid">유효</SelectItem>
                          <SelectItem value="expired">만료</SelectItem>
                          <SelectItem value="suspended">정지</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* 이메일 (필수 - 로그인 ID) */}
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 (로그인 ID) *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="예: worker@company.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Worker가 모바일 로그인 시 사용할 이메일입니다
                  </p>
                </div>

                {/* 초기 비밀번호 (필수) */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingId ? "새 비밀번호 (변경 시만 입력)" : "초기 비밀번호 *"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={editingId ? "변경하지 않으려면 비워두세요" : "최소 6자 이상"}
                    required={!editingId}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingId 
                      ? "비밀번호를 변경하려면 새 비밀번호를 입력하세요" 
                      : "Worker가 로그인 후 비밀번호를 변경할 수 있습니다"}
                  </p>
                </div>

                {/* 핸드폰 번호 (필수) */}
                <div className="space-y-2">
                  <Label htmlFor="phone">핸드폰 번호 *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="예: 010-1234-5678"
                    required
                  />
                </div>

                {/* PIN 코드 안내 */}
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-600 mt-0.5">ℹ️</div>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">PIN 번호 안내</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>• PIN 번호는 기본값 <code className="bg-blue-100 px-1 py-0.5 rounded">0000</code>으로 자동 설정됩니다</li>
                        <li>• Worker는 로그인 후 "내정보" 페이지에서 PIN을 직접 변경할 수 있습니다</li>
                        <li>• 모바일 로그인은 이메일 + 비밀번호를 사용합니다</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 주소 (선택) */}
                <div className="space-y-2">
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="예: 서울시 강남구..."
                  />
                </div>

                {/* 주민번호 (선택) */}
                <div className="space-y-2">
                  <Label htmlFor="residentNumber">주민번호</Label>
                  <Input
                    id="residentNumber"
                    value={formData.residentNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, residentNumber: e.target.value })
                    }
                    placeholder="예: 900101-1******"
                    type="password"
                  />
                  <p className="text-xs text-muted-foreground">
                    보안을 위해 암호화되어 저장됩니다.
                  </p>
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
                disabled={
                  createWithDocsMutation.isPending || 
                  updateMutation.isPending ||
                  (!editingId && formData.licenseNum && !licenseVerified)
                }
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
              {!editingId && formData.licenseNum && !licenseVerified && (
                <p className="text-xs text-center text-red-600 mt-2">
                  ⚠️ 면허 인증을 완료해야 등록할 수 있습니다
                </p>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

