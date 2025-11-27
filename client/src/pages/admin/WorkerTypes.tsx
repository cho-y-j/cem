import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, X, FileText } from "lucide-react";
import { toast } from "sonner";

type RequiredDoc = {
  docName: string;
  isMandatory: boolean;
  hasExpiry: boolean;
};

export default function AdminWorkerTypes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "",
    licenseRequired: false, // 면허 인증 필수 여부
  });
  const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>([]);
  const [newDocName, setNewDocName] = useState("");

  const utils = trpc.useUtils();
  const { data: workerTypes } = trpc.workerTypes.list.useQuery();
  const { data: allWorkerDocs } = trpc.workerDocs.list.useQuery();

  const createMutation = trpc.workerTypes.create.useMutation({
    onSuccess: () => { 
      toast.success("인력 유형이 등록되었습니다."); 
      utils.workerTypes.list.invalidate(); 
      utils.workerDocs.list.invalidate();
      setIsDialogOpen(false); 
      resetForm(); 
    },
  });

  const updateMutation = trpc.workerTypes.update.useMutation({
    onSuccess: () => { 
      toast.success("인력 유형이 수정되었습니다."); 
      utils.workerTypes.list.invalidate(); 
      utils.workerDocs.list.invalidate();
      setIsDialogOpen(false); 
      resetForm(); 
    },
  });

  const deleteMutation = trpc.workerTypes.delete.useMutation({
    onSuccess: () => { 
      toast.success("인력 유형이 삭제되었습니다."); 
      utils.workerTypes.list.invalidate(); 
    },
  });

  const resetForm = () => { 
    setFormData({ name: "", description: "", licenseRequired: false }); 
    setRequiredDocs([]);
    setNewDocName("");
    setEditingId(null); 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 중복 제출 방지
    if (createMutation.isPending || updateMutation.isPending) {
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
        requiredDocs
      });
    } else {
      createMutation.mutate({
        ...formData,
        requiredDocs
      });
    }
  };

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setFormData({ 
      name: type.name, 
      description: type.description || "",
      licenseRequired: type.licenseRequired || false
    });
    
    // 기존 필수 서류 불러오기
    const docs = allWorkerDocs?.filter(d => d.workerTypeId === type.id) || [];
    setRequiredDocs(docs.map(d => ({
      docName: d.docName,
      isMandatory: d.isMandatory,
      hasExpiry: d.hasExpiry
    })));
    
    setIsDialogOpen(true);
  };

  const addRequiredDoc = () => {
    if (!newDocName.trim()) {
      toast.error("서류명을 입력하세요.");
      return;
    }
    
    if (requiredDocs.some(d => d.docName === newDocName.trim())) {
      toast.error("이미 추가된 서류입니다.");
      return;
    }

    setRequiredDocs([
      ...requiredDocs,
      { docName: newDocName.trim(), isMandatory: true, hasExpiry: false }
    ]);
    setNewDocName("");
  };

  const removeRequiredDoc = (index: number) => {
    setRequiredDocs(requiredDocs.filter((_, i) => i !== index));
  };

  const updateRequiredDoc = (index: number, field: keyof RequiredDoc, value: any) => {
    setRequiredDocs(requiredDocs.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    ));
  };

  const getRequiredDocsCount = (workerTypeId: string) => {
    return allWorkerDocs?.filter(d => d.workerTypeId === workerTypeId).length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">인력 유형 관리</h1>
          <p className="text-muted-foreground">인력 유형과 필수 서류를 관리합니다.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          인력 유형 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>인력 유형 목록</CardTitle>
          <CardDescription>
            총 {workerTypes?.length || 0}개의 인력 유형이 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workerTypes && workerTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>면허 필수</TableHead>
                  <TableHead>필수 서류</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workerTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.description || "-"}</TableCell>
                    <TableCell>
                      {type.licenseRequired ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">필수</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{getRequiredDocsCount(type.id)}개</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { 
                          if (confirm("정말 삭제하시겠습니까?")) 
                            deleteMutation.mutate({ id: type.id }); 
                        }}
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
              등록된 인력 유형이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "인력 유형 수정" : "인력 유형 추가"}</DialogTitle>
            <DialogDescription>
              인력 유형 정보와 필수 서류를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">기본 정보</h3>
                <div className="space-y-2">
                  <Label>인력 유형명 *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="예: 크레인 기사, 용접공, 철근공 등"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="인력 유형에 대한 설명을 입력하세요"
                    rows={2}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="licenseRequired"
                    checked={formData.licenseRequired}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, licenseRequired: checked === true })
                    }
                  />
                  <Label htmlFor="licenseRequired" className="text-sm font-normal cursor-pointer">
                    면허 인증 필수
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 체크 시 해당 인력유형은 운전면허 자동 인증이 필수입니다. (예: 운전자)
                </p>
              </div>

              {/* 필수 서류 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">필수 서류</h3>
                  <span className="text-xs text-muted-foreground">
                    {requiredDocs.length}개 등록됨
                  </span>
                </div>

                {/* 서류 추가 입력 */}
                <div className="flex gap-2">
                  <Input 
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="서류명 입력 (예: 운전면허증, 자격증, 건강검진서 등)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRequiredDoc();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={addRequiredDoc}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* 서류 목록 */}
                {requiredDocs.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>서류명</TableHead>
                          <TableHead className="w-24">필수</TableHead>
                          <TableHead className="w-32">만료일 관리</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requiredDocs.map((doc, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{doc.docName}</TableCell>
                            <TableCell>
                              <Checkbox 
                                checked={doc.isMandatory}
                                onCheckedChange={(checked) => 
                                  updateRequiredDoc(index, 'isMandatory', checked)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox 
                                checked={doc.hasExpiry}
                                onCheckedChange={(checked) => 
                                  updateRequiredDoc(index, 'hasExpiry', checked)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRequiredDoc(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                    필수 서류를 추가하세요
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  💡 <strong>필수</strong>: 체크 시 해당 서류가 없으면 반입 불가<br />
                  💡 <strong>만료일 관리</strong>: 체크 시 서류 만료일 추적 및 알림
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "저장 중..."
                  : editingId ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

