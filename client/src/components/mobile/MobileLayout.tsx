import { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, Home, FileText, ClipboardCheck, User, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showBottomNav?: boolean; // 하단 네비게이션 표시 여부
  headerAction?: ReactNode;
  showHeader?: boolean;
}

export default function MobileLayout({
  children,
  title,
  showBack = false,
  showMenu = false,
  showBottomNav = true,
  headerAction,
  showHeader = true,
}: MobileLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // 읽지 않은 알림 수 조회
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gray-50 safe-area-inset">
      {/* 헤더 - 모바일 최적화 */}
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm safe-area-inset-top">
          <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.history.back()}
                  className="h-10 w-10 shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              {showMenu && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                {title && <h1 className="text-lg font-bold truncate">{title}</h1>}
                {user && (
                  <p className="text-xs text-muted-foreground truncate">
                    {user.name || user.email}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* 알림 아이콘 */}
              <button
                onClick={() => setLocation("/mobile/notifications")}
                className="relative p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {headerAction && <div>{headerAction}</div>}
            </div>
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 - 모바일 최적화 */}
      <main className={cn(showBottomNav && "pb-28 safe-area-inset-bottom")}>
        {children}
      </main>

      {/* 하단 네비게이션 (Worker 전용) - 모바일 최적화 */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 safe-area-inset-bottom pb-8 max-w-md mx-auto">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            <button
              onClick={() => setLocation('/mobile/worker')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors active:scale-95",
                location === '/mobile/worker'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">홈</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/work-journal-list')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors active:scale-95",
                location === '/mobile/work-journal-list' || location === '/mobile/work-log'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[10px] font-medium">작업확인서</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/driver-inspection')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors active:scale-95",
                location.startsWith('/mobile/driver-inspection')
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-[10px] font-medium">점검표</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/notifications')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors active:scale-95 relative",
                location === '/mobile/notifications'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">알림</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/profile')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors active:scale-95",
                location === '/mobile/profile'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">내 정보</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

