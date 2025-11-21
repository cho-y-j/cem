import EpEnhancedDashboard from "./EpEnhancedDashboard";

interface BpEpDashboardProps {
  role: "bp" | "ep";
}

export default function BpEpDashboard({ role }: BpEpDashboardProps) {
  // EP와 BP 모두 통합 대시보드 사용 (역할별 필터링은 서버에서 처리)
  return <EpEnhancedDashboard />;
}
