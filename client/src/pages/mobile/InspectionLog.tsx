import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft,
  Check,
  AlertCircle,
  PenTool
} from "lucide-react";
import { useLocation } from "wouter";
import SignatureCanvas from "react-signature-canvas";

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
  note: string;
}

export default function InspectionLog() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    { id: "1", label: "엔진 오일 점검", checked: false, note: "" },
    { id: "2", label: "냉각수 점검", checked: false, note: "" },
    { id: "3", label: "유압유 점검", checked: false, note: "" },
    { id: "4", label: "타이어/궤도 상태", checked: false, note: "" },
    { id: "5", label: "브레이크 작동", checked: false, note: "" },
    { id: "6", label: "조명 및 경광등", checked: false, note: "" },
    { id: "7", label: "안전벨트 및 안전장치", checked: false, note: "" },
    { id: "8", label: "작업 장치 작동", checked: false, note: "" },
  ]);
  const [remarks, setRemarks] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleCheckChange = (id: string, checked: boolean) => {
    setCheckItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked } : item
      )
    );
  };

  const handleNoteChange = (id: string, note: string) => {
    setCheckItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, note } : item
      )
    );
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignatureData("");
  };

  const saveSignature = () => {
    if (signatureRef.current?.isEmpty()) {
      alert('서명을 작성해주세요.');
      return;
    }
    const data = signatureRef.current?.toDataURL();
    setSignatureData(data || "");
    setShowSignature(false);
  };

  const handleSubmit = async () => {
    const uncheckedItems = checkItems.filter(item => !item.checked);
    if (uncheckedItems.length > 0) {
      const confirm = window.confirm(
        `${uncheckedItems.length}개 항목이 미체크되었습니다. 계속하시겠습니까?`
      );
      if (!confirm) return;
    }

    if (!signatureData) {
      alert('서명을 작성해주세요.');
      setShowSignature(true);
      return;
    }

    setSubmitting(true);

    try {
      // TODO: 실제 제출 로직 구현
      console.log('[점검 일지 제출]', {
        checkItems,
        remarks,
        signature: signatureData,
        userId: user?.id,
        timestamp: new Date(),
      });

      // 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert('점검 일지가 성공적으로 제출되었습니다!');
      setLocation('/mobile/worker');
    } catch (error) {
      console.error('[제출 오류]', error);
      alert('제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkedCount = checkItems.filter(item => item.checked).length;
  const totalCount = checkItems.length;
  const progress = (checkedCount / totalCount) * 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-green-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-700"
            onClick={() => setLocation('/mobile/worker')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">점검 일지</h1>
            <p className="text-sm text-green-100">일일 안전 점검</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 진행률 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">점검 진행률</span>
              <span className="text-sm font-bold text-green-600">
                {checkedCount}/{totalCount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 점검 항목 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">점검 항목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={(checked) =>
                      handleCheckChange(item.id, checked as boolean)
                    }
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={item.id}
                    className={`text-base flex-1 ${
                      item.checked ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {item.label}
                  </Label>
                </div>
                {item.checked && (
                  <Input
                    placeholder="특이사항 (선택)"
                    value={item.note}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    className="ml-8"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 종합 의견 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">종합 의견</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="전체 점검 결과에 대한 종합 의견을 입력하세요"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* 서명 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              점검자 서명
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showSignature && !signatureData && (
              <Button
                onClick={() => setShowSignature(true)}
                variant="outline"
                className="w-full h-32 border-dashed border-2"
              >
                <div className="text-center">
                  <PenTool className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">서명하기</p>
                </div>
              </Button>
            )}

            {showSignature && (
              <div className="space-y-2">
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: 'w-full h-48',
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={clearSignature}
                    variant="outline"
                    className="flex-1"
                  >
                    지우기
                  </Button>
                  <Button
                    onClick={saveSignature}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    저장
                  </Button>
                </div>
              </div>
            )}

            {signatureData && !showSignature && (
              <div className="space-y-2">
                <div className="border-2 border-green-500 rounded-lg overflow-hidden bg-white p-2">
                  <img src={signatureData} alt="Signature" className="w-full h-32 object-contain" />
                </div>
                <Button
                  onClick={() => setShowSignature(true)}
                  variant="outline"
                  className="w-full"
                >
                  다시 서명하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 사항 */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                <p className="font-medium mb-1">점검 안내</p>
                <ul className="space-y-1 text-orange-700">
                  <li>• 모든 항목을 꼼꼼히 점검해주세요</li>
                  <li>• 이상이 있는 경우 특이사항을 반드시 기록하세요</li>
                  <li>• 점검 완료 후 서명이 필요합니다</li>
                  <li>• 제출 후에는 수정할 수 없습니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
        >
          {submitting ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              제출 중...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              점검 일지 제출
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

