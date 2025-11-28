import { useAuth } from "@/_core/hooks/useAuth";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
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
  ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";

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
  senderName?: string;
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bgColor: string; label: string }> = {
  announcement: { icon: Megaphone, color: "text-blue-500", bgColor: "bg-blue-100", label: "공지" },
  document_expiry: { icon: FileText, color: "text-orange-500", bgColor: "bg-orange-100", label: "서류만료" },
  emergency: { icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-100", label: "긴급" },
  task: { icon: Settings, color: "text-purple-500", bgColor: "bg-purple-100", label: "작업지시" },
  system: { icon: Bell, color: "text-gray-500", bgColor: "bg-gray-100", label: "시스템" },
};

const priorityColors: Record<NotificationPriority, string> = {
  urgent: "border-l-4 border-l-red-500 bg-red-50",
  high: "border-l-4 border-l-yellow-500 bg-yellow-50",
  normal: "",
  low: "opacity-80",
};

export default function NotificationsMobile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // 알림 목록 조회
  const { data, isLoading, refetch } = trpc.notifications.list.useQuery({
    limit: 50,
    offset: 0,
    unreadOnly: false,
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
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <MobileLayout showHeader={false}>
      {/* 헤더 - 커스텀 */}
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/mobile/worker")}
            className="p-1 -ml-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">알림</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                읽지 않은 알림 {unreadCount}개
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            모두 읽음
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      <div className="p-4 pb-24 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">알림이 없습니다</p>
          </div>
        ) : (
          notifications.map((notification: NotificationItem) => {
            const typeInfo = typeConfig[notification.type] || typeConfig.system;
            const Icon = typeInfo.icon;

            return (
              <Card
                key={notification.id}
                className={cn(
                  "overflow-hidden transition-all relative",
                  // 안읽음: 파란 테두리 + 밝은 배경
                  !notification.isRead && "ring-2 ring-blue-500 bg-blue-50",
                  // 읽음: 회색 배경
                  notification.isRead && "bg-gray-50 opacity-70",
                  priorityColors[notification.priority]
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* 안읽음 표시 배지 */}
                {!notification.isRead && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    NEW
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={cn(
                      "p-2 rounded-full shrink-0 h-fit",
                      !notification.isRead ? "bg-blue-100" : typeInfo.bgColor
                    )}>
                      <Icon className={cn("h-4 w-4", typeInfo.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded font-medium",
                          notification.priority === "urgent" && "bg-red-100 text-red-700",
                          notification.priority === "high" && "bg-yellow-100 text-yellow-700",
                          notification.priority === "normal" && "bg-gray-100 text-gray-700",
                          notification.priority === "low" && "bg-gray-100 text-gray-500",
                        )}>
                          {typeInfo.label}
                        </span>
                        {/* 읽음 상태 표시 */}
                        {notification.isRead ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">
                            읽음
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500 text-white font-medium animate-pulse">
                            안읽음
                          </span>
                        )}
                      </div>
                      <h3 className={cn(
                        "font-medium text-sm",
                        !notification.isRead && "text-blue-900 font-semibold",
                        notification.isRead && "text-gray-600"
                      )}>
                        {notification.title}
                      </h3>
                      <p className={cn(
                        "text-xs mt-1 line-clamp-2",
                        !notification.isRead ? "text-gray-700" : "text-gray-400"
                      )}>
                        {notification.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {notification.senderName && `${notification.senderName} · `}
                          {format(new Date(notification.createdAt), "MM.dd HH:mm", { locale: ko })}
                        </span>
                        {!notification.isRead && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-3 text-xs bg-blue-500 hover:bg-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate({ notificationId: notification.id });
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            읽음 처리
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </MobileLayout>
  );
}
