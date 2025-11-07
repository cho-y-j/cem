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
  Image as ImageIcon
} from "lucide-react";
import { useLocation } from "wouter";

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    // 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event);
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

  return (
    <div className="min-h-screen bg-gray-50">
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
          multiple
          className="hidden"
          onChange={handleCameraCapture}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
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
                  <div key={index} className="relative aspect-square">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
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
                  <li>• 서류 전체가 선명하게 보이도록 촬영하세요</li>
                  <li>• 조명이 밝은 곳에서 촬영하세요</li>
                  <li>• 글자가 흐리거나 잘린 경우 재촬영하세요</li>
                  <li>• 여러 장의 서류를 한 번에 업로드할 수 있습니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

