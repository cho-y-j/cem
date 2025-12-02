import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Upload,
  X,
  Check,
  ArrowLeft,
  Image as ImageIcon,
  ScanLine
} from "lucide-react";
import { useLocation } from "wouter";
import { DocumentScanner } from "@/components/DocumentScanner";

export default function DocumentUpload() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [docType, setDocType] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 스캐너 상태
  const [scannerOpen, setScannerOpen] = useState(false);
  const [imageToScan, setImageToScan] = useState<string | null>(null);
  const [pendingFileIndex, setPendingFileIndex] = useState<number | null>(null);

  // 이미지 파일을 스캔할지 여부 확인
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, fromCamera: boolean = false) => {
    const files = Array.from(event.target.files || []);
    console.log('[DocumentUpload] handleFileSelect:', { filesCount: files.length, fromCamera });
    if (files.length === 0) {
      console.log('[DocumentUpload] No files selected');
      return;
    }

    // 첫 번째 이미지 파일만 스캔 (카메라는 한 장씩)
    const file = files[0];
    console.log('[DocumentUpload] Processing file:', { name: file.name, type: file.type, size: file.size, fromCamera });

    // 이미지 파일인 경우 무조건 스캐너 열기
    if (file.type.startsWith('image/')) {
      console.log('[DocumentUpload] Opening scanner for image (camera:', fromCamera, ')');
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('[DocumentUpload] Image loaded, data length:', result?.length, 'opening scanner...');
        console.log('[DocumentUpload] Setting states: imageToScan, pendingFileIndex, scannerOpen');
        setImageToScan(result);
        setPendingFileIndex(selectedFiles.length);
        setScannerOpen(true);
        console.log('[DocumentUpload] Scanner should be open now');
      };
      reader.onerror = (error) => {
        console.error('[DocumentUpload] FileReader error:', error);
        alert('이미지를 읽는 중 오류가 발생했습니다.');
      };
      reader.readAsDataURL(file);
    } else {
      // PDF 등 다른 파일은 바로 추가
      console.log('[DocumentUpload] Adding non-image file directly:', file.type);
      addFileToList(file);
    }

    // input 초기화
    event.target.value = '';
  };

  // 파일 목록에 추가
  const addFileToList = (file: File) => {
    setSelectedFiles(prev => [...prev, file]);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
  };

  // 스캔 완료 후 처리
  const handleScanComplete = (resultDataUrl: string) => {
    // DataURL을 Blob으로 변환
    fetch(resultDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `scanned_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFiles(prev => [...prev, file]);
        setPreviews(prev => [...prev, resultDataUrl]);
      });

    setScannerOpen(false);
    setImageToScan(null);
    setPendingFileIndex(null);
  };

  // 스캔 취소
  const handleScanCancel = () => {
    setScannerOpen(false);
    setImageToScan(null);
    setPendingFileIndex(null);
  };

  // 기존 이미지 편집 (미리보기에서 클릭)
  const handleEditImage = (index: number) => {
    const preview = previews[index];
    if (preview && preview.startsWith('data:image')) {
      setImageToScan(preview);
      setPendingFileIndex(index);
      setScannerOpen(true);
    }
  };

  // 편집 완료 후 교체
  const handleEditComplete = (resultDataUrl: string) => {
    if (pendingFileIndex !== null && pendingFileIndex < previews.length) {
      // 기존 이미지 교체
      fetch(resultDataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `scanned_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedFiles(prev => {
            const updated = [...prev];
            updated[pendingFileIndex!] = file;
            return updated;
          });
          setPreviews(prev => {
            const updated = [...prev];
            updated[pendingFileIndex!] = resultDataUrl;
            return updated;
          });
        });
    } else {
      // 새 이미지 추가
      handleScanComplete(resultDataUrl);
      return;
    }

    setScannerOpen(false);
    setImageToScan(null);
    setPendingFileIndex(null);
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event, true); // 카메라에서 촬영한 경우 스캔 화면 열기
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('파일을 선택해주세요.');
      return;
    }

    if (!docType) {
      alert('서류 종류를 입력해주세요.');
      return;
    }

    setUploading(true);

    try {
      // TODO: 실제 업로드 로직 구현
      console.log('[서류 업로드]', {
        files: selectedFiles,
        docType,
        description,
        userId: user?.id,
      });

      // 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('서류가 성공적으로 업로드되었습니다!');
      setLocation('/mobile/worker');
    } catch (error) {
      console.error('[업로드 오류]', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 디버그 로그
  console.log('[DocumentUpload] Render state:', { scannerOpen, hasImageToScan: !!imageToScan, pendingFileIndex });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 스캐너 모달 */}
      {scannerOpen && imageToScan && (
        <DocumentScanner
          imageSrc={imageToScan}
          onComplete={pendingFileIndex !== null && pendingFileIndex < previews.length
            ? handleEditComplete
            : handleScanComplete}
          onCancel={handleScanCancel}
        />
      )}

      {/* 헤더 */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-blue-700"
            onClick={() => setLocation('/mobile/worker')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">서류 업로드</h1>
            <p className="text-sm text-blue-100">사진 촬영 또는 파일 선택</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 촬영/선택 버튼 */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Camera className="h-6 w-6" />
            <span>카메라 촬영</span>
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <Upload className="h-6 w-6" />
            <span>파일 선택</span>
          </Button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e, false)}
        />

        {/* 미리보기 */}
        {previews.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">선택된 파일 ({previews.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {/* 편집 버튼 (이미지인 경우만) */}
                    {preview.startsWith('data:image') && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-1 left-1 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                        onClick={() => handleEditImage(index)}
                      >
                        <ScanLine className="h-4 w-4" />
                      </Button>
                    )}
                    {/* 삭제 버튼 */}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                이미지를 편집하려면 왼쪽 하단의 스캔 버튼을 누르세요
              </p>
            </CardContent>
          </Card>
        )}

        {/* 서류 정보 입력 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">서류 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docType">서류 종류 *</Label>
              <Input
                id="docType"
                placeholder="예: 운전면허증, 자격증, 보험증서 등"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                placeholder="추가 설명을 입력하세요"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 업로드 버튼 */}
        <Button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
        >
          {uploading ? (
            <>
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              업로드 중...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              업로드 완료
            </>
          )}
        </Button>

        {/* 안내 사항 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <ImageIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">촬영 가이드</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• 카메라로 촬영하면 자동으로 문서 스캔 화면이 열립니다</li>
                  <li>• 모서리를 드래그하여 문서 영역을 조정하세요</li>
                  <li>• 필터를 선택하여 문서를 선명하게 만들 수 있습니다</li>
                  <li>• 업로드 전 이미지를 다시 편집할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
