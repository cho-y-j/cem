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

export default function AdminEquipTypes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "",
  });
  const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>([]);
  const [newDocName, setNewDocName] = useState("");

  const utils = trpc.useUtils();
  const { data: equipTypes } = trpc.equipTypes.list.useQuery();
  const { data: allTypeDocs } = trpc.typeDocs.list.useQuery();

  const createMutation = trpc.equipTypes.create.useMutation({
    onSuccess: () => { 
      toast.success("장비 종류가 등록되었습니다."); 
      utils.equipTypes.list.invalidate(); 
      utils.typeDocs.list.invalidate();
      setIsDialogOpen(false); 
      resetForm(); 
    },
  });

  const updateMutation = trpc.equipTypes.update.useMutation({
    onSuccess: () => { 
      toast.success("장비 종류가 수정되었습니다."); 
      utils.equipTypes.list.invalidate(); 
      utils.typeDocs.list.invalidate();
      setIsDialogOpen(false); 
      resetForm(); 
    },
  });

  const deleteMutation = trpc.equipTypes.delete.useMutation({
    onSuccess: () => { 
      toast.success("장비 종류가 삭제되었습니다."); 
      utils.equipTypes.list.invalidate(); 
    },
  });

  const resetForm = () => { 
    setFormData({ name: "", description: "" }); 
    setRequiredDocs([]);
    setNewDocName("");
    setEditingId(null); 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      description: type.description || "" 
    });
    
    // 기존 필수 서류 불러오기
    const docs = allTypeDocs?.filter(d => d.equipTypeId === type.id) || [];
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

  const getRequiredDocsCount = (equipTypeId: string) => {
    return allTypeDocs?.filter(d => d.equipTypeId === equipTypeId).length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">장비 종류 관리</h1>
          <p className="text-muted-foreground">장비 종류와 필수 서류를 관리합니다.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          장비 종류 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>장비 종류 목록</CardTitle>
          <CardDescription>
            총 {equipTypes?.length || 0}개의 장비 종류가 등록되어 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipTypes && equipTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead>필수 서류</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.description || "-"}</TableCell>
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
              등록된 장비 종류가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "장비 종류 수정" : "장비 종류 추가"}</DialogTitle>
            <DialogDescription>
              장비 종류 정보와 필수 서류를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">기본 정보</h3>
                <div className="space-y-2">
                  <Label>장비 종류명 *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="예: 크레인, 굴삭기, 덤프트럭 등"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="장비 종류에 대한 설명을 입력하세요"
                    rows={2}
                  />
                </div>
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
                    placeholder="서류명 입력 (예: 차량등록증, 보험증서 등)"
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
              >
                취소
              </Button>
              <Button type="submit">
                {editingId ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

