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
import { ArrowLeft, Edit, Plus, Trash2, CheckCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

export default function DriverInspectionTemplateDetail() {
  const [, params] = useRoute("/admin/driver-templates/:id");
  const templateId = params?.id;

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    category: "",
    itemText: "",
    checkFrequency: "daily" as "daily" | "weekly" | "monthly",
    resultType: "status" as "status" | "text" | "numeric",
    displayOrder: 0,
    isRequired: true,
  });

  // 템플릿 조회
  const { data: template, isLoading } = trpc.driverInspection.getTemplate.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  // 항목 삭제
  const deleteItemMutation = trpc.driverInspection.deleteTemplateItem.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  // 항목 추가
  const createItemMutation = trpc.driverInspection.createTemplateItem.useMutation({
    onSuccess: () => {
      setIsAddItemDialogOpen(false);
      setNewItem({
        category: "",
        itemText: "",
        checkFrequency: "daily",
        resultType: "status",
        displayOrder: 0,
        isRequired: true,
      });
      window.location.reload();
    },
  });

  // 항목 수정
  const updateItemMutation = trpc.driverInspection.updateTemplateItem.useMutation({
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
    setEditingItem(item);
    setIsEditItemDialogOpen(true);
  };

  const handleAddItem = () => {
    createItemMutation.mutate({
      templateId: templateId!,
      category: newItem.category || undefined,
      itemText: newItem.itemText,
      checkFrequency: newItem.checkFrequency,
      resultType: newItem.resultType,
      displayOrder: newItem.displayOrder,
      isRequired: newItem.isRequired,
    });
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    updateItemMutation.mutate({
      id: editingItem.id,
      category: editingItem.category || undefined,
      itemText: editingItem.itemText,
      checkFrequency: editingItem.checkFrequency,
      resultType: editingItem.resultType,
      displayOrder: editingItem.displayOrder,
      isRequired: editingItem.isRequired,
    });
  };

  const getFrequencyBadge = (freq: string) => {
    switch (freq) {
      case "daily":
        return <Badge>일일점검</Badge>;
      case "weekly":
        return <Badge variant="secondary">주간점검</Badge>;
      case "monthly":
        return <Badge variant="outline">월간점검</Badge>;
      default:
        return <Badge variant="outline">{freq}</Badge>;
    }
  };

  const getResultTypeBadge = (type: string) => {
    switch (type) {
      case "status":
        return <Badge variant="outline">양호/불량</Badge>;
      case "text":
        return <Badge variant="outline">텍스트</Badge>;
      case "numeric":
        return <Badge variant="outline">숫자</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">템플릿을 찾을 수 없습니다.</p>
          <Link href="/admin/driver-templates">
            <Button className="mt-4">목록으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/driver-templates">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">{template.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {template.description || "운전자 점검표 템플릿"}
            </p>
          </div>
        </div>
        <Link href={`/admin/driver-templates/${templateId}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            템플릿 수정
          </Button>
        </Link>
      </div>

      {/* 템플릿 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>템플릿 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">장비 타입</p>
              <p className="font-medium">
                {template.equipTypeId || "전체 장비"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">상태</p>
              <p>
                {template.isActive ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    활성
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    비활성
                  </Badge>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">생성일</p>
              <p className="font-medium">
                {template.createdAt
                  ? format(new Date(template.createdAt), "yyyy년 MM월 dd일", { locale: ko })
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 점검 항목 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>점검 항목</CardTitle>
              <CardDescription>
                {template.items?.length || 0}개의 점검 항목이 있습니다
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddItemDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              항목 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!template.items || template.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              점검 항목이 없습니다. 항목을 추가해주세요.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">순서</TableHead>
                  <TableHead className="w-[120px]">카테고리</TableHead>
                  <TableHead>점검 항목</TableHead>
                  <TableHead className="w-[120px]">점검 주기</TableHead>
                  <TableHead className="w-[120px]">결과 타입</TableHead>
                  <TableHead className="w-[80px]">필수</TableHead>
                  <TableHead className="w-[120px] text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.displayOrder}</TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="secondary">{item.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.itemText}</TableCell>
                    <TableCell>{getFrequencyBadge(item.checkFrequency)}</TableCell>
                    <TableCell>{getResultTypeBadge(item.resultType)}</TableCell>
                    <TableCell>
                      {item.isRequired ? (
                        <Badge variant="destructive" className="text-xs">필수</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">선택</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id, item.itemText)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 항목 추가 다이얼로그 */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>점검 항목 추가</DialogTitle>
            <DialogDescription>
              새로운 점검 항목을 추가합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카테고리 (선택)</Label>
                <Input
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  placeholder="예: 유체레벨, 구조부, 안전장치"
                />
              </div>
              <div className="space-y-2">
                <Label>표시 순서</Label>
                <Input
                  type="number"
                  value={newItem.displayOrder}
                  onChange={(e) => setNewItem({ ...newItem, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>점검 항목 *</Label>
              <Textarea
                value={newItem.itemText}
                onChange={(e) => setNewItem({ ...newItem, itemText: e.target.value })}
                placeholder="예: 엔진오일 레벨 확인"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>점검 주기 *</Label>
                <Select
                  value={newItem.checkFrequency}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setNewItem({ ...newItem, checkFrequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">일일점검</SelectItem>
                    <SelectItem value="weekly">주간점검</SelectItem>
                    <SelectItem value="monthly">월간점검</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>결과 타입 *</Label>
                <Select
                  value={newItem.resultType}
                  onValueChange={(value: "status" | "text" | "numeric") =>
                    setNewItem({ ...newItem, resultType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">양호/불량</SelectItem>
                    <SelectItem value="text">텍스트 입력</SelectItem>
                    <SelectItem value="numeric">숫자 입력</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>필수 여부</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    checked={newItem.isRequired}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, isRequired: checked })}
                  />
                  <Label>{newItem.isRequired ? "필수" : "선택"}</Label>
                </div>
              </div>
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
              {createItemMutation.isPending ? "추가 중..." : "항목 추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 항목 수정 다이얼로그 */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>점검 항목 수정</DialogTitle>
            <DialogDescription>
              점검 항목 정보를 수정합니다
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>카테고리 (선택)</Label>
                  <Input
                    value={editingItem.category || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    placeholder="예: 유체레벨, 구조부, 안전장치"
                  />
                </div>
                <div className="space-y-2">
                  <Label>표시 순서</Label>
                  <Input
                    type="number"
                    value={editingItem.displayOrder}
                    onChange={(e) => setEditingItem({ ...editingItem, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>점검 항목 *</Label>
                <Textarea
                  value={editingItem.itemText}
                  onChange={(e) => setEditingItem({ ...editingItem, itemText: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>점검 주기 *</Label>
                  <Select
                    value={editingItem.checkFrequency}
                    onValueChange={(value: "daily" | "weekly" | "monthly") =>
                      setEditingItem({ ...editingItem, checkFrequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">일일점검</SelectItem>
                      <SelectItem value="weekly">주간점검</SelectItem>
                      <SelectItem value="monthly">월간점검</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>결과 타입 *</Label>
                  <Select
                    value={editingItem.resultType}
                    onValueChange={(value: "status" | "text" | "numeric") =>
                      setEditingItem({ ...editingItem, resultType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">양호/불량</SelectItem>
                      <SelectItem value="text">텍스트 입력</SelectItem>
                      <SelectItem value="numeric">숫자 입력</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>필수 여부</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      checked={editingItem.isRequired}
                      onCheckedChange={(checked) => setEditingItem({ ...editingItem, isRequired: checked })}
                    />
                    <Label>{editingItem.isRequired ? "필수" : "선택"}</Label>
                  </div>
                </div>
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
              {updateItemMutation.isPending ? "수정 중..." : "수정 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
