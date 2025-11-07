import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Download, Eye, Search, Loader2, Truck, HardHat, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/DocumentUpload";
import { EnhancedPdfViewer } from "@/components/EnhancedPdfViewer";

export default function Documents() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [viewingDocuments, setViewingDocuments] = useState<any[]>([]);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    targetType: "equipment" as "equipment" | "worker",
    targetId: "",
    docTypeId: "",
    docType: "",
    fileName: "",
    fileUrl: "",
    fileSize: 0,
    mimeType: "",
    issueDate: "",
    expiryDate: "",
  });
  const [editFormData, setEditFormData] = useState({
    issueDate: "",
    expiryDate: "",
  });

  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.docsCompliance.list.useQuery();
  const { data: equipment } = trpc.equipment.list.useQuery();
  const { data: workers } = trpc.workers.list.useQuery();

  const createMutation = trpc.docsCompliance.create.useMutation({
    onSuccess: () => {
      toast.success("서류가 등록되었습니다.");
      utils.docsCompliance.list.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("등록 실패: " + error.message);
    },
  });

  const updateMutation = trpc.docsCompliance.update.useMutation({
    onSuccess: () => {
      toast.success("서류가 수정되었습니다.");
      utils.docsCompliance.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingDoc(null);
      setNewFile(null);
    },
    onError: (error) => {
      toast.error("수정 실패: " + error.message);
    },
  });

  const deleteMutation = trpc.docsCompliance.delete.useMutation({
    onSuccess: () => {
      toast.success("서류가 삭제되었습니다.");
      utils.docsCompliance.list.invalidate();
    },
    onError: (error) => {
      toast.error("삭제 실패: " + error.message);
    },
  });

  const handleEdit = (doc: any) => {
    setEditingDoc(doc);
    setEditFormData({
      issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString().split('T')[0] : "",
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : "",
    });
    setNewFile(null);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = async () => {
    if (!editingDoc) return;

    try {
      let updateData: any = {
        id: editingDoc.id,
        issueDate: editFormData.issueDate || undefined,
        expiryDate: editFormData.expiryDate || undefined,
      };

      // 새 파일이 있으면 업로드
      if (newFile) {
        toast.info("파일 업로드 중...");
        
        const reader = new FileReader();
        reader.readAsDataURL(newFile);
        reader.onload = async () => {
          const base64 = reader.result as string;
          
          // Supabase Storage에 업로드 (여기서는 간단히 base64로 저장)
          // 실제로는 Supabase Storage API를 사용해야 함
          updateData.fileName = newFile.name;
          updateData.fileSize = newFile.size;
          updateData.mimeType = newFile.type;
          updateData.fileUrl = base64; // 임시: 실제로는 storage URL
          
          await updateMutation.mutateAsync(updateData);
        };
      } else {
        await updateMutation.mutateAsync(updateData);
      }
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDelete = (docId: string, docName: string) => {
    if (confirm(`"${docName}" 서류를 삭제하시겠습니까?`)) {
      deleteMutation.mutate({ id: docId });
    }
  };

  const resetForm = () => {
    setFormData({
      targetType: "equipment",
      targetId: "",
      docTypeId: "",
      docType: "",
      fileName: "",
      fileUrl: "",
      fileSize: 0,
      mimeType: "",
      issueDate: "",
      expiryDate: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      toast.error("파일을 업로드하세요.");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleFileUpload = (fileUrl: string, fileName: string, fileSize: number, mimeType: string) => {
    setFormData({
      ...formData,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
    });
  };

  const handleViewPdf = (url: string, allDocs?: any[], index?: number) => {
    if (allDocs && allDocs.length > 0) {
      // 여러 서류를 한번에 보기
      setViewingDocuments(
        allDocs.map((doc) => ({
          id: doc.id,
          name: doc.docType || doc.fileName || "문서",
          url: doc.fileUrl,
        }))
      );
      setViewingIndex(index || 0);
      setPdfViewerOpen(true);
    } else {
      // 단일 서류 보기
      setViewingDocuments([
        {
          id: "single",
          name: "문서",
          url: url,
        },
      ]);
      setViewingIndex(0);
      setPdfViewerOpen(true);
    }
  };

  const getStatusBadge = (expiryDate: Date | null) => {
    if (!expiryDate) return <Badge variant="secondary">만료일 없음</Badge>;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">만료됨</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="destructive" className="bg-orange-100 text-orange-700">{daysUntilExpiry}일 남음</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-700">유효</Badge>;
    }
  };

  // 장비별로 서류 그룹화
  const equipmentGroups = equipment?.map((eq) => ({
    ...eq,
    docs: documents?.filter((doc) => doc.targetType === "equipment" && doc.targetId === eq.id) || [],
  })) || [];
  
  // 디버깅 로그
  console.log('[Documents] Total documents:', documents?.length);
  console.log('[Documents] Total equipment:', equipment?.length);
  console.log('[Documents] Equipment groups:', equipmentGroups.map(eq => ({ id: eq.id, regNum: eq.regNum, docsCount: eq.docs.length })));

  // 인력별로 서류 그룹화
  const workerGroups = workers?.map((w) => ({
    ...w,
    docs: documents?.filter((doc) => doc.targetType === "worker" && doc.targetId === w.id) || [],
  })) || [];

  // 검색 필터링
  const filteredEquipment = equipmentGroups.filter((eq) =>
    eq.regNum.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorkers = workerGroups.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canUpload = user?.role === "bp" || user?.role === "owner" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">서류 관리</h1>
          <p className="text-muted-foreground">장비 및 인력 관련 서류를 관리합니다.</p>
        </div>
        {canUpload && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            서류 등록
          </Button>
        )}
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="장비 번호 또는 인력 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipment">
            <Truck className="mr-2 h-4 w-4" />
            장비별 서류 ({filteredEquipment.length})
          </TabsTrigger>
          <TabsTrigger value="worker">
            <HardHat className="mr-2 h-4 w-4" />
            인력별 서류 ({filteredWorkers.length})
          </TabsTrigger>
        </TabsList>

        {/* 장비별 서류 */}
        <TabsContent value="equipment" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : filteredEquipment.length > 0 ? (
            filteredEquipment.map((eq) => (
              <Card key={eq.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {eq.regNum}
                      </CardTitle>
                      <CardDescription>
                        등록된 서류: {eq.docs.length}개
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {eq.docs.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPdf("", eq.docs, 0)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          모두 보기 ({eq.docs.length})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, targetType: "equipment", targetId: eq.id });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        서류 추가
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {eq.docs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>서류 유형</TableHead>
                          <TableHead>파일명</TableHead>
                          <TableHead>발급일</TableHead>
                          <TableHead>만료일</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>진위 검증</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eq.docs.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.docType}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.fileName || "-"}</TableCell>
                            <TableCell>
                              {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("ko-KR") : "-"}
                            </TableCell>
                            <TableCell>
                              {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("ko-KR") : "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(doc.expiryDate)}</TableCell>
                            <TableCell>
                              {doc.verified !== undefined && doc.verified !== null ? (
                                doc.verified ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    검증완료
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    검증실패
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPdf(doc.fileUrl, eq.docs, eq.docs.findIndex((d: any) => d.id === doc.id))}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.fileUrl} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                {canUpload && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(doc)}
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(doc.id, doc.docType)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">등록된 서류가 없습니다.</div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 장비가 없습니다."}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 인력별 서류 */}
        <TabsContent value="worker" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          ) : filteredWorkers.length > 0 ? (
            filteredWorkers.map((w) => (
              <Card key={w.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <HardHat className="h-5 w-5" />
                        {w.name}
                      </CardTitle>
                      <CardDescription>
                        등록된 서류: {w.docs.length}개
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {w.docs.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPdf("", w.docs, 0)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          모두 보기 ({w.docs.length})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, targetType: "worker", targetId: w.id });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        서류 추가
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {w.docs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>서류 유형</TableHead>
                          <TableHead>파일명</TableHead>
                          <TableHead>발급일</TableHead>
                          <TableHead>만료일</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>진위 검증</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {w.docs.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.docType}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{doc.fileName || "-"}</TableCell>
                            <TableCell>
                              {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString("ko-KR") : "-"}
                            </TableCell>
                            <TableCell>
                              {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("ko-KR") : "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(doc.expiryDate)}</TableCell>
                            <TableCell>
                              {doc.verified !== undefined && doc.verified !== null ? (
                                doc.verified ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    검증완료
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    검증실패
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPdf(doc.fileUrl, w.docs, w.docs.findIndex((d: any) => d.id === doc.id))}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={doc.fileUrl} download target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                {canUpload && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(doc)}
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(doc.id, doc.docType)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">등록된 서류가 없습니다.</div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  {searchQuery ? "검색 결과가 없습니다." : "등록된 인력이 없습니다."}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 서류 등록 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>서류 등록</DialogTitle>
            <DialogDescription>장비 또는 인력 관련 서류를 업로드합니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>대상 유형 *</Label>
                  <Select
                    value={formData.targetType}
                    onValueChange={(value: "equipment" | "worker") =>
                      setFormData({ ...formData, targetType: value, targetId: "" })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">장비</SelectItem>
                      <SelectItem value="worker">인력</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>대상 선택 *</Label>
                  <Select
                    value={formData.targetId}
                    onValueChange={(value) => setFormData({ ...formData, targetId: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="선택하세요" /></SelectTrigger>
                    <SelectContent>
                      {formData.targetType === "equipment"
                        ? equipment?.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>
                              {eq.regNum}
                            </SelectItem>
                          ))
                        : workers?.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>서류 유형 *</Label>
                <Input
                  value={formData.docType}
                  onChange={(e) => setFormData({ ...formData, docType: e.target.value, docTypeId: e.target.value })}
                  placeholder="예: 건설기계등록증, 면허증, 보험증"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>발급일</Label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>만료일</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <DocumentUpload onUploadComplete={handleFileUpload} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "등록"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 서류 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>서류 수정</DialogTitle>
            <DialogDescription>
              서류의 발급일, 만료일을 수정하거나 파일을 교체할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>서류 유형</Label>
              <Input value={editingDoc?.docType || ""} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>발급일</Label>
                <Input
                  type="date"
                  value={editFormData.issueDate}
                  onChange={(e) => setEditFormData({ ...editFormData, issueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>만료일</Label>
                <Input
                  type="date"
                  value={editFormData.expiryDate}
                  onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>파일 재업로드 (선택사항)</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              />
              {!newFile && editingDoc?.fileName && (
                <p className="text-xs text-muted-foreground">
                  현재 파일: {editingDoc.fileName}
                </p>
              )}
              {newFile && (
                <p className="text-xs text-green-600">
                  새 파일: {newFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 향상된 PDF 뷰어 */}
      <EnhancedPdfViewer
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        documents={viewingDocuments}
        initialIndex={viewingIndex}
        title="서류 미리보기"
      />
    </div>
  );
}
