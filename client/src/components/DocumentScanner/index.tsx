import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">이미지 처리 엔진 로딩 중...</p>
          <p className="text-sm text-gray-400 mt-2">처음 로드 시 시간이 소요될 수 있습니다.</p>
        </div>
      </div>,
      document.body
    );
  }

  // 에러
  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">로딩 실패</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={onCancel}>닫기</Button>
          </CardContent>
        </Card>
      </div>,
      document.body
    );
  }

  // OpenCV 준비 안됨
  if (!ready || !corners) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>,
      document.body
    );
  }

  // 화면 높이 계산 (헤더 56px + 하단 버튼 약 180px 제외)
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 240 : 400;
  const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 32 : 360;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* 헤더 - 높이 고정 */}
      <div className="flex-shrink-0 bg-gray-900 text-white p-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            step === 'corners' ? onCancel() : handleBack();
          }}
          className="text-white hover:bg-gray-800"
        >
          <X className="h-5 w-5 mr-1" />
          {step === 'corners' ? '취소' : '이전'}
        </Button>
        <h2 className="text-base font-semibold">
          {step === 'corners' ? '영역 선택' : '필터 선택'}
        </h2>
        <div className="w-16" />
      </div>

      {/* 메인 콘텐츠 - 스크롤 없이 화면에 맞춤 */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden">
        {step === 'corners' ? (
          <>
            {/* 모서리 선택 UI - 화면에 맞게 크기 조절 */}
            <div className="flex-shrink-0">
              <CornerSelector
                imageSrc={imageSrc}
                corners={corners}
                onCornersChange={setCorners}
                width={Math.min(availableWidth, 360)}
                height={Math.min(availableHeight, 400)}
              />
            </div>
            <p className="text-gray-400 text-xs text-center mt-2">
              모서리를 드래그하여 조정
            </p>
          </>
        ) : (
          <>
            {/* 필터 미리보기 - 화면에 맞게 */}
            {previewImage && (
              <div className="flex-shrink-0 max-w-full">
                <img
                  src={previewImage}
                  alt="미리보기"
                  className="object-contain rounded-lg shadow-lg"
                  style={{ maxHeight: availableHeight, maxWidth: availableWidth }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 컨트롤 - 항상 보이도록 고정 */}
      <div className="flex-shrink-0 bg-gray-900 p-3 space-y-2 safe-area-bottom">
        {step === 'corners' ? (
          <>
            {/* 자동 감지 + 확정 버튼을 한 줄에 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAutoDetect();
                }}
                className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                자동감지
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleApplyTransform();
                }}
                disabled={processing}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    영역 확정
                  </>
                )}
              </Button>
            </div>
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
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleComplete();
              }}
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
            >
              <Check className="h-5 w-5 mr-2" />
              보정 완료
            </Button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default DocumentScanner;
