import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveFilterProps {
  children: ReactNode;
  className?: string;
}

/**
 * 모바일에서 세로 배치, 데스크탑에서 가로 배치되는 필터 컨테이너
 * 기존 필터 컴포넌트를 감싸서 사용
 */
export function ResponsiveFilter({ children, className }: ResponsiveFilterProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:flex-wrap md:items-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveFilterItemProps {
  children: ReactNode;
  className?: string;
  fullWidthOnMobile?: boolean;
}

/**
 * 필터 아이템 - 모바일에서 전체 너비, 데스크탑에서 flex-1
 */
export function ResponsiveFilterItem({
  children,
  className,
  fullWidthOnMobile = true,
}: ResponsiveFilterItemProps) {
  return (
    <div
      className={cn(
        fullWidthOnMobile && "w-full",
        "md:flex-1 md:min-w-[200px]",
        className
      )}
    >
      {children}
    </div>
  );
}

