import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Mail, KeyRound, CheckCircle, XCircle } from "lucide-react";

/**
 * 모바일 로그인 방식 비교 페이지
 * - 현재 PIN 로그인 vs 개선된 이메일 로그인
 */
export default function LoginCompare() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">모바일 로그인 방식 비교</h1>
          <p className="text-muted-foreground">
            두 가지 로그인 방식을 비교하고 테스트해보세요
          </p>
        </div>

        {/* 비교 카드 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 현재 방식: PIN */}
          <Card className="border-2">
            <CardHeader className="bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">현재 방식</CardTitle>
                  <CardDescription>PIN 번호 로그인</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* 장점 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  장점
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                  <li>• 입력이 간단함 (4자리)</li>
                  <li>• 기억하기 쉬움</li>
                </ul>
              </div>

              {/* 단점 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  단점
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                  <li>• ❌ PIN 중복 가능 (같은 PIN 사용 시 충돌)</li>
                  <li>• ❌ 보안 취약 (4자리 숫자 쉽게 추측)</li>
                  <li>• ❌ Worker 구분 불가 (중복 PIN)</li>
                  <li>• ❌ 매번 PIN 입력 필요</li>
                </ul>
              </div>

              {/* 보안 점수 */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">보안 점수</span>
                  <span className="text-red-600 font-bold">⭐⭐ (2/5)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>

              {/* 테스트 버튼 */}
              <Button
                onClick={() => setLocation("/mobile/login")}
                variant="outline"
                className="w-full"
              >
                PIN 로그인 테스트
              </Button>
            </CardContent>
          </Card>

          {/* 개선 방식: 이메일 + 비밀번호 */}
          <Card className="border-2 border-blue-500 shadow-lg">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">개선 방식 ⭐</CardTitle>
                  <CardDescription>이메일 + 비밀번호 + 자동 로그인</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* 장점 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  장점
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                  <li>• ✅ 이메일로 고유 구분 (중복 불가)</li>
                  <li>• ✅ 보안 강화 (이메일 + 비밀번호)</li>
                  <li>• ✅ 한 번만 로그인 → 자동 로그인</li>
                  <li>• ✅ 표준 인증 방식 (업계 표준)</li>
                  <li>• ✅ 데스크톱과 동일한 방식</li>
                </ul>
              </div>

              {/* 단점 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  단점
                </h3>
                <ul className="space-y-1 text-sm text-muted-foreground ml-7">
                  <li>• 첫 로그인 시 이메일 입력 필요</li>
                  <li className="text-xs text-green-600 ml-2">
                    → 하지만 한 번만 입력하면 자동 로그인!
                  </li>
                </ul>
              </div>

              {/* 보안 점수 */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">보안 점수</span>
                  <span className="text-green-600 font-bold">⭐⭐⭐⭐⭐ (5/5)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* 테스트 버튼 */}
              <Button
                onClick={() => setLocation("/mobile/login-new")}
                className="w-full"
              >
                새 로그인 방식 테스트 ⭐
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 비교 표 */}
        <Card>
          <CardHeader>
            <CardTitle>상세 비교</CardTitle>
            <CardDescription>두 방식의 차이점을 자세히 비교해보세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">항목</th>
                    <th className="text-center py-3 px-4 bg-gray-50">현재 (PIN)</th>
                    <th className="text-center py-3 px-4 bg-blue-50">개선 (Email + Password)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">보안</td>
                    <td className="text-center py-3 px-4">❌ 낮음 (4자리)</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 높음</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">중복 가능성</td>
                    <td className="text-center py-3 px-4">❌ 있음</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 없음</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">사용 편의성</td>
                    <td className="text-center py-3 px-4">△ 매번 입력</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 자동 로그인</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">Worker 구분</td>
                    <td className="text-center py-3 px-4">❌ 불가 (중복 시)</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 명확</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">비밀번호 재설정</td>
                    <td className="text-center py-3 px-4">❌ 관리자만</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 본인 가능</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium">다중 기기</td>
                    <td className="text-center py-3 px-4">△ 불편</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 편리</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">표준 방식</td>
                    <td className="text-center py-3 px-4">❌ 비표준</td>
                    <td className="text-center py-3 px-4 text-green-600">✅ 표준</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 추천 */}
        <Card className="border-2 border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900 mb-2">
                  추천: 이메일 + 비밀번호 + 자동 로그인 ⭐
                </h3>
                <p className="text-green-800 mb-4">
                  보안, 사용자 경험, 표준 준수 모든 면에서 우수합니다.
                </p>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>한 번만 로그인하면 다음부터는 자동으로 로그인됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>이메일로 Worker를 명확하게 구분할 수 있습니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>업계 표준 인증 방식으로 보안이 강화됩니다</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 테스트 안내 */}
        <Card>
          <CardHeader>
            <CardTitle>테스트 방법</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-2">1️⃣ PIN 로그인 테스트</h4>
              <p className="text-muted-foreground ml-4">
                • PIN: 1234 입력<br />
                • 문제: 다른 Worker도 1234를 사용하면 충돌!
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2️⃣ 이메일 로그인 테스트</h4>
              <p className="text-muted-foreground ml-4">
                • 이메일: worker@test.com<br />
                • 비밀번호: Test1234!<br />
                • "로그인 유지" 체크<br />
                • 다음부터는 자동 로그인!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}























