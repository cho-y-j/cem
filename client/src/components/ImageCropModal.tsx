/**
 * 이미지 크롭 및 회전 모달
 *
 * 면허증 이미지를 정규화하기 위한 크롭/회전 UI 제공
 * 회전 시 실제 이미지를 회전시켜 새로운 이미지 생성
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCw, RotateCcw, Check, X, Maximize2 } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
}

// 면허증 비율 (가로:세로 = 85.6mm:54mm ≈ 1.585:1)
const LICENSE_ASPECT_RATIO = 85.6 / 54;

/**
 * 이미지 중앙에 기본 크롭 영역 생성
 */
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

/**
 * 이미지를 90도 회전시킨 base64 반환
 */
function rotateImage(imageSrc: string, degrees: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context 생성 실패'));
        return;
      }

      // 90도 또는 270도 회전 시 width/height 교체
      const isRotated90or270 = Math.abs(degrees % 180) === 90;
      if (isRotated90or270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      // 캔버스 중앙으로 이동 후 회전
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = imageSrc;
  });
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageSrc);
  const [isRotating, setIsRotating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 모달이 열릴 때 원본 이미지로 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentImageSrc(imageSrc);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [isOpen, imageSrc]);

  // 이미지 로드 시 기본 크롭 영역 설정
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, LICENSE_ASPECT_RATIO));
  }, []);

  // 90도 회전 - 실제 이미지를 회전
  const handleRotate = async (direction: 'cw' | 'ccw') => {
    setIsRotating(true);
    try {
      const degrees = direction === 'cw' ? 90 : -90;
      const rotatedImage = await rotateImage(currentImageSrc, degrees);
      setCurrentImageSrc(rotatedImage);
      // 크롭 영역 초기화 (새 이미지에 맞게)
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (error) {
      console.error('[ImageCrop] 회전 실패:', error);
      alert('이미지 회전에 실패했습니다.');
    } finally {
      setIsRotating(false);
    }
  };

  // 크롭된 이미지 생성
  const getCroppedImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current;
      const canvas = canvasRef.current;

      if (!image || !canvas || !completedCrop) {
        reject(new Error('이미지 또는 크롭 영역이 없습니다.'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context를 가져올 수 없습니다.'));
        return;
      }

      // 면허증 표준 출력 크기 (고해상도)
      const outputWidth = 856;
      const outputHeight = 540;

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // 실제 이미지 크기와 표시 크기의 비율 계산
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // 크롭 영역 계산 - 소수점 이하로 인한 잘림 방지를 위해 여유 마진 추가
      const margin = 2; // 픽셀 여유
      const cropX = Math.max(0, (completedCrop.x - margin) * scaleX);
      const cropY = Math.max(0, (completedCrop.y - margin) * scaleY);
      const cropWidth = (completedCrop.width + margin * 2) * scaleX;
      const cropHeight = (completedCrop.height + margin * 2) * scaleY;

      // 이미지 경계를 넘지 않도록 제한
      const finalCropX = Math.max(0, cropX);
      const finalCropY = Math.max(0, cropY);
      const finalCropWidth = Math.min(cropWidth, image.naturalWidth - finalCropX);
      const finalCropHeight = Math.min(cropHeight, image.naturalHeight - finalCropY);

      console.log('[ImageCrop] 크롭 좌표:', {
        display: { x: completedCrop.x, y: completedCrop.y, w: completedCrop.width, h: completedCrop.height },
        scaled: { x: finalCropX.toFixed(0), y: finalCropY.toFixed(0), w: finalCropWidth.toFixed(0), h: finalCropHeight.toFixed(0) },
        scale: { x: scaleX.toFixed(2), y: scaleY.toFixed(2) },
        natural: { w: image.naturalWidth, h: image.naturalHeight },
        displayed: { w: image.width, h: image.height }
      });

      // 최종 이미지 그리기
      ctx.drawImage(
        image,
        finalCropX,
        finalCropY,
        finalCropWidth,
        finalCropHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      // base64로 변환
      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      resolve(base64);
    });
  }, [completedCrop]);

  // 확인 버튼
  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImage();
      onCropComplete(croppedImage);
      onClose();
    } catch (error) {
      console.error('[ImageCrop] 크롭 실패:', error);
      alert('이미지 크롭에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 전체 선택 버튼
  const handleSelectAll = () => {
    if (imgRef.current) {
      setCrop({
        unit: '%',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>면허증 영역 선택</DialogTitle>
          <DialogDescription>
            면허증만 보이도록 영역을 드래그하여 선택하세요. 필요시 회전할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 회전/도구 버튼 */}
        <div className="flex justify-center gap-2 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRotate('ccw')}
            disabled={isRotating}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            왼쪽 회전
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRotate('cw')}
            disabled={isRotating}
          >
            <RotateCw className="h-4 w-4 mr-1" />
            오른쪽 회전
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isRotating}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            전체 선택
          </Button>
        </div>

        {/* 크롭 영역 */}
        <div className="flex justify-center items-center bg-gray-100 rounded-lg p-4 min-h-[300px]">
          {isRotating ? (
            <div className="text-muted-foreground">회전 중...</div>
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={LICENSE_ASPECT_RATIO}
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={currentImageSrc}
                alt="면허증 이미지"
                onLoad={onImageLoad}
                style={{
                  maxHeight: '400px',
                  maxWidth: '100%',
                }}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
        </div>

        {/* 숨겨진 캔버스 (크롭 결과 생성용) */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* 안내 메시지 */}
        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p>파란색 영역을 드래그하여 면허증 위치를 조정하세요</p>
          <p>모서리를 드래그하여 크기를 조절할 수 있습니다</p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing || isRotating}
          >
            <X className="h-4 w-4 mr-1" />
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!completedCrop || isProcessing || isRotating}
          >
            {isProcessing ? (
              '처리 중...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                확인
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
