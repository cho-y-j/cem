/**
 * 면허증 이미지 정규화 유틸리티 (OpenCV.js 사용)
 * 
 * 면허증 이미지를 정확한 사이즈로 보정하고 배경을 제거합니다.
 * - 면허증 모서리 감지
 * - Perspective transform
 * - 회전 보정
 * - 크기 보정
 * - 배경 제거
 */

declare global {
  interface Window {
    cv: any;
  }
}

/**
 * OpenCV.js가 로드되었는지 확인
 */
function waitForOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있으면 즉시 반환
    if (window.cv && window.cv.Mat) {
      resolve();
      return;
    }

    // OpenCV.js가 스크립트 태그로 로드되는 경우를 대비
    const existingScript = document.querySelector('script[src*="opencv.js"]');
    
    if (existingScript) {
      // 이미 스크립트가 있으면 로드 대기만 함
      const checkInterval = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkInterval);
          console.log('[OpenCV] OpenCV.js 로드 완료');
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('OpenCV.js 로드 타임아웃'));
      }, 15000);
    } else {
      // 스크립트가 없으면 동적으로 로드
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.x/opencv.js';
      script.async = true;
      script.type = 'text/javascript';
      
      script.onload = () => {
        // OpenCV.js는 로드 후 cv 객체를 전역에 설정
        const checkInterval = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            clearInterval(checkInterval);
            console.log('[OpenCV] OpenCV.js 로드 완료');
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('OpenCV.js 로드 타임아웃'));
        }, 15000);
      };
      
      script.onerror = () => {
        reject(new Error('OpenCV.js 스크립트 로드 실패'));
      };
      
      document.head.appendChild(script);
    }
  });
}

/**
 * 면허증의 4개 모서리 찾기 (개선된 버전)
 */
function findLicenseCorners(src: any): any[] | null {
  const cv = window.cv;
  
  try {
    // 그레이스케일 변환
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // 적응형 임계값 처리 (더 나은 엣지 감지)
    const thresh = new cv.Mat();
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    
    // 가우시안 블러
    const blurred = new cv.Mat();
    cv.GaussianBlur(thresh, blurred, new cv.Size(5, 5), 0);
    
    // Canny 엣지 감지 (더 민감하게)
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 30, 100);
    
    // 모폴로지 연산 (노이즈 제거 및 연결)
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
    const dilated = new cv.Mat();
    cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 2);
    cv.erode(dilated, dilated, kernel, new cv.Point(-1, -1), 1);
    
    // 컨투어 찾기
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    // 가장 큰 컨투어 찾기 (면허증일 가능성 높음)
    let maxArea = 0;
    let maxContour = null;
    const minArea = src.rows * src.cols * 0.05; // 최소 5% 이상
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      
      if (area > maxArea && area > minArea) {
        maxArea = area;
        maxContour = contour;
      }
    }
    
    if (!maxContour) {
      gray.delete();
      thresh.delete();
      blurred.delete();
      edges.delete();
      dilated.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
      return null;
    }
    
    // 컨투어를 근사화하여 모서리 찾기 (여러 epsilon 시도)
    let corners: any[] | null = null;
    
    for (let epsilonRatio = 0.01; epsilonRatio <= 0.05; epsilonRatio += 0.01) {
      const epsilon = epsilonRatio * cv.arcLength(maxContour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(maxContour, approx, epsilon, true);
      
      if (approx.rows === 4) {
        // 4개 모서리 찾음
        corners = [];
        const data = new Int32Array(approx.data32S);
        for (let i = 0; i < 4; i++) {
          corners.push({
            x: data[i * 2],
            y: data[i * 2 + 1]
          });
        }
        approx.delete();
        break;
      }
      approx.delete();
    }
    
    // 메모리 정리
    gray.delete();
    thresh.delete();
    blurred.delete();
    edges.delete();
    dilated.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    
    return corners;
  } catch (error) {
    console.error('[OpenCV] 모서리 찾기 실패:', error);
    return null;
  }
}

/**
 * 모서리를 정렬 (좌상, 우상, 우하, 좌하 순서)
 */
function orderPoints(pts: any[]): any[] {
  // x+y가 가장 작은 점 = 좌상
  // x+y가 가장 큰 점 = 우하
  // x-y가 가장 작은 점 = 우상
  // x-y가 가장 큰 점 = 좌하
  
  const sum = pts.map(p => p.x + p.y);
  const diff = pts.map(p => p.x - p.y);
  
  const topLeft = pts[sum.indexOf(Math.min(...sum))];
  const bottomRight = pts[sum.indexOf(Math.max(...sum))];
  const topRight = pts[diff.indexOf(Math.min(...diff))];
  const bottomLeft = pts[diff.indexOf(Math.max(...diff))];
  
  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Perspective transform 적용
 */
function applyPerspectiveTransform(src: any, corners: any[]): any {
  const cv = window.cv;
  
  // 면허증 표준 크기 (실제 면허증 비율: 약 85.6mm x 54mm = 1.585:1)
  const standardWidth = 856;
  const standardHeight = 540;
  
  // 모서리 정렬
  const orderedCorners = orderPoints(corners);
  
  // 소스 포인트 (원본 이미지의 모서리)
  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    orderedCorners[0].x, orderedCorners[0].y,
    orderedCorners[1].x, orderedCorners[1].y,
    orderedCorners[2].x, orderedCorners[2].y,
    orderedCorners[3].x, orderedCorners[3].y,
  ]);
  
  // 대상 포인트 (정규화된 이미지의 모서리)
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    standardWidth, 0,
    standardWidth, standardHeight,
    0, standardHeight,
  ]);
  
  // Perspective transform 행렬 계산
  const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
  
  // 변환 적용
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(standardWidth, standardHeight));
  
  // 메모리 정리
  srcPoints.delete();
  dstPoints.delete();
  M.delete();
  
  return dst;
}

/**
 * OpenCV Mat를 base64 이미지로 변환
 */
function matToBase64(mat: any): string {
  const cv = window.cv;
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  // Mat를 ImageData로 변환
  const imageData = ctx.createImageData(mat.cols, mat.rows);
  const data = new Uint8ClampedArray(mat.data);
  
  // RGBA 변환 (OpenCV는 BGR 순서)
  for (let i = 0; i < data.length; i += 4) {
    imageData.data[i] = data[i + 2];     // R
    imageData.data[i + 1] = data[i + 1]; // G
    imageData.data[i + 2] = data[i];     // B
    imageData.data[i + 3] = data[i + 3]; // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * 면허증 이미지를 정규화 (OpenCV.js 사용)
 * @param file 원본 이미지 파일
 * @returns 정규화된 이미지 (base64)
 */
export async function normalizeLicenseImage(file: File): Promise<string> {
  // OpenCV.js 로드 대기
  await waitForOpenCV();
  
  const cv = window.cv;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        try {
          // 이미지를 OpenCV Mat로 변환
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const src = cv.matFromImageData(imageData);
          
          // 면허증 모서리 찾기
          const corners = findLicenseCorners(src);
          
          if (corners && corners.length === 4) {
            // 모서리를 찾았으면 perspective transform 적용
            console.log('[OpenCV] 면허증 모서리 찾음:', corners);
            const normalized = applyPerspectiveTransform(src, corners);
            const result = matToBase64(normalized);
            
            // 메모리 정리
            src.delete();
            normalized.delete();
            
            console.log('[OpenCV] 면허증 정규화 완료');
            resolve(result);
          } else {
            // 모서리를 찾지 못했으면 원본 이미지 사용 (정규화 없음)
            console.warn('[OpenCV] 면허증 모서리를 찾지 못했습니다. 원본 이미지를 사용합니다.');
            console.log('[OpenCV] 이미지 크기:', img.width, 'x', img.height);
            
            // 원본 이미지 그대로 반환
            const result = canvas.toDataURL('image/jpeg', 0.95);
            src.delete();
            resolve(result);
          }
        } catch (error) {
          console.error('[OpenCV] 정규화 실패:', error);
          // 실패 시 원본 이미지 반환
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          } else {
            reject(error);
          }
        }
      };
      
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 면허증 모서리 감지 및 보정 (고급)
 */
export async function normalizeLicenseImageAdvanced(file: File): Promise<string> {
  return normalizeLicenseImage(file);
}
