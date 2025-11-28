import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, AlertTriangle, FileText, Megaphone, Settings, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

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
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; label: string }> = {
  announcement: { icon: Megaphone, color: "text-blue-500", label: "공지" },
  document_expiry: { icon: FileText, color: "text-orange-500", label: "서류만료" },
  emergency: { icon: AlertTriangle, color: "text-red-500", label: "긴급" },
  task: { icon: Settings, color: "text-purple-500", label: "작업지시" },
  system: { icon: Bell, color: "text-gray-500", label: "시스템" },
};

const priorityConfig: Record<NotificationPriority, { bg: string; border: string }> = {
  low: { bg: "bg-background", border: "border-border" },
  normal: { bg: "bg-background", border: "border-border" },
  high: { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-300 dark:border-yellow-700" },
  urgent: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-300 dark:border-red-700" },
};

export function NotificationDropdown() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  // 읽지 않은 알림 수 조회
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 알림 목록 조회 (드롭다운 열렸을 때만)
  const { data: notificationsData, isLoading } = trpc.notifications.list.useQuery(
    { limit: 5 },
    { enabled: isOpen }
  );

  // 읽음 처리
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  // 전체 읽음 처리
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
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
        setIsOpen(false);
      }
    }
  };

  const notifications = notificationsData?.notifications || [];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              모두 읽음
            </Button>
          )}
        </div>

        {/* 알림 목록 */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            notifications.map((notification: NotificationItem) => {
              const typeInfo = typeConfig[notification.type] || typeConfig.system;
              const priorityInfo = priorityConfig[notification.priority] || priorityConfig.normal;
              const Icon = typeInfo.icon;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex gap-3 border-b px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50",
                    !notification.isRead && "bg-primary/5",
                    priorityInfo.bg
                  )}
                >
                  <div className={cn("mt-0.5", typeInfo.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
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
                        </div>
                        <p className="font-medium text-sm mt-1 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.content}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => {
              setLocation("/notifications");
              setIsOpen(false);
            }}
          >
            전체 보기
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
