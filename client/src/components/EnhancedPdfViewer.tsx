/**
 * 향상된 PDF 뷰어 컴포넌트
 * - 반응형 디자인 (데스크탑에서 크게 표시)
 * - 다중 서류 좌우 넘김 기능
 * - 확대/축소 기능
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  X,
  Maximize2,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  url: string;
  type?: string;
}

interface EnhancedPdfViewerProps {
  open: boolean;
  onClose: () => void;
  documents: Document[];
  initialIndex?: number;
  title?: string;
}

export function EnhancedPdfViewer({
  open,
  onClose,
  documents,
  initialIndex = 0,
  title = "서류 미리보기",
}: EnhancedPdfViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(100);
    }
  }, [open, initialIndex]);

  const currentDoc = documents[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoom(100); // 문서 변경 시 줌 초기화
    }
  };

  const handleNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoom(100); // 문서 변경 시 줌 초기화
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    if (currentDoc?.url) {
      const link = document.createElement("a");
      link.href = currentDoc.url;
      link.download = currentDoc.name || "document";
      link.click();
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
      if (dialog) {
        dialog.requestFullscreen?.();
        setIsFullscreen(true);
      }
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (!currentDoc) return null;

  const isPdf = currentDoc.url.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`${
          isFullscreen
            ? "max-w-[100vw] max-h-[100vh] w-full h-full m-0 rounded-none"
            : "max-w-[95vw] max-h-[95vh] w-full md:max-w-6xl md:h-[90vh]"
        } p-0 flex flex-col`}
      >
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <span>{title}</span>
              {documents.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({currentIndex + 1} / {documents.length})
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* 다중 문서 네비게이션 */}
              {documents.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === documents.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* 줌 컨트롤 */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 min-w-[60px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* 전체화면 */}
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>

              {/* 다운로드 */}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>

              {/* 닫기 */}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* PDF/이미지 뷰어 */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={currentDoc.url}
              className="border-0 shadow-lg"
              style={{
                width: `${zoom}%`,
                height: `${zoom}%`,
                minWidth: "100%",
                minHeight: "100%",
              }}
              title={currentDoc.name}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={currentDoc.url}
                alt={currentDoc.name}
                className="max-w-full max-h-full object-contain shadow-lg"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "center",
                }}
              />
            </div>
          )}
        </div>

        {/* 문서 목록 (하단) */}
        {documents.length > 1 && (
          <div className="px-6 py-3 border-t bg-gray-50 dark:bg-gray-800 flex-shrink-0 overflow-x-auto">
            <div className="flex gap-2">
              {documents.map((doc, index) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setCurrentIndex(index);
                    setZoom(100);
                  }}
                  className={`px-3 py-1 text-sm rounded-md whitespace-nowrap transition-colors ${
                    index === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {doc.name || `문서 ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}





















