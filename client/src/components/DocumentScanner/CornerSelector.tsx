import { useRef, useState, useEffect, useCallback } from 'react';
import { type Corners, type Point } from '@/utils/documentScanner';

interface CornerSelectorProps {
  imageSrc: string;
  corners: Corners;
  onCornersChange: (corners: Corners) => void;
  width?: number;
  height?: number;
}

type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

export function CornerSelector({
  imageSrc,
  corners,
  onCornersChange,
  width = 300,
  height = 400
}: CornerSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<CornerKey | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // 이미지 로드 및 캔버스 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 이미지 비율 유지하며 캔버스에 맞추기
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;

      let drawWidth, drawHeight;
      if (imgRatio > canvasRatio) {
        drawWidth = width;
        drawHeight = width / imgRatio;
      } else {
        drawHeight = height;
        drawWidth = height * imgRatio;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      const scaleX = drawWidth / img.width;
      const scaleY = drawHeight / img.height;
      setScale(Math.min(scaleX, scaleY));
      setImageSize({ width: img.width, height: img.height });

      // 이미지 그리기
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

      // 오버레이 그리기
      drawOverlay(ctx, corners, scaleX, scaleY);
    };
    img.src = imageSrc;
  }, [imageSrc, corners, width, height]);

  // 오버레이 (모서리 포인트 및 연결선) 그리기
  const drawOverlay = (ctx: CanvasRenderingContext2D, c: Corners, scaleX: number, scaleY: number) => {
    const scaledCorners = {
      topLeft: { x: c.topLeft.x * scaleX, y: c.topLeft.y * scaleY },
      topRight: { x: c.topRight.x * scaleX, y: c.topRight.y * scaleY },
      bottomRight: { x: c.bottomRight.x * scaleX, y: c.bottomRight.y * scaleY },
      bottomLeft: { x: c.bottomLeft.x * scaleX, y: c.bottomLeft.y * scaleY }
    };

    // 반투명 영역 외부
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 선택 영역 클리핑 (투명하게)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(scaledCorners.topLeft.x, scaledCorners.topLeft.y);
    ctx.lineTo(scaledCorners.topRight.x, scaledCorners.topRight.y);
    ctx.lineTo(scaledCorners.bottomRight.x, scaledCorners.bottomRight.y);
    ctx.lineTo(scaledCorners.bottomLeft.x, scaledCorners.bottomLeft.y);
    ctx.closePath();
    ctx.clip();

    // 선택 영역 다시 그리기 (투명하게)
    const img = new Image();
    img.src = imageSrc;
    ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();

    // 연결선 그리기
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaledCorners.topLeft.x, scaledCorners.topLeft.y);
    ctx.lineTo(scaledCorners.topRight.x, scaledCorners.topRight.y);
    ctx.lineTo(scaledCorners.bottomRight.x, scaledCorners.bottomRight.y);
    ctx.lineTo(scaledCorners.bottomLeft.x, scaledCorners.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // 모서리 핸들 그리기
    const handleRadius = 12;
    Object.values(scaledCorners).forEach((point) => {
      // 외부 원 (테두리)
      ctx.beginPath();
      ctx.arc(point.x, point.y, handleRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#3B82F6';
      ctx.fill();

      // 내부 원 (흰색)
      ctx.beginPath();
      ctx.arc(point.x, point.y, handleRadius - 3, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    });
  };

  // 터치/마우스 좌표 → 캔버스 좌표
  const getCanvasCoords = useCallback((e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  // 가장 가까운 모서리 찾기
  const findNearestCorner = useCallback((point: Point, c: Corners, scaleX: number, scaleY: number): CornerKey | null => {
    const threshold = 30; // 터치 영역 반경

    const scaledCorners: Record<CornerKey, Point> = {
      topLeft: { x: c.topLeft.x * scaleX, y: c.topLeft.y * scaleY },
      topRight: { x: c.topRight.x * scaleX, y: c.topRight.y * scaleY },
      bottomRight: { x: c.bottomRight.x * scaleX, y: c.bottomRight.y * scaleY },
      bottomLeft: { x: c.bottomLeft.x * scaleX, y: c.bottomLeft.y * scaleY }
    };

    let nearest: CornerKey | null = null;
    let minDist = threshold;

    (Object.keys(scaledCorners) as CornerKey[]).forEach((key) => {
      const corner = scaledCorners[key];
      const dist = Math.sqrt(Math.pow(point.x - corner.x, 2) + Math.pow(point.y - corner.y, 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = key;
      }
    });

    return nearest;
  }, []);

  // 드래그 시작
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas || imageSize.width === 0) return;

    const scaleX = canvas.width / imageSize.width;
    const scaleY = canvas.height / imageSize.height;

    const corner = findNearestCorner(point, corners, scaleX, scaleY);
    if (corner) {
      setDragging(corner);
    }
  }, [corners, getCanvasCoords, findNearestCorner, imageSize]);

  // 드래그 중
  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging) return;
    e.preventDefault();

    const point = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas || imageSize.width === 0) return;

    const scaleX = canvas.width / imageSize.width;
    const scaleY = canvas.height / imageSize.height;

    // 캔버스 좌표 → 원본 이미지 좌표
    const newCorner = {
      x: Math.max(0, Math.min(imageSize.width, point.x / scaleX)),
      y: Math.max(0, Math.min(imageSize.height, point.y / scaleY))
    };

    onCornersChange({
      ...corners,
      [dragging]: newCorner
    });
  }, [dragging, corners, onCornersChange, getCanvasCoords, imageSize]);

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative touch-none select-none"
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-lg"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      />
    </div>
  );
}

export default CornerSelector;
