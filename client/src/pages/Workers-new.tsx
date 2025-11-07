import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

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

export default function Worker() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    workerTypeId: "",
    name: "",
    status: "idle",
  });
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);

  const utils = trpc.useUtils();
  const { data: workerList, isLoading } = trpc.worker.list.useQuery();
  const { data: workerTypes } = trpc.workerTypes.list.useQuery();
  const { data: typeDocs } = trpc.typeDocs.listByWorkerType.useQuery(
    { workerTypeId: formData.workerTypeId },
    { enabled: !!formData.workerTypeId }
  );

  // 인력 종류 변경 시 필수 서류 목록 초기화
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

  const createWithDocsMutation = trpc.worker.createWithDocs.useMutation({
    onSuccess: () => {
      toast.success("인력와 서류가 등록되었습니다.");
      utils.worker.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("등록 실패: " + error.message);
    },
  });

  const updateMutation = trpc.worker.update.useMutation({
    onSuccess: () => {
      toast.success("인력가 수정되었습니다.");
      utils.worker.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("수정 실패: " + error.message);
    },
  });

  const deleteMutation = trpc.worker.delete.useMutation({
    onSuccess: () => {
      toast.success("인력가 삭제되었습니다.");
      utils.worker.list.invalidate();
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ workerTypeId: "", name: "", status: "idle" });
    setEditingId(null);
    setDocFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // 수정 모드
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      // 등록 모드
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
      status: worker.status,
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
          <h1 className="text-3xl font-bold">인력 관리</h1>
          <p className="text-muted-foreground">등록된 인력를 관리합니다.</p>
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
        <CardHeader>
          <CardTitle>인력 목록</CardTitle>
          <CardDescription>
            총 {workerList?.length || 0}개의 인력가 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : workerList && workerList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>인력 종류</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerList.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>{getWorkerTypeName(worker.workerTypeId)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(worker.status)}`}>
                        {getStatusLabel(worker.status)}
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
              등록된 인력가 없습니다.
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
                  <Label htmlFor="workerTypeId">인력 종류 *</Label>
                  <Select
                    value={formData.workerTypeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, workerTypeId: value })
                    }
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="인력 종류 선택" />
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
                    placeholder="예: 12가3456"
                    required
                  />
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
    </div>
  );
}

