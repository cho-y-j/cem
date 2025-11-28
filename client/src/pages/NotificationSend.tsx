import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Send, Loader2, AlertTriangle, Megaphone, FileText, Settings, Bell, X, Users } from "lucide-react";
import { toast } from "sonner";

type NotificationType = "announcement" | "document_expiry" | "emergency" | "task" | "system";
type NotificationPriority = "low" | "normal" | "high" | "urgent";
type TargetType = "all" | "company" | "role" | "user" | "multiple";

const typeOptions: { value: NotificationType; label: string; icon: typeof Bell; description: string }[] = [
  { value: "announcement", label: "공지사항", icon: Megaphone, description: "일반 공지 및 안내" },
  { value: "emergency", label: "긴급 알림", icon: AlertTriangle, description: "날씨, 휴무, 작업 중단 등" },
  { value: "task", label: "작업 지시", icon: Settings, description: "서류 제출 요청, 업무 지시" },
  { value: "document_expiry", label: "서류 만료", icon: FileText, description: "서류 만료 알림 (자동 발송)" },
  { value: "system", label: "시스템", icon: Bell, description: "시스템 알림" },
];

const priorityOptions: { value: NotificationPriority; label: string; description: string }[] = [
  { value: "low", label: "낮음", description: "일반 정보성 알림" },
  { value: "normal", label: "보통", description: "기본 알림" },
  { value: "high", label: "중요", description: "주의가 필요한 알림" },
  { value: "urgent", label: "긴급", description: "즉시 확인이 필요한 알림" },
];

const targetTypeOptions: { value: TargetType; label: string; description: string }[] = [
  { value: "all", label: "전체", description: "모든 사용자" },
  { value: "role", label: "역할별", description: "특정 역할의 사용자" },
  { value: "company", label: "회사별", description: "특정 회사 소속 사용자" },
  { value: "user", label: "개인", description: "특정 사용자" },
];

export default function NotificationSendPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  // URL에서 선택된 사용자 정보 파싱
  const selectedUsersFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const userIds = params.get("userIds")?.split(",").filter(Boolean) || [];
    const names = params.get("names")?.split(",").filter(Boolean) || [];

    return userIds.map((id, index) => ({
      id,
      name: names[index] || "알 수 없음",
    }));
  }, [searchString]);

  const hasPreselectedUsers = selectedUsersFromUrl.length > 0;

  // admin이 아니면 기본값을 "user"로 설정, 미리 선택된 사용자가 있으면 "multiple"
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "announcement" as NotificationType,
    priority: "normal" as NotificationPriority,
    targetType: (hasPreselectedUsers ? "multiple" : (isAdmin ? "all" : "user")) as TargetType,
    targetId: "",
    targetUserIds: selectedUsersFromUrl.map(u => u.id),
    sendSms: false,
  });

  // URL 파라미터가 변경되면 formData 업데이트
  useEffect(() => {
    if (hasPreselectedUsers) {
      setFormData(prev => ({
        ...prev,
        targetType: "multiple",
        targetUserIds: selectedUsersFromUrl.map(u => u.id),
      }));
    }
  }, [hasPreselectedUsers, selectedUsersFromUrl]);

  // 대상 옵션 조회
  const { data: targetOptions = [], isLoading: loadingTargets } = trpc.notifications.getTargetOptions.useQuery(
    { targetType: formData.targetType as "company" | "role" | "user" },
    { enabled: formData.targetType !== "all" && formData.targetType !== "multiple" }
  );

  // 알림 발송
  const sendMutation = trpc.notifications.send.useMutation({
    onSuccess: () => {
      toast.success("알림이 발송되었습니다");
      setLocation("/notifications");
    },
    onError: (error) => {
      toast.error(error.message || "알림 발송에 실패했습니다");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 제목 또는 내용 중 하나는 필수
    if (!formData.title.trim() && !formData.content.trim()) {
      toast.error("제목 또는 내용을 입력해주세요");
      return;
    }

    // 다중 사용자 선택인 경우
    if (formData.targetType === "multiple" && formData.targetUserIds.length > 0) {
      // 각 사용자에게 개별 알림 발송
      let successCount = 0;
      let failCount = 0;

      for (const userId of formData.targetUserIds) {
        try {
          await sendMutation.mutateAsync({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            priority: formData.priority,
            targetType: "user",
            targetId: userId,
            sendSms: formData.sendSms,
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount > 0) {
        toast.warning(`${successCount}명 발송 성공, ${failCount}명 발송 실패`);
      } else {
        toast.success(`${successCount}명에게 알림이 발송되었습니다`);
      }
      setLocation("/notifications");
      return;
    }

    if (formData.targetType !== "all" && !formData.targetId) {
      toast.error("대상을 선택해주세요");
      return;
    }

    sendMutation.mutate({
      title: formData.title,
      content: formData.content,
      type: formData.type,
      priority: formData.priority,
      targetType: formData.targetType === "multiple" ? "user" : formData.targetType,
      targetId: formData.targetType !== "all" ? formData.targetId : undefined,
      sendSms: formData.sendSms,
    });
  };

  // 역할에 따른 대상 타입 필터링
  const filteredTargetTypes = targetTypeOptions.filter((option) => {
    // admin만 전체 발송 가능
    if (option.value === "all" && !isAdmin) return false;
    return true;
  });

  // 역할에 따른 알림 타입 필터링
  const filteredTypeOptions = typeOptions.filter((option) => {
    // 긴급 알림은 admin, bp, ep만 발송 가능
    if (option.value === "emergency" && !["admin", "bp", "ep"].includes(user?.role?.toLowerCase() || "")) {
      return false;
    }
    // document_expiry는 시스템 자동 발송용이므로 숨김
    if (option.value === "document_expiry") return false;
    // system은 admin만
    if (option.value === "system" && !isAdmin) return false;
    return true;
  });

  // 선택된 사용자 제거
  const removeSelectedUser = (userId: string) => {
    const newUserIds = formData.targetUserIds.filter(id => id !== userId);
    if (newUserIds.length === 0) {
      // 모든 사용자가 제거되면 일반 모드로 전환
      setFormData({
        ...formData,
        targetType: isAdmin ? "all" : "user",
        targetUserIds: [],
      });
      // URL에서 파라미터 제거
      setLocation("/notifications/send");
    } else {
      setFormData({
        ...formData,
        targetUserIds: newUserIds,
      });
    }
  };

  return (
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/notifications")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">알림 발송</h1>
              <p className="text-muted-foreground">공지사항, 긴급 알림, 작업 지시 등을 발송합니다</p>
            </div>
          </div>
        </div>

        {/* 선택된 대상자 표시 */}
        {hasPreselectedUsers && formData.targetType === "multiple" && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                선택된 대상자 ({selectedUsersFromUrl.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedUsersFromUrl.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                    {user.name}
                    <button
                      type="button"
                      onClick={() => removeSelectedUser(user.id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                인력 관리에서 선택한 대상자입니다. 개별 알림이 발송됩니다.
              </p>
            </CardContent>
          </Card>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 내용</CardTitle>
              <CardDescription>발송할 알림의 내용을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 알림 유형 */}
              <div className="space-y-2">
                <Label>알림 유형</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {filteredTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: option.value })}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 중요도 */}
              <div className="space-y-2">
                <Label>중요도</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as NotificationPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">제목 <span className="text-muted-foreground text-xs">(선택)</span></Label>
                <Input
                  id="title"
                  placeholder="알림 제목을 입력하세요"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={200}
                />
              </div>

              {/* 내용 */}
              <div className="space-y-2">
                <Label htmlFor="content">내용 <span className="text-muted-foreground text-xs">(선택)</span></Label>
                <Textarea
                  id="content"
                  placeholder="알림 내용을 입력하세요"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">제목 또는 내용 중 하나는 필수입니다.</p>
              </div>
            </CardContent>
          </Card>

          {/* 대상 선택 - 미리 선택된 사용자가 없는 경우에만 표시 */}
          {formData.targetType !== "multiple" && (
            <Card>
              <CardHeader>
                <CardTitle>발송 대상</CardTitle>
                <CardDescription>알림을 받을 대상을 선택하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 대상 유형 */}
                <div className="space-y-2">
                  <Label>대상 유형</Label>
                  <Select
                    value={formData.targetType}
                    onValueChange={(value) => setFormData({ ...formData, targetType: value as TargetType, targetId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTargetTypes.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 대상 선택 */}
                {formData.targetType !== "all" && (
                  <div className="space-y-2">
                    <Label>
                      {formData.targetType === "role" && "역할 선택"}
                      {formData.targetType === "company" && "회사 선택"}
                      {formData.targetType === "user" && "사용자 선택"}
                    </Label>
                    <Select
                      value={formData.targetId}
                      onValueChange={(value) => setFormData({ ...formData, targetId: value })}
                      disabled={loadingTargets}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetOptions.map((option: { id: string; name: string }) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SMS 발송 옵션 (긴급 알림만) */}
          {formData.type === "emergency" && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-900/20">
                  <div className="space-y-0.5">
                    <Label className="font-medium">SMS 동시 발송</Label>
                    <p className="text-sm text-muted-foreground">
                      긴급 알림을 SMS로도 발송합니다 (추가 비용 발생)
                    </p>
                  </div>
                  <Switch
                    checked={formData.sendSms}
                    onCheckedChange={(checked) => setFormData({ ...formData, sendSms: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/notifications")}
            >
              취소
            </Button>
            <Button type="submit" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {formData.targetType === "multiple"
                ? `${formData.targetUserIds.length}명에게 발송하기`
                : "발송하기"
              }
            </Button>
          </div>
        </form>
      </div>
  );
}
