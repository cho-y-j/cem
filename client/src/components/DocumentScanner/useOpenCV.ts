import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    cv: any;
    Module: any;
  }
}

const OPENCV_URL = 'https://docs.opencv.org/4.9.0/opencv.js';

let loadingPromise: Promise<void> | null = null;
let isLoaded = false;

export function useOpenCV() {
  const [ready, setReady] = useState(isLoaded);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOpenCV = useCallback(() => {
    if (isLoaded) {
      setReady(true);
      return Promise.resolve();
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    setLoading(true);
    setError(null);

    loadingPromise = new Promise<void>((resolve, reject) => {
      // 이미 로드된 경우
      if (window.cv && window.cv.Mat) {
        isLoaded = true;
        setReady(true);
        setLoading(false);
        resolve();
        return;
      }

      // 스크립트 동적 로드
      const script = document.createElement('script');
      script.src = OPENCV_URL;
      script.async = true;

      script.onload = () => {
        // OpenCV.js가 완전히 초기화될 때까지 대기
        const waitForCV = () => {
          if (window.cv && window.cv.Mat) {
            isLoaded = true;
            setReady(true);
            setLoading(false);
            console.log('[OpenCV] Loaded successfully');
            resolve();
          } else if (window.cv && typeof window.cv.onRuntimeInitialized === 'undefined') {
            // cv 객체는 있지만 아직 초기화 중
            window.cv.onRuntimeInitialized = () => {
              isLoaded = true;
              setReady(true);
              setLoading(false);
              console.log('[OpenCV] Runtime initialized');
              resolve();
            };
          } else {
            setTimeout(waitForCV, 100);
          }
        };

        // Module.onRuntimeInitialized 설정
        if (!window.cv) {
          window.Module = {
            onRuntimeInitialized: () => {
              waitForCV();
            }
          };
        }

        waitForCV();
      };

      script.onerror = () => {
        const errorMsg = 'OpenCV.js 로드 실패';
        setError(errorMsg);
        setLoading(false);
        loadingPromise = null;
        reject(new Error(errorMsg));
      };

      document.body.appendChild(script);
    });

    return loadingPromise;
  }, []);

  useEffect(() => {
    // 컴포넌트 마운트 시 자동 로드
    loadOpenCV().catch(console.error);
  }, [loadOpenCV]);

  return {
    cv: window.cv,
    ready,
    loading,
    error,
    loadOpenCV
  };
}

export default useOpenCV;
