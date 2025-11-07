import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock, FileQuestion } from "lucide-react";

export type DocumentStatus = "valid" | "warning" | "expired" | "missing" | "pending";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  daysUntilExpiry?: number;
  className?: string;
}

export function DocumentStatusBadge({ status, daysUntilExpiry, className }: DocumentStatusBadgeProps) {
  const statusConfig = {
    valid: {
      label: "정상",
      icon: CheckCircle,
      variant: "default" as const,
      className: "bg-green-500 hover:bg-green-600",
    },
    warning: {
      label: daysUntilExpiry !== undefined ? `만료 예정 (${daysUntilExpiry}일)` : "만료 예정",
      icon: AlertTriangle,
      variant: "default" as const,
      className: "bg-yellow-500 hover:bg-yellow-600",
    },
    expired: {
      label: "만료됨",
      icon: XCircle,
      variant: "destructive" as const,
      className: "",
    },
    missing: {
      label: "서류 누락",
      icon: FileQuestion,
      variant: "destructive" as const,
      className: "",
    },
    pending: {
      label: "승인 대기",
      icon: Clock,
      variant: "secondary" as const,
      className: "",
    },
  };

  const config = statusConfig[status];

  // status가 유효하지 않으면 기본값 사용
  if (!config) {
    console.warn(`[DocumentStatusBadge] Invalid status: ${status}`);
    return (
      <Badge variant="secondary" className={className}>
        <FileQuestion className="w-3 h-3 mr-1" />
        알 수 없음
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ""}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

