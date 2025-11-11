import { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, Home, FileText, ClipboardCheck, User } from "lucide-react";
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
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        </header>
      )}

      {/* 메인 컨텐츠 - 모바일 최적화 */}
      <main className={cn(showBottomNav && "pb-24 safe-area-inset-bottom")}>
        {children}
      </main>

      {/* 하단 네비게이션 (Worker 전용) - 모바일 최적화 */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 safe-area-inset-bottom max-w-md mx-auto">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            <button
              onClick={() => setLocation('/mobile/worker')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-colors active:scale-95",
                location === '/mobile/worker'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs font-medium">홈</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/work-journal-list')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-colors active:scale-95",
                location === '/mobile/work-journal-list' || location === '/mobile/work-log'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs font-medium">작업확인서</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/driver-inspection')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-colors active:scale-95",
                location.startsWith('/mobile/driver-inspection')
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-xs font-medium">점검표</span>
            </button>

            <button
              onClick={() => setLocation('/mobile/profile')}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 rounded-lg transition-colors active:scale-95",
                location === '/mobile/profile'
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 active:bg-gray-100"
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">내 정보</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

