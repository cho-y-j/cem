/**
 * 문서 스캔 유틸리티
 * OpenCV.js를 사용한 모서리 감지 및 원근 보정
 */

export interface Point {
  x: number;
  y: number;
}

export interface Corners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

/**
 * 두 점 사이의 거리 계산
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * 4개의 점을 시계 방향으로 정렬 (topLeft, topRight, bottomRight, bottomLeft)
 */
function orderPoints(points: Point[]): Corners {
  // 중심점 계산
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / 4;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / 4;

  // 각 점의 각도 계산 후 정렬
  const sortedByAngle = points
    .map(p => ({
      point: p,
      angle: Math.atan2(p.y - centerY, p.x - centerX)
    }))
    .sort((a, b) => a.angle - b.angle)
    .map(item => item.point);

  // 가장 왼쪽 위 점 찾기
  let topLeftIdx = 0;
  let minSum = Infinity;
  sortedByAngle.forEach((p, i) => {
    const sum = p.x + p.y;
    if (sum < minSum) {
      minSum = sum;
      topLeftIdx = i;
    }
  });

  // topLeft부터 시작하도록 재정렬
  const ordered: Point[] = [];
  for (let i = 0; i < 4; i++) {
    ordered.push(sortedByAngle[(topLeftIdx + i) % 4]);
  }

  return {
    topLeft: ordered[0],
    topRight: ordered[1],
    bottomRight: ordered[2],
    bottomLeft: ordered[3]
  };
}

/**
 * 이미지에서 문서 모서리 자동 감지
 * 여러 전처리 방법을 시도하여 가장 좋은 결과 반환
 */
export function detectDocumentCorners(cv: any, imageSrc: HTMLImageElement | HTMLCanvasElement): Corners | null {
  try {
    // 이미지를 Mat으로 변환
    const src = cv.imread(imageSrc);
    const imgArea = src.rows * src.cols;

    console.log('[DocumentScanner] 이미지 크기:', src.cols, 'x', src.rows);

    // 여러 방법으로 시도
    const methods = [
      { cannyLow: 30, cannyHigh: 100, blur: 5, approxEpsilon: 0.02 },
      { cannyLow: 50, cannyHigh: 150, blur: 5, approxEpsilon: 0.02 },
      { cannyLow: 20, cannyHigh: 80, blur: 7, approxEpsilon: 0.03 },
      { cannyLow: 75, cannyHigh: 200, blur: 5, approxEpsilon: 0.02 },
      { cannyLow: 10, cannyHigh: 50, blur: 9, approxEpsilon: 0.04 },
    ];

    let bestCorners: Point[] | null = null;
    let bestArea = 0;

    for (const method of methods) {
      const result = tryDetectCorners(cv, src, method, imgArea);
      if (result && result.area > bestArea) {
        bestArea = result.area;
        bestCorners = result.corners;
        console.log('[DocumentScanner] 방법 성공:', method, '면적:', result.area);
      }
    }

    // 메모리 해제
    src.delete();

    if (bestCorners && bestCorners.length === 4) {
      console.log('[DocumentScanner] 문서 감지 성공');
      return orderPoints(bestCorners);
    }

    console.log('[DocumentScanner] 문서 감지 실패, 기본 모서리 사용');
    return null;
  } catch (error) {
    console.error('[DocumentScanner] 모서리 감지 오류:', error);
    return null;
  }
}

/**
 * 주어진 파라미터로 모서리 감지 시도
 */
function tryDetectCorners(
  cv: any,
  src: any,
  params: { cannyLow: number; cannyHigh: number; blur: number; approxEpsilon: number },
  imgArea: number
): { corners: Point[]; area: number } | null {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    // 1. 그레이스케일 변환
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. 가우시안 블러 (노이즈 제거)
    cv.GaussianBlur(gray, blurred, new cv.Size(params.blur, params.blur), 0);

    // 3. Canny 엣지 감지 (더 낮은 threshold로 더 많은 엣지 감지)
    cv.Canny(blurred, edges, params.cannyLow, params.cannyHigh);

    // 4. 팽창 (엣지 연결) - 더 큰 커널
    const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.dilate(edges, edges, kernel);
    kernel.delete();

    // 5. 컨투어 찾기
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // 6. 가장 큰 사각형 컨투어 찾기
    let maxArea = 0;
    let docCorners: Point[] | null = null;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      // 이미지 면적의 5% 이상인 컨투어만 고려 (더 작은 문서도 감지)
      if (area < imgArea * 0.05) continue;

      // 컨투어 근사화
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, params.approxEpsilon * peri, true);

      // 4개의 꼭지점을 가진 컨투어 (사각형)
      if (approx.rows === 4 && area > maxArea) {
        // 볼록한 사각형인지 확인
        if (cv.isContourConvex(approx)) {
          maxArea = area;
          docCorners = [];
          for (let j = 0; j < 4; j++) {
            docCorners.push({
              x: approx.data32S[j * 2],
              y: approx.data32S[j * 2 + 1]
            });
          }
        }
      }

      approx.delete();
    }

    // 메모리 해제
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();

    if (docCorners && docCorners.length === 4) {
      return { corners: docCorners, area: maxArea };
    }

    return null;
  } catch (error) {
    // 메모리 해제
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    return null;
  }
}

/**
 * 기본 모서리 반환 (거의 전체 영역 - 2% 여백)
 */
export function getDefaultCorners(width: number, height: number, padding = 0.02): Corners {
  const padX = width * padding;
  const padY = height * padding;

  return {
    topLeft: { x: padX, y: padY },
    topRight: { x: width - padX, y: padY },
    bottomRight: { x: width - padX, y: height - padY },
    bottomLeft: { x: padX, y: height - padY }
  };
}

/**
 * 원근 변환 적용 (마름모 → 직사각형)
 */
export function applyPerspectiveTransform(
  cv: any,
  imageSrc: HTMLImageElement | HTMLCanvasElement,
  corners: Corners
): HTMLCanvasElement {
  const src = cv.imread(imageSrc);

  // 결과 이미지 크기 계산
  const widthTop = distance(corners.topLeft, corners.topRight);
  const widthBottom = distance(corners.bottomLeft, corners.bottomRight);
  const heightLeft = distance(corners.topLeft, corners.bottomLeft);
  const heightRight = distance(corners.topRight, corners.bottomRight);

  const maxWidth = Math.max(widthTop, widthBottom);
  const maxHeight = Math.max(heightLeft, heightRight);

  // 소스 포인트 (원본 이미지의 4개 모서리)
  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners.topLeft.x, corners.topLeft.y,
    corners.topRight.x, corners.topRight.y,
    corners.bottomRight.x, corners.bottomRight.y,
    corners.bottomLeft.x, corners.bottomLeft.y
  ]);

  // 목적지 포인트 (직사각형)
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    maxWidth, 0,
    maxWidth, maxHeight,
    0, maxHeight
  ]);

  // 변환 매트릭스 계산
  const M = cv.getPerspectiveTransform(srcPoints, dstPoints);

  // 원근 변환 적용
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight));

  // 결과를 캔버스로 변환
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = maxHeight;
  cv.imshow(canvas, dst);

  // 메모리 해제
  src.delete();
  dst.delete();
  srcPoints.delete();
  dstPoints.delete();
  M.delete();

  return canvas;
}

/**
 * 이미지 필터 타입
 */
export type FilterType = 'original' | 'grayscale' | 'document' | 'enhanced';

/**
 * 이미지에 필터 적용
 */
export function applyFilter(
  cv: any,
  imageSrc: HTMLImageElement | HTMLCanvasElement,
  filterType: FilterType
): HTMLCanvasElement {
  const src = cv.imread(imageSrc);
  const dst = new cv.Mat();

  switch (filterType) {
    case 'grayscale':
      // 흑백 변환
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
      cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
      break;

    case 'document':
      // 문서 모드: 고대비 흑백 (적응형 이진화)
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
      cv.adaptiveThreshold(
        dst, dst, 255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        21, 10
      );
      cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
      break;

    case 'enhanced':
      // 선명하게: 대비 증가 + 샤프닝
      src.copyTo(dst);

      // 대비 증가
      dst.convertTo(dst, -1, 1.2, 10);

      // 샤프닝 커널
      const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ]);
      cv.filter2D(dst, dst, cv.CV_8U, kernel);
      kernel.delete();
      break;

    case 'original':
    default:
      src.copyTo(dst);
      break;
  }

  // 결과를 캔버스로 변환
  const canvas = document.createElement('canvas');
  canvas.width = src.cols;
  canvas.height = src.rows;
  cv.imshow(canvas, dst);

  // 메모리 해제
  src.delete();
  dst.delete();

  return canvas;
}

/**
 * 밝기 및 대비 조정
 */
export function adjustBrightnessContrast(
  cv: any,
  imageSrc: HTMLImageElement | HTMLCanvasElement,
  brightness: number = 0, // -100 ~ 100
  contrast: number = 0    // -100 ~ 100
): HTMLCanvasElement {
  const src = cv.imread(imageSrc);
  const dst = new cv.Mat();

  // 알파 (대비): 0.5 ~ 1.5 범위로 변환
  const alpha = 1 + contrast / 100;
  // 베타 (밝기): -100 ~ 100
  const beta = brightness;

  src.convertTo(dst, -1, alpha, beta);

  // 결과를 캔버스로 변환
  const canvas = document.createElement('canvas');
  canvas.width = src.cols;
  canvas.height = src.rows;
  cv.imshow(canvas, dst);

  // 메모리 해제
  src.delete();
  dst.delete();

  return canvas;
}

/**
 * 캔버스를 Blob으로 변환
 */
export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('캔버스를 Blob으로 변환할 수 없습니다.'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * 캔버스를 Data URL로 변환
 */
export function canvasToDataURL(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9): string {
  return canvas.toDataURL(type, quality);
}
