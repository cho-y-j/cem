import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RotateCcw, Check, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOpenCV } from './useOpenCV';
import { CornerSelector } from './CornerSelector';
import { ImageFilters } from './ImageFilters';
import {
  type Corners,
  type FilterType,
  detectDocumentCorners,
  getDefaultCorners,
  applyPerspectiveTransform,
  applyFilter,
  canvasToDataURL
} from '@/utils/documentScanner';

interface DocumentScannerProps {
  imageSrc: string; // base64 또는 URL
  onComplete: (resultDataUrl: string) => void;
  onCancel: () => void;
}

type Step = 'corners' | 'filter';

export function DocumentScanner({ imageSrc, onComplete, onCancel }: DocumentScannerProps) {
  const { cv, ready, loading, error } = useOpenCV();
  const [step, setStep] = useState<Step>('corners');
  const [corners, setCorners] = useState<Corners | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('original');
  const [processing, setProcessing] = useState(false);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // 이미지 로드 및 초기 모서리 감지
  useEffect(() => {
    if (!ready || !cv) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;

      // 모서리 자동 감지 시도
      const detected = detectDocumentCorners(cv, img);
      if (detected) {
        setCorners(detected);
        toast.success('문서 모서리를 자동으로 감지했습니다.');
      } else {
        // 감지 실패 시 기본 모서리 사용
        setCorners(getDefaultCorners(img.width, img.height));
        toast.info('모서리를 수동으로 조정해주세요.');
      }
    };
    img.src = imageSrc;
  }, [ready, cv, imageSrc]);

  // 자동 감지 다시 시도
  const handleAutoDetect = useCallback(() => {
    if (!cv || !imageRef.current) return;

    const detected = detectDocumentCorners(cv, imageRef.current);
    if (detected) {
      setCorners(detected);
      toast.success('문서 모서리를 감지했습니다.');
    } else {
      toast.error('문서를 감지할 수 없습니다. 수동으로 조정해주세요.');
    }
  }, [cv]);

  // 원근 변환 적용
  const handleApplyTransform = useCallback(() => {
    if (!cv || !imageRef.current || !corners) return;

    setProcessing(true);
    try {
      const canvas = applyPerspectiveTransform(cv, imageRef.current, corners);
      const dataUrl = canvasToDataURL(canvas);
      setTransformedImage(dataUrl);
      setPreviewImage(dataUrl);
      setStep('filter');
      toast.success('원근 보정이 적용되었습니다.');
    } catch (err) {
      console.error('원근 변환 오류:', err);
      toast.error('원근 보정 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  }, [cv, corners]);

  // 필터 적용
  useEffect(() => {
    if (!cv || !transformedImage || step !== 'filter') return;

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = applyFilter(cv, img, selectedFilter);
        setPreviewImage(canvasToDataURL(canvas));
      } catch (err) {
        console.error('필터 적용 오류:', err);
      }
    };
    img.src = transformedImage;
  }, [cv, transformedImage, selectedFilter, step]);

  // 완료
  const handleComplete = useCallback(() => {
    if (previewImage) {
      onComplete(previewImage);
    }
  }, [previewImage, onComplete]);

  // 이전 단계로
  const handleBack = useCallback(() => {
    if (step === 'filter') {
      setStep('corners');
      setTransformedImage(null);
      setPreviewImage(null);
    }
  }, [step]);

  // 로딩 중
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">이미지 처리 엔진 로딩 중...</p>
          <p className="text-sm text-gray-400 mt-2">처음 로드 시 시간이 소요될 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">로딩 실패</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={onCancel}>닫기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OpenCV 준비 안됨
  if (!ready || !corners) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 헤더 */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={step === 'corners' ? onCancel : handleBack}
          className="text-white hover:bg-gray-800"
        >
          <X className="h-5 w-5 mr-1" />
          {step === 'corners' ? '취소' : '이전'}
        </Button>
        <h2 className="text-lg font-semibold">
          {step === 'corners' ? '영역 선택' : '필터 선택'}
        </h2>
        <div className="w-20" /> {/* 균형을 위한 빈 공간 */}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {step === 'corners' ? (
          <>
            {/* 모서리 선택 UI */}
            <div className="mb-4">
              <CornerSelector
                imageSrc={imageSrc}
                corners={corners}
                onCornersChange={setCorners}
                width={Math.min(window.innerWidth - 32, 400)}
                height={Math.min(window.innerHeight - 300, 500)}
              />
            </div>

            <p className="text-gray-400 text-sm text-center mb-4">
              모서리를 드래그하여 문서 영역을 조정하세요
            </p>
          </>
        ) : (
          <>
            {/* 필터 미리보기 */}
            {previewImage && (
              <div className="mb-4 max-w-full overflow-hidden">
                <img
                  src={previewImage}
                  alt="미리보기"
                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="bg-gray-900 p-4 space-y-4">
        {step === 'corners' ? (
          <>
            {/* 자동 감지 버튼 */}
            <Button
              variant="outline"
              onClick={handleAutoDetect}
              className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              자동 감지 다시 시도
            </Button>

            {/* 다음 단계 버튼 */}
            <Button
              onClick={handleApplyTransform}
              disabled={processing}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  영역 확정
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* 필터 선택 */}
            <ImageFilters
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />

            {/* 완료 버튼 */}
            <Button
              onClick={handleComplete}
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              보정 완료
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default DocumentScanner;
