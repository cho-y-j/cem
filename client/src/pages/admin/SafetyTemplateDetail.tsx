import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function SafetyTemplateDetail() {
  const [, params] = useRoute("/admin/safety-templates/:id");
  const templateId = params?.id;

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    category: "",
    itemText: "",
    checkFrequency: "daily" as "daily" | "weekly" | "monthly" | "as_needed",
    checkTiming: [] as string[], // 배열로 변경 (복수 선택)
    resultType: "status" as "status" | "text",
    displayOrder: 0,
    isRequired: true,
  });

  // 템플릿 조회
  const { data: template, isLoading } = trpc.safetyInspection.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // 항목 삭제
  const deleteItemMutation = trpc.safetyInspection.deleteTemplateItem.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  // 항목 추가
  const createItemMutation = trpc.safetyInspection.createTemplateItem.useMutation({
    onSuccess: () => {
      setIsAddItemDialogOpen(false);
      setNewItem({
        category: "",
        itemText: "",
        checkFrequency: "daily",
        checkTiming: [],
        resultType: "status",
        displayOrder: 0,
        isRequired: true,
      });
      window.location.reload();
    },
  });

  // 항목 수정
  const updateItemMutation = trpc.safetyInspection.updateTemplateItem.useMutation({
    onSuccess: () => {
      setIsEditItemDialogOpen(false);
      setEditingItem(null);
      window.location.reload();
    },
  });

  const handleDeleteItem = (id: string, itemText: string) => {
    if (confirm(`"${itemText}" 항목을 삭제하시겠습니까?`)) {
      deleteItemMutation.mutate({ id });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem({
      id: item.id,
      category: item.category || "",
      itemText: item.itemText,
      checkFrequency: item.checkFrequency,
      checkTiming: item.checkTiming ? item.checkTiming.split(',').filter((t: string) => t) : [],
      resultType: item.resultType,
      displayOrder: item.displayOrder || 0,
      isRequired: item.isRequired ?? true,
    });
    setIsEditItemDialogOpen(true);
  };

  const handleAddItem = () => {
    if (!templateId) return;
    createItemMutation.mutate({
      templateId,
      ...newItem,
      checkTiming: newItem.checkTiming.join(','), // 배열을 콤마로 구분된 문자열로 변환
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateItemMutation.mutate({
      id: editingItem.id,
      category: editingItem.category || undefined,
      itemText: editingItem.itemText,
      checkFrequency: editingItem.checkFrequency,
      checkTiming: editingItem.checkTiming.join(','),
      displayOrder: editingItem.displayOrder,
      isRequired: editingItem.isRequired,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">
          템플릿을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  // 카테고리별로 항목 그룹화
  const groupedItems = (template.items || []).reduce((acc, item) => {
    const category = item.category || "기타";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof template.items>);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/safety-templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{template.name}</h1>
            <p className="text-muted-foreground mt-1">{template.description}</p>
          </div>
        </div>
        <Link href={`/admin/safety-templates/${templateId}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Button>
        </Link>
      </div>

      {/* 템플릿 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>템플릿 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">점검자 유형</Label>
            <div className="mt-1">
              <Badge variant={template.inspectorType === "inspector" ? "default" : "secondary"}>
                {template.inspectorType === "inspector" ? "점검원" : "운전자"}
              </Badge>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">상태</Label>
            <div className="mt-1">
              {template.isActive ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  활성
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  비활성
                </Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">생성일</Label>
            <div className="mt-1 text-sm">
              {template.createdAt
                ? format(new Date(template.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })
                : "-"}
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">생성자</Label>
            <div className="mt-1 text-sm">{template.createdBy || "-"}</div>
          </div>
        </CardContent>
      </Card>

      {/* 체크 항목 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>체크 항목</CardTitle>
              <CardDescription>
                총 {template.items?.length || 0}개의 체크 항목이 있습니다
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddItemDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              항목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                {category}
                <Badge variant="outline">{items.length}개</Badge>
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">순서</TableHead>
                    <TableHead>점검 항목</TableHead>
                    <TableHead>점검 빈도</TableHead>
                    <TableHead>점검 시점</TableHead>
                    <TableHead>결과 유형</TableHead>
                    <TableHead>필수</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">
                          {item.displayOrder}
                        </TableCell>
                        <TableCell className="max-w-[400px]">{item.itemText}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.checkFrequency === "daily"
                              ? "일일"
                              : item.checkFrequency === "weekly"
                              ? "주간"
                              : item.checkFrequency === "monthly"
                              ? "월간"
                              : "필요시"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.checkTiming?.split(',').filter(t => t).map((timing, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {timing === "before_use"
                                  ? "사용전"
                                  : timing === "during_use"
                                  ? "사용중"
                                  : timing === "after_use"
                                  ? "사용후"
                                  : timing}
                              </Badge>
                            ))}
                            {!item.checkTiming && <span className="text-sm text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.resultType === "status" ? "default" : "secondary"}>
                            {item.resultType === "status" ? "상태" : "텍스트"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.isRequired ? (
                            <Badge variant="destructive">필수</Badge>
                          ) : (
                            <Badge variant="outline">선택</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              disabled={updateItemMutation.isPending}
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id, item.itemText)}
                              disabled={deleteItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 항목 추가 다이얼로그 */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>체크 항목 추가</DialogTitle>
            <DialogDescription>새로운 체크 항목을 추가합니다</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category">카테고리</Label>
              <Input
                id="category"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                placeholder="예: 일일점검, 주간점검"
              />
            </div>

            <div>
              <Label htmlFor="itemText">점검 항목 *</Label>
              <Textarea
                id="itemText"
                value={newItem.itemText}
                onChange={(e) => setNewItem({ ...newItem, itemText: e.target.value })}
                placeholder="점검할 항목을 입력하세요"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkFrequency">점검 빈도 *</Label>
                <Select
                  value={newItem.checkFrequency}
                  onValueChange={(val: any) =>
                    setNewItem({ ...newItem, checkFrequency: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">일일</SelectItem>
                    <SelectItem value="weekly">주간</SelectItem>
                    <SelectItem value="monthly">월간</SelectItem>
                    <SelectItem value="as_needed">필요시</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">점검 시점 (복수 선택 가능)</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timing-before"
                      checked={newItem.checkTiming.includes('before_use')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewItem({ ...newItem, checkTiming: [...newItem.checkTiming, 'before_use'] });
                        } else {
                          setNewItem({ ...newItem, checkTiming: newItem.checkTiming.filter(t => t !== 'before_use') });
                        }
                      }}
                    />
                    <label htmlFor="timing-before" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      사용 전
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timing-during"
                      checked={newItem.checkTiming.includes('during_use')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewItem({ ...newItem, checkTiming: [...newItem.checkTiming, 'during_use'] });
                        } else {
                          setNewItem({ ...newItem, checkTiming: newItem.checkTiming.filter(t => t !== 'during_use') });
                        }
                      }}
                    />
                    <label htmlFor="timing-during" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      사용 중
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="timing-after"
                      checked={newItem.checkTiming.includes('after_use')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewItem({ ...newItem, checkTiming: [...newItem.checkTiming, 'after_use'] });
                        } else {
                          setNewItem({ ...newItem, checkTiming: newItem.checkTiming.filter(t => t !== 'after_use') });
                        }
                      }}
                    />
                    <label htmlFor="timing-after" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      사용 후
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resultType">결과 유형</Label>
                <Select
                  value={newItem.resultType}
                  onValueChange={(val: any) => setNewItem({ ...newItem, resultType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">상태 (양호/조정/교환 등)</SelectItem>
                    <SelectItem value="text">텍스트 입력</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="displayOrder">표시 순서</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={newItem.displayOrder}
                  onChange={(e) =>
                    setNewItem({ ...newItem, displayOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={newItem.isRequired}
                onCheckedChange={(checked) =>
                  setNewItem({ ...newItem, isRequired: checked === true })
                }
              />
              <label
                htmlFor="isRequired"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                필수 항목
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItem.itemText || createItemMutation.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 항목 수정 다이얼로그 */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>체크 항목 수정</DialogTitle>
            <DialogDescription>체크 항목을 수정합니다</DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-category">카테고리</Label>
                <Input
                  id="edit-category"
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  placeholder="예: 일일점검, 주간점검"
                />
              </div>

              <div>
                <Label htmlFor="edit-itemText">점검 항목 *</Label>
                <Textarea
                  id="edit-itemText"
                  value={editingItem.itemText}
                  onChange={(e) => setEditingItem({ ...editingItem, itemText: e.target.value })}
                  placeholder="점검할 항목을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-checkFrequency">점검 빈도 *</Label>
                  <Select
                    value={editingItem.checkFrequency}
                    onValueChange={(val: any) =>
                      setEditingItem({ ...editingItem, checkFrequency: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">일일</SelectItem>
                      <SelectItem value="weekly">주간</SelectItem>
                      <SelectItem value="monthly">월간</SelectItem>
                      <SelectItem value="as_needed">필요시</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-3 block">점검 시점 (복수 선택 가능)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-timing-before"
                        checked={editingItem.checkTiming.includes('before_use')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingItem({ ...editingItem, checkTiming: [...editingItem.checkTiming, 'before_use'] });
                          } else {
                            setEditingItem({ ...editingItem, checkTiming: editingItem.checkTiming.filter((t: string) => t !== 'before_use') });
                          }
                        }}
                      />
                      <label htmlFor="edit-timing-before" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        사용 전
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-timing-during"
                        checked={editingItem.checkTiming.includes('during_use')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingItem({ ...editingItem, checkTiming: [...editingItem.checkTiming, 'during_use'] });
                          } else {
                            setEditingItem({ ...editingItem, checkTiming: editingItem.checkTiming.filter((t: string) => t !== 'during_use') });
                          }
                        }}
                      />
                      <label htmlFor="edit-timing-during" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        사용 중
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-timing-after"
                        checked={editingItem.checkTiming.includes('after_use')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingItem({ ...editingItem, checkTiming: [...editingItem.checkTiming, 'after_use'] });
                          } else {
                            setEditingItem({ ...editingItem, checkTiming: editingItem.checkTiming.filter((t: string) => t !== 'after_use') });
                          }
                        }}
                      />
                      <label htmlFor="edit-timing-after" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        사용 후
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-resultType">결과 유형</Label>
                  <Select
                    value={editingItem.resultType}
                    onValueChange={(val: any) => setEditingItem({ ...editingItem, resultType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">상태 (양호/조정/교환 등)</SelectItem>
                      <SelectItem value="text">텍스트 입력</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-displayOrder">표시 순서</Label>
                  <Input
                    id="edit-displayOrder"
                    type="number"
                    value={editingItem.displayOrder}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isRequired"
                  checked={editingItem.isRequired}
                  onCheckedChange={(checked) =>
                    setEditingItem({ ...editingItem, isRequired: checked === true })
                  }
                />
                <label
                  htmlFor="edit-isRequired"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  필수 항목
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleUpdateItem}
              disabled={!editingItem?.itemText || updateItemMutation.isPending}
            >
              {updateItemMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
