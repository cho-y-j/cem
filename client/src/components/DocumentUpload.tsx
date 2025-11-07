import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  onUploadComplete: (fileUrl: string, fileName: string, fileSize: number, mimeType: string) => void;
  accept?: string;
  maxSize?: number; // MB
}

export function DocumentUpload({ 
  onUploadComplete, 
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 10 
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      toast.error(`파일 크기는 ${maxSize}MB 이하여야 합니다.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("파일을 선택하세요.");
      return;
    }

    setUploading(true);
    try {
      // 파일을 Base64로 변환
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // S3에 업로드 (실제로는 서버 API 호출)
        // 임시로 로컬 URL 사용
        const mockUrl = `https://storage.example.com/${Date.now()}-${selectedFile.name}`;
        
        onUploadComplete(
          mockUrl,
          selectedFile.name,
          selectedFile.size,
          selectedFile.type
        );
        
        toast.success("파일이 업로드되었습니다.");
        setSelectedFile(null);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast.error("업로드 실패: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>파일 선택</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="flex-1"
          />
          {selectedFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          허용 형식: {accept} (최대 {maxSize}MB)
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                업로드
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

