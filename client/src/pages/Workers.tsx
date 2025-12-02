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
import { Plus, Pencil, Trash2, Loader2, FileText, X, Filter, ShieldCheck, CheckSquare, Bell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { DocumentScanner } from "@/components/DocumentScanner";

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
  const [, setLocation] = useLocation();
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
  const [licenseImageFile, setLicenseImageFile] = useState<File | null>(null); // 마스킹된 면허증 이미지
  const [searchTerm, setSearchTerm] = useState("");
  const [ownerCompanyFilter, setOwnerCompanyFilter] = useState<string>("");
  const [bpCompanyFilter, setBpCompanyFilter] = useState<string>("");
  const [epCompanyFilter, setEpCompanyFilter] = useState<string>("");
  const [workerTypeFilter, setWorkerTypeFilter] = useState<string>(""); // 인력유형 필터
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>(""); // 면허상태 필터 (부적격자만 보기 등)
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set()); // 선택된 인력
  const [isVerifying, setIsVerifying] = useState(false); // 검증 중 상태

  // 첨부 서류 스캐너 상태
  const [docScannerOpen, setDocScannerOpen] = useState(false);
  const [docImageToScan, setDocImageToScan] = useState<string | null>(null);
  const [pendingDocTypeId, setPendingDocTypeId] = useState<string | null>(null);

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
      console.log('[Workers] workerDocs from API:', workerDocs);
    }
  }, [formData.workerTypeId, selectedWorkerType, workerDocs]);

  // 운전면허증 서류 ID (면허인증 필수일 때 자동 연결용)
  const licenseDocId = workerDocs?.find(
    (doc) => doc.docName === '운전면허증' || doc.docName.includes('면허증')
  )?.id;

  // 인력 유형 변경 시 필수 서류 목록 및 면허 검증 상태 초기화
  useEffect(() => {
    // 인력유형이 변경되면 면허 검증 상태 초기화
    setLicenseVerified(false);

    console.log('[Workers] useEffect - workerDocs:', workerDocs, 'isLicenseRequired:', isLicenseRequired);

    if (workerDocs && workerDocs.length > 0) {
      // 면허인증 필수인 경우, "운전면허증" 서류는 목록에서 제외 (OCR에서 자동 연결됨)
      const filteredDocs = isLicenseRequired
        ? workerDocs.filter(
            (doc) => doc.docName !== '운전면허증' && !doc.docName.includes('면허증')
          )
        : workerDocs;

      console.log('[Workers] filteredDocs:', filteredDocs);

      setDocFiles(
        filteredDocs.map((doc) => ({
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
  }, [workerDocs, isLicenseRequired]);

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

  const verifyBatchMutation = trpc.workers.verifyLicenseBatch.useMutation({
    onSuccess: (result) => {
      utils.workers.list.invalidate();
      setSelectedWorkerIds(new Set());

      // 결과 메시지 표시
      if (result.invalidCount > 0) {
        toast.warning(
          `${result.message}\n부적격 인력: ${result.results.filter(r => !r.isValid).map(r => r.workerName).join(", ")}`,
          { duration: 10000 }
        );
      } else {
        toast.success(result.message);
      }
    },
    onError: (error) => {
      toast.error("검증 실패: " + error.message);
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
    setLicenseImageFile(null); // 면허증 이미지도 초기화
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      // 필수 필드 검증
      if (!formData.password || formData.password.length < 6) {
        toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
      }

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
        // 일반 필수 서류 처리
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

        // 면허인증 필수이고 마스킹된 면허증 이미지가 있으면 자동 추가
        if (isLicenseRequired && licenseImageFile && licenseDocId) {
          const licenseDoc = {
            docTypeId: licenseDocId,
            docName: '운전면허증',
            fileData: await fileToBase64(licenseImageFile),
            fileName: licenseImageFile.name,
            mimeType: licenseImageFile.type,
            issueDate: undefined,
            expiryDate: undefined, // 면허 유효성은 RIMS에서 확인하므로 만료일 불필요
          };
          docs.push(licenseDoc);
          console.log('[Workers] 마스킹된 면허증 이미지가 서류로 자동 추가됨');
        }

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

  // 첨부 서류 이미지 선택 시 스캐너 열기
  const handleDocImageSelect = (docTypeId: string, file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocImageToScan(reader.result as string);
        setPendingDocTypeId(docTypeId);
        // Dialog를 닫고 스캐너 열기 (Dialog focus trap 회피)
        setIsDialogOpen(false);
        setTimeout(() => {
          setDocScannerOpen(true);
        }, 100);
      };
      reader.readAsDataURL(file);
    } else {
      // 이미지가 아닌 파일은 바로 추가
      handleFileChange(docTypeId, file);
    }
  };

  // 스캔 완료 후 파일 저장
  const handleDocScanComplete = async (resultDataUrl: string) => {
    try {
      if (pendingDocTypeId && resultDataUrl) {
        // base64 데이터 URL을 File로 변환
        const response = await fetch(resultDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `scanned_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileChange(pendingDocTypeId, file);
        toast.success('문서가 저장되었습니다.');
      }
    } catch (error) {
      console.error('[Workers] 스캔 완료 처리 오류:', error);
      toast.error('문서 저장에 실패했습니다.');
    } finally {
      setDocScannerOpen(false);
      setDocImageToScan(null);
      setPendingDocTypeId(null);
      // 스캔 완료 후 Dialog 다시 열기
      setTimeout(() => {
        setIsDialogOpen(true);
      }, 100);
    }
  };

  // 스캔 취소
  const handleDocScanCancel = () => {
    setDocScannerOpen(false);
    setDocImageToScan(null);
    setPendingDocTypeId(null);
    // 취소 시에도 Dialog 다시 열기
    setTimeout(() => {
      setIsDialogOpen(true);
    }, 100);
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

  const getLicenseStatusLabel = (status: string | null | undefined) => {
    const labels: Record<string, string> = {
      valid: "유효",
      expired: "만료",
      suspended: "정지",
      revoked: "취소",
      unverified: "미검증",
    };
    return labels[status || "unverified"] || status || "미검증";
  };

  const getLicenseStatusColor = (status: string | null | undefined) => {
    const colors: Record<string, string> = {
      valid: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      suspended: "bg-orange-100 text-orange-700",
      revoked: "bg-red-100 text-red-700",
      unverified: "bg-gray-100 text-gray-500",
    };
    return colors[status || "unverified"] || "bg-gray-100 text-gray-500";
  };

  // 부적격 상태인지 확인
  const isInvalidLicense = (status: string | null | undefined) => {
    return status === "suspended" || status === "revoked" || status === "expired";
  };

  // 필터링된 인력 목록
  const filteredWorkersList = useMemo(() => {
    if (!workersList) return [];

    let filtered = [...workersList];

    // 면허 상태 필터
    if (licenseStatusFilter) {
      if (licenseStatusFilter === "invalid") {
        // 부적격자만 (suspended, revoked, expired)
        filtered = filtered.filter(w => isInvalidLicense(w.licenseStatus));
      } else if (licenseStatusFilter === "unverified") {
        // 미검증만
        filtered = filtered.filter(w => !w.licenseStatus || w.licenseStatus === "unverified");
      } else if (licenseStatusFilter === "valid") {
        // 유효만
        filtered = filtered.filter(w => w.licenseStatus === "valid");
      }
    }

    return filtered;
  }, [workersList, licenseStatusFilter]);

  // 체크박스 핸들러
  const handleSelectWorker = (workerId: string, checked: boolean) => {
    setSelectedWorkerIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(workerId);
      } else {
        newSet.delete(workerId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredWorkersList) {
      setSelectedWorkerIds(new Set(filteredWorkersList.map((w) => w.id)));
    } else {
      setSelectedWorkerIds(new Set());
    }
  };

  // 면허 있는 인력만 선택
  const handleSelectWithLicense = () => {
    if (workersList) {
      const withLicense = workersList.filter(
        (w) => w.licenseNum && w.licenseNum.length === 12
      );
      setSelectedWorkerIds(new Set(withLicense.map((w) => w.id)));
      toast.info(`면허번호가 있는 ${withLicense.length}명이 선택되었습니다.`);
    }
  };

  // 배치 검증 실행
  const handleVerifyBatch = () => {
    if (selectedWorkerIds.size === 0) {
      toast.warning("검증할 인력을 선택해주세요.");
      return;
    }

    const confirmMsg = `선택된 ${selectedWorkerIds.size}명의 면허를 검증하시겠습니까?\n(면허번호가 없는 인력은 제외됩니다)`;
    if (confirm(confirmMsg)) {
      verifyBatchMutation.mutate({
        workerIds: Array.from(selectedWorkerIds),
      });
    }
  };

  // 전체 선택 여부
  const isAllSelected = filteredWorkersList && filteredWorkersList.length > 0 && selectedWorkerIds.size === filteredWorkersList.length;

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
          {/* 필터 UI - 모바일에서는 세로 배치 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="col-span-2 sm:col-span-1">
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
              <div>
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
              <div>
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
              <div>
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

            <div>
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

            <div>
              <Label className="text-sm font-medium mb-1.5 block">면허 상태</Label>
              <Select
                value={licenseStatusFilter || "all"}
                onValueChange={(value) => setLicenseStatusFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="valid">✅ 유효</SelectItem>
                  <SelectItem value="invalid">❌ 부적격</SelectItem>
                  <SelectItem value="unverified">⚪ 미검증</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-3">
            <div>
              <CardTitle className="text-base sm:text-lg">인력 목록</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                총 {workersList?.length || 0}명 중 {filteredWorkersList?.length || 0}명
                {selectedWorkerIds.size > 0 && (
                  <span className="ml-1 text-blue-600 font-medium">
                    ({selectedWorkerIds.size}명 선택)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectWithLicense}
                disabled={!workersList || workersList.length === 0}
                className="text-xs h-8"
              >
                <CheckSquare className="mr-1 h-3 w-3" />
                면허보유자
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleVerifyBatch}
                disabled={selectedWorkerIds.size === 0 || verifyBatchMutation.isPending}
                className="text-xs h-8"
              >
                {verifyBatchMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    검증
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  if (selectedWorkerIds.size === 0) {
                    setLocation("/notifications/send");
                  } else {
                    const selectedWorkers = filteredWorkersList
                      ?.filter((w) => selectedWorkerIds.has(w.id))
                      .map((w) => ({ userId: w.userId, name: w.name, workerId: w.id }))
                      .filter((w) => w.userId) || [];

                    if (selectedWorkers.length === 0) {
                      toast.error("선택된 인력 중 알림을 받을 수 있는 사용자가 없습니다.");
                      return;
                    }

                    const params = new URLSearchParams();
                    params.set("userIds", selectedWorkers.map(w => w.userId).join(","));
                    params.set("names", selectedWorkers.map(w => w.name).join(","));
                    setLocation(`/notifications/send?${params.toString()}`);
                  }
                }}
              >
                <Bell className="mr-1 h-3 w-3" />
                알림
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : filteredWorkersList && filteredWorkersList.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>인력 유형</TableHead>
                  <TableHead>면허번호</TableHead>
                  <TableHead>면허 상태</TableHead>
                  <TableHead>검증일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkersList.map((worker) => (
                  <TableRow
                    key={worker.id}
                    className={`
                      ${selectedWorkerIds.has(worker.id) ? "bg-blue-50" : ""}
                      ${isInvalidLicense(worker.licenseStatus) ? "bg-red-50 hover:bg-red-100" : ""}
                    `}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedWorkerIds.has(worker.id)}
                        onCheckedChange={(checked) =>
                          handleSelectWorker(worker.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className={`font-medium ${isInvalidLicense(worker.licenseStatus) ? "text-red-700" : ""}`}>
                      {worker.name}
                      {isInvalidLicense(worker.licenseStatus) && (
                        <span className="ml-1 text-red-500">⚠️</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{worker.email || "-"}</span>
                    </TableCell>
                    <TableCell>{getWorkerTypeName(worker.workerTypeId)}</TableCell>
                    <TableCell>
                      {worker.licenseNum ? (
                        <span className="font-mono text-sm">{worker.licenseNum}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          worker.licenseStatus === "valid" ? "default" :
                          worker.licenseStatus === "suspended" || worker.licenseStatus === "revoked" || worker.licenseStatus === "expired" ? "destructive" :
                          "secondary"
                        }
                        className={
                          worker.licenseStatus === "valid" ? "bg-green-500 hover:bg-green-600" :
                          worker.licenseStatus === "suspended" ? "bg-orange-500 hover:bg-orange-600" :
                          worker.licenseStatus === "revoked" || worker.licenseStatus === "expired" ? "bg-red-500 hover:bg-red-600" :
                          "bg-gray-400 hover:bg-gray-500"
                        }
                      >
                        {getLicenseStatusLabel(worker.licenseStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {worker.licenseVerifiedAt ? (
                        <span className="text-sm">
                          {new Date(worker.licenseVerifiedAt).toLocaleDateString("ko-KR")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              등록된 인력이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-lg sm:max-w-2xl max-h-[85vh] overflow-y-auto p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle>{editingId ? "인력 수정" : "인력 등록"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "인력 정보를 수정하세요."
                : "인력 정보와 필수 서류를 입력하세요."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              {/* 기본 정보 */}
              <div className="space-y-3">
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
                    onImageUploaded={(maskedFile: File) => {
                      // 마스킹된 면허증 이미지를 별도 상태로 저장 (submit 시 자동 추가됨)
                      setLicenseImageFile(maskedFile);
                      console.log('[Workers] 마스킹된 면허증 이미지가 저장되었습니다.');
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
                          <Label>
                            파일 업로드 {doc.isMandatory && "*"}
                          </Label>
                          {/* 버튼 스타일 파일 선택 */}
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => {
                                const input = document.getElementById(`file-${doc.docTypeId}`) as HTMLInputElement;
                                input?.click();
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              파일 선택
                            </Button>
                            <input
                              id={`file-${doc.docTypeId}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDocImageSelect(doc.docTypeId, file);
                                }
                                e.target.value = '';
                              }}
                            />
                            {doc.file ? (
                              <span className="text-sm text-green-600 truncate flex-1">
                                ✓ {doc.file.name}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                선택된 파일 없음
                              </span>
                            )}
                          </div>
                        </div>

                        {doc.hasExpiry && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
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

      {/* 첨부 서류 스캐너 모달 */}
      {docScannerOpen && docImageToScan && (
        <DocumentScanner
          imageSrc={docImageToScan}
          onComplete={handleDocScanComplete}
          onCancel={handleDocScanCancel}
        />
      )}
    </div>
  );
}

