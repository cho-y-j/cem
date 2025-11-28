import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  AlertTriangle,
  Calendar,
  FileWarning,
  Target
} from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// 색상 팔레트
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  gray: '#6b7280'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Alert 심각도별 배경색
const ALERT_SEVERITY_STYLES = {
  critical: "bg-red-50 border-red-300 border-l-4",
  urgent: "bg-orange-50 border-orange-300 border-l-4",
  warning: "bg-yellow-50 border-yellow-300 border-l-4"
};

// 원형 프로그레스 컴포넌트
function CircularProgress({ percent, size = 160, strokeWidth = 12, label }: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  const getColor = () => {
    if (percent >= 95) return COLORS.success;
    if (percent >= 85) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: getColor() }}>
            {percent}%
          </span>
          {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
        </div>
      </div>
    </div>
  );
}

// 큰 통계 카드
function BigStatCard({
  label,
  value,
  subItems,
  icon: Icon,
  color = COLORS.primary
}: {
  label: string;
  value: number | string;
  subItems?: { label: string; value: number | string; color?: string }[];
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-5 w-5" style={{ color }} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-bold mb-4" style={{ color }}>
          {value}
        </div>
        {subItems && subItems.length > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            {subItems.map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="text-2xl font-semibold" style={{ color: item.color || COLORS.gray }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 미니 통계 카드
function MiniStatCard({
  label,
  value,
  icon: Icon,
  status = 'neutral',
  onClick
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
}) {
  const statusColors = {
    success: COLORS.success,
    warning: COLORS.warning,
    danger: COLORS.danger,
    neutral: COLORS.gray
  };

  return (
    <Card
      className={`hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold" style={{ color: statusColors[status] }}>
              {value}
            </p>
          </div>
          <Icon className="h-10 w-10 opacity-20" style={{ color: statusColors[status] }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EpEnhancedDashboard() {
  const { data, isLoading, refetch } = trpc.epDashboard.getDashboard.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // 긴급 알림 조회 (5초마다 자동 갱신)
  const { data: emergencyAlerts } = trpc.emergency.list.useQuery(
    { status: "active" },
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  const activeEmergencies = emergencyAlerts?.filter((a: any) => a.status === "active") || [];

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

  // 차트 데이터 준비 (임시 - 추후 실제 데이터로 교체)
  const trendData = [
    { date: '08/12', target: 100, completed: 97 },
    { date: '08/13', target: 100, completed: 89 },
    { date: '08/14', target: 100, completed: 95 },
    { date: '08/15', target: 100, completed: 91 },
    { date: '08/16', target: 100, completed: 98 },
    { date: '08/17', target: 100, completed: 94 },
    { date: '08/18', target: 100, completed: data.safety.passRate },
  ];

  const deploymentStatusData = [
    { name: '활성', value: data.deployment.activeDeployments, color: COLORS.success },
    { name: '종료예정', value: data.deployment.endingSoon, color: COLORS.warning },
    { name: '연장신청', value: data.deployment.extensionRequests, color: COLORS.info },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EP 통합 현장 상황판</h1>
          <p className="text-muted-foreground mt-1">
            실시간 현장 모니터링 및 관리
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeEmergencies.length > 0 && (
            <Link href="/emergency-alerts">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-2 border-red-500 rounded-lg animate-pulse cursor-pointer hover:bg-red-200 transition-colors">
                <AlertTriangle className="h-5 w-5 text-red-600 animate-bounce" />
                <span className="font-bold text-red-700">
                  긴급 상황 {activeEmergencies.length}건
                </span>
              </div>
            </Link>
          )}
          <Button variant="outline" onClick={() => refetch()}>
            <Activity className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 🚨 긴급 알림 섹션 */}
      {activeEmergencies.length > 0 && (
        <Card className="border-red-500 border-2 bg-red-50 shadow-lg">
          <CardHeader className="bg-red-100">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              🚨 긴급 상황 발생 - 즉시 확인 필요
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {activeEmergencies.slice(0, 3).map((alert: any) => (
                <Link key={alert.id} href="/emergency-alerts">
                  <div className="p-4 bg-white rounded-lg border-l-4 border-red-500 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                            {alert.alert_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(alert.created_at).toLocaleString("ko-KR")}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          작업자: {alert.workers?.name || "Unknown"}
                        </p>
                        {alert.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {alert.description}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="destructive">
                        확인 →
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
              {activeEmergencies.length > 3 && (
                <Link href="/emergency-alerts">
                  <div className="text-center py-2 text-sm text-red-600 font-semibold hover:underline cursor-pointer">
                    외 {activeEmergencies.length - 3}건 더 보기 →
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ⚠️ Alert Zone */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            즉시 조치 필요
          </h2>
          <div className="grid gap-2">
            {data.alerts.map((alert, index) => (
              <Link key={index} href={alert.actionLink}>
                <div className={`p-4 rounded-lg border ${ALERT_SEVERITY_STYLES[alert.severity]} cursor-pointer hover:shadow-md transition-shadow`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">
                          {alert.severity === 'critical' ? '🔴' : alert.severity === 'urgent' ? '🟠' : '🟡'} {alert.message}: {alert.count}건
                        </div>
                        <div className="text-xs text-muted-foreground">클릭하여 자세히 보기</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      지금 확인 →
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 첫 번째 행: 주요 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 투입 인력 현황 */}
        <BigStatCard
          label="투입 인력 현황"
          value={data.workforce.total}
          icon={Users}
          color={COLORS.primary}
          subItems={[
            { label: "작업중", value: data.workforce.working, color: COLORS.success },
            { label: "대기", value: data.workforce.total - data.workforce.working, color: COLORS.gray },
            { label: "총 인원", value: data.workforce.total, color: COLORS.primary }
          ]}
        />

        {/* 투입 장비 현황 */}
        <BigStatCard
          label="투입 장비 현황"
          value={`${data.equipment.total}대`}
          icon={Truck}
          color={COLORS.info}
          subItems={[
            { label: "가동중", value: `${data.equipment.operating}대`, color: COLORS.success },
            { label: "유휴", value: `${data.equipment.idle}대`, color: COLORS.gray },
            { label: "고장", value: `${data.equipment.broken}대`, color: COLORS.danger }
          ]}
        />

        {/* 안전 점검 현황 */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: COLORS.success }} />
              안전 점검 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CircularProgress
              percent={data.safety.passRate}
              label="합격률"
            />
          </CardContent>
        </Card>
      </div>

      {/* 두 번째 행: 세부 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard
          label="오늘 점검 대상"
          value={`${data.safety.todayTargets}대`}
          icon={Target}
          status="neutral"
        />
        <MiniStatCard
          label="점검 완료"
          value={`${data.safety.completed}건`}
          icon={CheckCircle}
          status="success"
        />
        <MiniStatCard
          label="점검 지연"
          value={`${data.safety.delayed}건`}
          icon={Clock}
          status={data.safety.delayed > 5 ? 'danger' : data.safety.delayed > 0 ? 'warning' : 'success'}
        />
        <MiniStatCard
          label="이슈 발견"
          value={`${data.safety.issuesFound}건`}
          icon={AlertCircle}
          status={data.safety.issuesFound > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* 세 번째 행: 트렌드 차트 + 반입/투입 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 안전점검 트렌드 (2칸) */}
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              안전점검 추이 (최근 7일)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="target" name="목표" fill={COLORS.gray} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="완료" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 반입/투입 현황 (1칸) */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              반입 심사 & 투입 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">EP 승인 대기</span>
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {data.entryRequests.pendingApprovals}건
              </div>
              <Link href="/entry-requests">
                <Button size="sm" variant="outline" className="w-full mt-3">
                  지금 확인 →
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm">활성 배치</span>
                <span className="text-xl font-bold text-green-600">
                  {data.deployment.activeDeployments}건
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm">종료 예정 (7일)</span>
                <span className="text-xl font-bold text-yellow-600">
                  {data.deployment.endingSoon}건
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm">연장 신청</span>
                <span className="text-xl font-bold text-blue-600">
                  {data.deployment.extensionRequests}건
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 네 번째 행: 컴플라이언스 */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            컴플라이언스 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className={`p-4 rounded-lg text-center ${
              data.compliance.docsExpiring7Days >= 5 ? 'bg-red-50 border border-red-200' :
              data.compliance.docsExpiring7Days > 0 ? 'bg-orange-50 border border-orange-200' :
              'bg-green-50 border border-green-200'
            }`}>
              <div className="text-xs text-muted-foreground mb-2">서류 만료 (7일 이내)</div>
              <div className={`text-3xl font-bold ${
                data.compliance.docsExpiring7Days >= 5 ? 'text-red-600' :
                data.compliance.docsExpiring7Days > 0 ? 'text-orange-600' :
                'text-green-600'
              }`}>
                {data.compliance.docsExpiring7Days}
              </div>
              {data.compliance.docsExpiring7Days > 0 && (
                <Link href="/expiring-documents">
                  <Button size="sm" variant="ghost" className="mt-2 text-xs">
                    확인 →
                  </Button>
                </Link>
              )}
            </div>

            <div className={`p-4 rounded-lg text-center ${
              data.compliance.licenseExpiring30Days > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="text-xs text-muted-foreground mb-2">면허 만료 (30일)</div>
              <div className={`text-3xl font-bold ${
                data.compliance.licenseExpiring30Days > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {data.compliance.licenseExpiring30Days}
              </div>
            </div>

            <div className={`p-4 rounded-lg text-center ${
              data.compliance.insuranceExpiring > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="text-xs text-muted-foreground mb-2">보험 만료 예정</div>
              <div className={`text-3xl font-bold ${
                data.compliance.insuranceExpiring > 0 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {data.compliance.insuranceExpiring}
              </div>
            </div>

            <div className={`p-4 rounded-lg text-center ${
              data.compliance.docsPendingApproval > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="text-xs text-muted-foreground mb-2">서류 승인 대기</div>
              <div className={`text-3xl font-bold ${
                data.compliance.docsPendingApproval > 0 ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {data.compliance.docsPendingApproval}
              </div>
            </div>

            <div className={`p-4 rounded-lg text-center ${
              data.compliance.inspectionExpiring > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="text-xs text-muted-foreground mb-2">검사 만료 예정</div>
              <div className={`text-3xl font-bold ${
                data.compliance.inspectionExpiring > 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {data.compliance.inspectionExpiring}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Link href="/entry-requests">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-sm">반입 요청 관리</span>
              </Button>
            </Link>
            <Link href="/deployments">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Briefcase className="h-6 w-6" />
                <span className="text-sm">투입 현황</span>
              </Button>
            </Link>
            <Link href="/safety-inspection-review">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Shield className="h-6 w-6" />
                <span className="text-sm">안전점검 확인</span>
              </Button>
            </Link>
            <Link href="/statistics">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm">상세 통계</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
