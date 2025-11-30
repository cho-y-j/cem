import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  FileText,
  Megaphone,
  Settings,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Send,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type NotificationType = "announcement" | "document_expiry" | "emergency" | "task" | "system";
type NotificationPriority = "low" | "normal" | "high" | "urgent";

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  linkType?: string;
  linkId?: string;
  targetType?: string;
  targetId?: string;
  senderName?: string;
  targetName?: string;
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bgColor: string; label: string }> = {
  announcement: { icon: Megaphone, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "공지" },
  document_expiry: { icon: FileText, color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-900/30", label: "서류만료" },
  emergency: { icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30", label: "긴급" },
  task: { icon: Settings, color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/30", label: "작업지시" },
  system: { icon: Bell, color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-800", label: "시스템" },
};

const ITEMS_PER_PAGE = 10;

// 대상 타입 라벨
const getTargetLabel = (targetType?: string, targetName?: string) => {
  if (!targetType) return "";
  if (targetType === "all") return "전체";
  if (targetType === "role") return `역할: ${targetName || ""}`;
  if (targetType === "company") return `회사: ${targetName || ""}`;
  if (targetType === "user") return targetName || "개인";
  return "";
};

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"inbox" | "unread" | "sent">("inbox");
  const [page, setPage] = useState(0);
  const utils = trpc.useUtils();

  const unreadOnly = activeTab === "unread";
  const offset = page * ITEMS_PER_PAGE;

  const canSendNotification = ["admin", "owner", "bp", "ep"].includes(user?.role?.toLowerCase() || "");

  // 알림 목록 조회 (수신함)
  const { data, isLoading, isFetching } = trpc.notifications.list.useQuery({
    limit: ITEMS_PER_PAGE,
    offset,
    unreadOnly,
  }, {
    enabled: activeTab !== "sent",
  });

  // 발송함 조회
  const { data: sentData, isLoading: sentLoading, isFetching: sentFetching } = trpc.notifications.sentList.useQuery({
    limit: ITEMS_PER_PAGE,
    offset,
  }, {
    enabled: activeTab === "sent" && canSendNotification,
  });

  // 읽음 처리
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // 전체 읽음 처리
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: NotificationItem) => {
    // 읽음 처리
    if (!notification.isRead) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }

    // 링크가 있으면 해당 페이지로 이동
    if (notification.linkType && notification.linkId) {
      const linkMap: Record<string, string> = {
        document: `/documents?id=${notification.linkId}`,
        deployment: `/deployments?id=${notification.linkId}`,
        entry_request: `/entry-requests?id=${notification.linkId}`,
      };
      const link = linkMap[notification.linkType];
      if (link) {
        setLocation(link);
      }
    }
  };

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const unreadCount = data?.unreadCount || 0;

  // 발송함 데이터
  const sentNotifications = sentData?.notifications || [];
  const sentTotal = sentData?.total || 0;

  // 현재 탭에 따른 데이터
  const currentNotifications = activeTab === "sent" ? sentNotifications : notifications;
  const currentTotal = activeTab === "sent" ? sentTotal : total;
  const currentLoading = activeTab === "sent" ? sentLoading : isLoading;
  const currentFetching = activeTab === "sent" ? sentFetching : isFetching;
  const totalPages = Math.ceil(currentTotal / ITEMS_PER_PAGE);

  return (
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">알림함</h1>
            <p className="text-muted-foreground">
              읽지 않은 알림 {unreadCount}개
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                모두 읽음
              </Button>
            )}
            {canSendNotification && (
              <Button onClick={() => setLocation("/notifications/send")}>
                <Megaphone className="h-4 w-4 mr-2" />
                알림 발송
              </Button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "inbox" | "unread" | "sent"); setPage(0); }}>
          <TabsList>
            <TabsTrigger value="inbox">
              <Bell className="h-4 w-4 mr-1" />
              수신함 ({total})
            </TabsTrigger>
            <TabsTrigger value="unread">읽지 않음 ({unreadCount})</TabsTrigger>
            {canSendNotification && (
              <TabsTrigger value="sent">
                <Send className="h-4 w-4 mr-1" />
                발송함 ({sentTotal})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {currentLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : currentNotifications.length === 0 ? (
                  <div className="py-16 text-center">
                    {activeTab === "sent" ? (
                      <Send className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    ) : (
                      <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    )}
                    <p className="mt-4 text-muted-foreground">
                      {activeTab === "sent"
                        ? "발송한 알림이 없습니다"
                        : unreadOnly
                          ? "읽지 않은 알림이 없습니다"
                          : "알림이 없습니다"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {currentNotifications.map((notification: NotificationItem) => {
                      const typeInfo = typeConfig[notification.type] || typeConfig.system;
                      const Icon = typeInfo.icon;
                      const targetLabel = getTargetLabel(notification.targetType, notification.targetName);

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "flex gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50",
                            !notification.isRead && "bg-primary/5"
                          )}
                        >
                          <div className={cn("p-2 rounded-full shrink-0", typeInfo.bgColor)}>
                            <Icon className={cn("h-5 w-5", typeInfo.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded font-medium",
                                notification.priority === "urgent" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                                notification.priority === "high" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                                notification.priority === "normal" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                                notification.priority === "low" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                              )}>
                                {typeInfo.label}
                              </span>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(notification.createdAt).toLocaleString("ko-KR", {
                                  timeZone: "Asia/Seoul",
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </span>
                            </div>
                            <h3 className="font-medium mt-1">{notification.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.content}
                            </p>
                            {/* 발신자/대상 정보 */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {activeTab === "sent" ? (
                                // 발송함: 대상만 표시
                                targetLabel && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    대상: {targetLabel}
                                  </span>
                                )
                              ) : (
                                // 수신함: 발신자 표시
                                <>
                                  {notification.senderName && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      발신: {notification.senderName}
                                    </span>
                                  )}
                                  {targetLabel && (
                                    <span className="flex items-center gap-1">
                                      → 대상: {targetLabel}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {/* 읽음 처리 버튼 (발송함에서는 표시하지 않음) */}
                          {activeTab !== "sent" && !notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate({ notificationId: notification.id });
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      {offset + 1} - {Math.min(offset + ITEMS_PER_PAGE, currentTotal)} / {currentTotal}건
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 0 || currentFetching}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages - 1 || currentFetching}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
