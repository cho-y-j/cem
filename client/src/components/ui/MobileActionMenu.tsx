import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface MobileActionMenuProps {
  actions: Action[];
  className?: string;
  /**
   * 모바일에서 항상 드롭다운 메뉴로 표시할지 여부
   * false이면 모바일에서도 버튼 그룹으로 표시 (기본값: true)
   */
  alwaysDropdownOnMobile?: boolean;
}

/**
 * 모바일에서 여러 액션 버튼을 드롭다운 메뉴로 변환하는 컴포넌트
 * 데스크탑에서는 버튼 그룹으로 표시
 */
export function MobileActionMenu({
  actions,
  className,
  alwaysDropdownOnMobile = true,
}: MobileActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // 모바일이고 alwaysDropdownOnMobile이 true이면 드롭다운 메뉴 사용
  if (isMobile && alwaysDropdownOnMobile) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("min-w-[44px] min-h-[44px]", className)}
          >
            <MoreVertical className="h-5 w-5" />
            <span className="sr-only">액션 메뉴</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              disabled={action.disabled}
              className={cn(
                action.variant === "destructive" && "text-destructive focus:text-destructive"
              )}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 데스크탑 또는 alwaysDropdownOnMobile이 false이면 버튼 그룹으로 표시
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant === "destructive" ? "destructive" : "ghost"}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
          title={action.label}
        >
          {action.icon}
          {!isMobile && <span className="ml-2">{action.label}</span>}
        </Button>
      ))}
    </div>
  );
}

