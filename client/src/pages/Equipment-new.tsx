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
import { Plus, Pencil, Trash2, Loader2, Upload, FileText } from "lucide-react";
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

export default function Equipment() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    equipTypeId: "",
    regNum: "",
    status: "idle",
  });
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);

  const utils = trpc.useUtils();
  const { data: equipmentList, isLoading } = trpc.equipment.list.useQuery();
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

  const createMutation = trpc.equipment.create.useMutation({
    onSuccess: async (result) => {
      // 서류 업로드 처리
      const equipmentId = result.id;
      
      for (const docFile of docFiles) {
        if (docFile.file) {
          // TODO: 파일 업로드 및 서류 등록
          // 현재는 파일 업로드 API가 없으므로 나중에 구현
          console.log("파일 업로드 예정:", docFile);
        }
      }
      
      toast.success("장비가 등록되었습니다.");
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
    setFormData({ equipTypeId: "", regNum: "", status: "idle" });
    setEditingId(null);
    setDocFiles([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 서류 체크
    const missingDocs = docFiles.filter(
      (doc) => doc.isMandatory && !doc.file
    );
    
    if (missingDocs.length > 0 && !editingId) {
      toast.warning(
        `필수 서류를 업로드해주세요: ${missingDocs.map((d) => d.docName).join(", ")}`
      );
      return;
    }
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (equipment: any) => {
    setEditingId(equipment.id);
    setFormData({
      equipTypeId: equipment.equipTypeId,
      regNum: equipment.regNum,
      status: equipment.status,
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
                  <TableHead>장비 종류</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipmentList.map((equipment) => (
                  <TableRow key={equipment.id}>
                    <TableCell className="font-medium">{equipment.regNum}</TableCell>
                    <TableCell>{getEquipTypeName(equipment.equipTypeId)}</TableCell>
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
              장비 정보와 필수 서류를 입력하세요.
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
                              선택된 파일: {doc.file.name}
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
                                required={doc.hasExpiry}
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
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

