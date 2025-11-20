import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Truck,
  Shield,
  FileText,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Briefcase,
  ClipboardCheck,
  UserCheck,
  Coffee,
  LogOut,
  Wrench,
  AlertTriangle,
  Calendar,
  FileWarning,
  Target
} from "lucide-react";
import { Link } from "wouter";

// 상태별 색상 매핑
const STATUS_COLORS = {
  normal: "bg-green-50 border-green-200",
  warning: "bg-yellow-50 border-yellow-200",
  urgent: "bg-orange-50 border-orange-200",
  critical: "bg-red-50 border-red-200",
  neutral: "bg-gray-50 border-gray-200"
};

const TEXT_COLORS = {
  normal: "text-green-700",
  warning: "text-yellow-700",
  urgent: "text-orange-700",
  critical: "text-red-700",
  neutral: "text-gray-700"
};

// Alert 심각도별 배경색
const ALERT_SEVERITY_STYLES = {
  critical: "bg-red-50 border-red-300 border-l-4",
  urgent: "bg-orange-50 border-orange-300 border-l-4",
  warning: "bg-yellow-50 border-yellow-300 border-l-4"
};

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ElementType;
  status?: 'normal' | 'warning' | 'urgent' | 'critical' | 'neutral';
  percent?: number;
  onClick?: () => void;
}

function StatCard({ label, value, subtext, icon: Icon, status = 'neutral', percent, onClick }: StatCardProps) {
  const cardClass = `${STATUS_COLORS[status]} transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`;
  const textClass = TEXT_COLORS[status];

  return (
    <Card className={cardClass} onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${textClass}`}>{value}</div>
        {percent !== undefined && (
          <div className="text-sm text-muted-foreground mt-1">
            <span className={textClass}>📊 {percent}%</span>
          </div>
        )}
        {subtext && (
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EpEnhancedDashboard() {
  const { data, isLoading, refetch } = trpc.epDashboard.getDashboard.useQuery(
    undefined,
    { refetchInterval: 30000 } // 30초마다 자동 새로고침
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">대시보드 로딩 중...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  // 상태 결정 함수
  const getWorkforceStatus = () => {
    const rate = data.workforce.total > 0
      ? Math.round((data.workforce.working / data.workforce.total) * 100)
      : 0;
    if (rate >= 90) return 'normal';
    if (rate >= 70) return 'warning';
    return 'urgent';
  };

  const getEquipmentStatus = () => {
    const rate = data.equipment.total > 0
      ? Math.round((data.equipment.operating / data.equipment.total) * 100)
      : 0;
    if (rate >= 80) return 'normal';
    if (rate >= 60) return 'warning';
    return 'urgent';
  };

  const getSafetyStatus = () => {
    if (data.safety.passRate >= 95) return 'normal';
    if (data.safety.passRate >= 85) return 'warning';
    return 'urgent';
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EP 통합 대시보드</h1>
          <p className="text-muted-foreground mt-1">
            현장 전체 상황을 한눈에 모니터링하세요
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <Activity className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* ⚠️ Alert Zone - 즉시 조치 필요 */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            ⚠️ 즉시 조치 필요
          </h2>
          {data.alerts.map((alert, index) => (
            <Link key={index} href={alert.actionLink}>
              <div className={`p-4 rounded-lg border ${ALERT_SEVERITY_STYLES[alert.severity]} cursor-pointer hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alert.severity === 'critical' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {alert.severity === 'urgent' && <AlertCircle className="h-5 w-5 text-orange-600" />}
                    {alert.severity === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                    <div>
                      <div className="font-semibold">
                        {alert.severity === 'critical' ? '🔴' : alert.severity === 'urgent' ? '🟡' : '🟠'} {alert.message}: {alert.count}건
                      </div>
                      <div className="text-xs text-muted-foreground">클릭하여 자세히 보기</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    지금 확인하기 →
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ━━━━━━ 인력 관리 ━━━━━━ */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          인력 관리
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="총 작업자"
            value={data.workforce.total}
            icon={Users}
            status="neutral"
            subtext="투입 인원"
          />
          <StatCard
            label="작업 중"
            value={data.workforce.working}
            icon={UserCheck}
            status={getWorkforceStatus()}
            percent={data.workforce.total > 0 ? Math.round((data.workforce.working / data.workforce.total) * 100) : 0}
          />
          <StatCard
            label="출근 완료"
            value={data.workforce.attended || "-"}
            icon={CheckCircle}
            status="neutral"
            subtext="추후 구현"
          />
          <StatCard
            label="휴식 중"
            value={data.workforce.resting || "-"}
            icon={Coffee}
            status="neutral"
            subtext="추후 구현"
          />
          <StatCard
            label="퇴근 완료"
            value={data.workforce.left || "-"}
            icon={LogOut}
            status="neutral"
            subtext="추후 구현"
          />
        </div>
      </div>

      {/* ━━━━━━ 장비 관리 ━━━━━━ */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5" />
          장비 관리
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="총 장비"
            value={`${data.equipment.total}대`}
            icon={Truck}
            status="neutral"
            subtext="등록 장비"
          />
          <StatCard
            label="가동 중"
            value={`${data.equipment.operating}대`}
            icon={Activity}
            status={getEquipmentStatus()}
            percent={data.equipment.total > 0 ? Math.round((data.equipment.operating / data.equipment.total) * 100) : 0}
          />
          <StatCard
            label="유휴 상태"
            value={`${data.equipment.idle}대`}
            icon={Clock}
            status="neutral"
            subtext="대기 중"
          />
          <StatCard
            label="점검 중"
            value={`${data.equipment.maintenance}대`}
            icon={Wrench}
            status="neutral"
            subtext="정기 점검"
          />
          <StatCard
            label="고장/수리"
            value={`${data.equipment.broken}대`}
            icon={AlertTriangle}
            status={data.equipment.broken > 0 ? 'critical' : 'normal'}
            subtext="수리 필요"
          />
        </div>
      </div>

      {/* ━━━━━━ 안전 관리 ━━━━━━ */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          안전 관리
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="오늘 점검 대상"
            value={`${data.safety.todayTargets}대`}
            icon={Target}
            status="neutral"
            subtext="활성 장비"
          />
          <StatCard
            label="점검 완료"
            value={`${data.safety.completed}건`}
            icon={CheckCircle}
            status="normal"
            percent={data.safety.passRate}
          />
          <StatCard
            label="점검 지연"
            value={`${data.safety.delayed}건`}
            icon={Clock}
            status={data.safety.delayed > 5 ? 'critical' : data.safety.delayed > 0 ? 'warning' : 'normal'}
            subtext="미점검 항목"
          />
          <StatCard
            label="이슈 발견"
            value={`${data.safety.issuesFound}건`}
            icon={AlertCircle}
            status={data.safety.issuesFound > 0 ? 'urgent' : 'normal'}
            subtext="조치 필요"
          />
          <StatCard
            label="합격률"
            value={`${data.safety.passRate}%`}
            icon={TrendingUp}
            status={getSafetyStatus()}
            subtext="오늘 기준"
            onClick={() => window.location.href = '/safety-inspection-review'}
          />
        </div>
      </div>

      {/* ━━━━━━ 반입 심사 & 투입 관리 ━━━━━━ */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          반입 심사 & 투입 관리
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="EP 승인 대기"
            value={`${data.entryRequests.pendingApprovals}건`}
            icon={FileText}
            status={data.entryRequests.pendingApprovals > 0 ? 'urgent' : 'normal'}
            subtext="반입 심사"
            onClick={() => window.location.href = '/entry-requests'}
          />
          <StatCard
            label="활성 배치"
            value={`${data.deployment.activeDeployments}건`}
            icon={Activity}
            status="normal"
            subtext="현장 투입 중"
            onClick={() => window.location.href = '/deployments'}
          />
          <StatCard
            label="종료 예정"
            value={`${data.deployment.endingSoon}건`}
            icon={Calendar}
            status={data.deployment.endingSoon > 0 ? 'warning' : 'neutral'}
            subtext="7일 이내"
          />
          <StatCard
            label="연장 신청"
            value={`${data.deployment.extensionRequests}건`}
            icon={FileWarning}
            status={data.deployment.extensionRequests > 0 ? 'warning' : 'neutral'}
            subtext="검토 필요"
          />
          <StatCard
            label="총 투입 인원"
            value={`${data.deployment.totalWorkers}명`}
            icon={Users}
            status="neutral"
            subtext="현재 작업 중"
          />
        </div>
      </div>

      {/* ━━━━━━ 컴플라이언스 ━━━━━━ */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          컴플라이언스
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            label="서류 만료 7일 이내"
            value={`${data.compliance.docsExpiring7Days}건`}
            icon={FileWarning}
            status={data.compliance.docsExpiring7Days >= 5 ? 'critical' : data.compliance.docsExpiring7Days > 0 ? 'urgent' : 'normal'}
            subtext="긴급 갱신 필요"
            onClick={() => window.location.href = '/documents'}
          />
          <StatCard
            label="면허 만료 30일 이내"
            value={`${data.compliance.licenseExpiring30Days}명`}
            icon={AlertCircle}
            status={data.compliance.licenseExpiring30Days > 0 ? 'warning' : 'normal'}
            subtext="갱신 예정"
          />
          <StatCard
            label="보험 만료 예정"
            value={`${data.compliance.insuranceExpiring}건`}
            icon={FileText}
            status={data.compliance.insuranceExpiring > 0 ? 'warning' : 'normal'}
            subtext="갱신 필요"
          />
          <StatCard
            label="서류 승인 대기"
            value={`${data.compliance.docsPendingApproval}건`}
            icon={Clock}
            status={data.compliance.docsPendingApproval > 0 ? 'warning' : 'normal'}
            subtext="검토 대기"
          />
          <StatCard
            label="검사 만료 예정"
            value={`${data.compliance.inspectionExpiring}건`}
            icon={AlertTriangle}
            status={data.compliance.inspectionExpiring > 0 ? 'warning' : 'normal'}
            subtext="검사 필요"
          />
        </div>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/entry-requests">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                반입 요청 관리
              </Button>
            </Link>
            <Link href="/deployments">
              <Button variant="outline" className="w-full">
                <Briefcase className="mr-2 h-4 w-4" />
                투입 현황
              </Button>
            </Link>
            <Link href="/safety-inspection-review">
              <Button variant="outline" className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                안전점검 확인
              </Button>
            </Link>
            <Link href="/statistics">
              <Button variant="outline" className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                상세 통계 보기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
