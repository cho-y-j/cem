import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { Download, TrendingUp, Activity, FileText } from "lucide-react";
import { useState } from "react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Statistics() {
  const { data: equipmentList } = trpc.equipment.list.useQuery();
  const { data: workersList } = trpc.workers.list.useQuery();
  const { data: docsCompliance } = trpc.docsCompliance.list.useQuery();
  const { data: checkRecords } = trpc.checkRecords.list.useQuery();
  const { data: workJournals } = trpc.workJournal.list.useQuery();

  // 장비 상태별 통계
  const equipmentStatusData = [
    { name: '유휴', value: equipmentList?.filter(e => e.status === 'idle').length || 0, color: '#3b82f6' },
    { name: '운영중', value: equipmentList?.filter(e => e.status === 'operating').length || 0, color: '#10b981' },
    { name: '점검중', value: equipmentList?.filter(e => e.status === 'maintenance').length || 0, color: '#f59e0b' },
  ];

  // 장비 종류별 통계
  const equipmentTypeData: { [key: string]: number } = {};
  equipmentList?.forEach(e => {
    const typeName = e.equipTypeId || '미분류';
    equipmentTypeData[typeName] = (equipmentTypeData[typeName] || 0) + 1;
  });
  const equipmentByType = Object.entries(equipmentTypeData).map(([name, value]) => ({
    name,
    value
  }));

  // 인력 면허 상태 통계
  const workerLicenseData = [
    { name: '유효', value: workersList?.filter(w => w.licenseStatus === 'valid').length || 0, color: '#10b981' },
    { name: '만료', value: workersList?.filter(w => w.licenseStatus === 'expired').length || 0, color: '#ef4444' },
    { name: '미등록', value: workersList?.filter(w => !w.licenseStatus).length || 0, color: '#6b7280' },
  ];

  // 서류 상태 통계
  const docsStatusData = [
    { name: '승인', value: docsCompliance?.filter(d => d.status === 'approved').length || 0, color: '#10b981' },
    { name: '대기', value: docsCompliance?.filter(d => d.status?.includes('pending')).length || 0, color: '#f59e0b' },
    { name: '반려', value: docsCompliance?.filter(d => d.status === 'rejected').length || 0, color: '#ef4444' },
  ];

  // 안전점검 합격률 (최근 30일)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentInspections = checkRecords?.filter(r => 
    new Date(r.inspectionDate) >= thirtyDaysAgo
  ) || [];
  
  const passedInspections = recentInspections.filter(r => r.result === 'pass').length;
  const failedInspections = recentInspections.filter(r => r.result === 'fail').length;
  
  const inspectionData = [
    { name: '합격', value: passedInspections, color: '#10b981' },
    { name: '불합격', value: failedInspections, color: '#ef4444' },
  ];

  // 월별 작업 확인서 통계 (최근 6개월)
  const monthlyWorkJournals: { [key: string]: number } = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  workJournals?.forEach(j => {
    if (j.workDate && new Date(j.workDate) >= sixMonthsAgo) {
      const month = new Date(j.workDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
      monthlyWorkJournals[month] = (monthlyWorkJournals[month] || 0) + 1;
    }
  });
  
  const workJournalTrend = Object.entries(monthlyWorkJournals)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Excel 다운로드 함수
  const downloadExcel = () => {
    // TODO: 실제 Excel 생성 로직 구현
    alert('Excel 다운로드 기능은 준비 중입니다.');
  };

  // PDF 다운로드 함수
  const downloadPDF = () => {
    // TODO: 실제 PDF 생성 로직 구현
    alert('PDF 다운로드 기능은 준비 중입니다.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">통계 및 리포트</h1>
          <p className="text-muted-foreground">
            장비, 인력, 서류, 안전점검 등의 통계를 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel}>
            <Download className="mr-2 h-4 w-4" />
            Excel 다운로드
          </Button>
          <Button variant="outline" onClick={downloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* 주요 지표 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 장비</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipmentList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              운영중 {equipmentStatusData[1].value}대
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 인력</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workersList?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              유효 면허 {workerLicenseData[0].value}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">안전점검 합격률</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentInspections.length > 0 
                ? `${Math.round((passedInspections / recentInspections.length) * 100)}%`
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              최근 30일 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">작업 확인서</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workJournals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              이번 달 {workJournals?.filter(j => {
                const date = new Date(j.workDate);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length || 0}건
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 장비 상태별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>장비 상태별 통계</CardTitle>
            <CardDescription>현재 장비의 상태 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={equipmentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {equipmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 인력 면허 상태 */}
        <Card>
          <CardHeader>
            <CardTitle>인력 면허 상태</CardTitle>
            <CardDescription>면허 유효성 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workerLicenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workerLicenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 장비 종류별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>장비 종류별 통계</CardTitle>
            <CardDescription>장비 종류별 보유 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={equipmentByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 서류 상태 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>서류 상태 통계</CardTitle>
            <CardDescription>서류 승인 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={docsStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {docsStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 안전점검 결과 */}
        <Card>
          <CardHeader>
            <CardTitle>안전점검 결과 (최근 30일)</CardTitle>
            <CardDescription>합격/불합격 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inspectionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {inspectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 월별 작업 확인서 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 작업 확인서 추이</CardTitle>
            <CardDescription>최근 6개월 작업 확인서 제출 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={workJournalTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" name="작업 확인서" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

