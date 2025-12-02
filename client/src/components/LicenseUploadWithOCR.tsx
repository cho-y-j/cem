/**
 * 운전면허증 업로드 + OCR + 인증 컴포넌트
 * 
 * Admin/Owner 및 Worker 모두 사용 가능한 공통 컴포넌트
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Loader2, CheckCircle2, XCircle, AlertCircle, Crop, ScanLine } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useLicenseOCR, LicenseInfo, LICENSE_TYPES } from '@/hooks/useLicenseOCR';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { maskResidentNumberPrecise, base64ToFile } from '@/utils/imageMasking';
import { ImageCropModal } from './ImageCropModal';
import { DocumentScanner } from './DocumentScanner';

export interface LicenseUploadProps {
  // 자동 채워질 폼 데이터
  onOCRComplete: (info: LicenseInfo) => void;
  
  // 현재 폼 값 (수동 수정 가능)
  formData: {
    name: string;
    licenseNum: string;
    licenseType: string;
  };
  
  // 폼 값 변경 핸들러
  onFormChange: (field: string, value: string) => void;
  
  // 인증 성공 콜백
  onVerificationSuccess?: () => void;
  
  // 마스킹된 이미지 파일 업로드 콜백 (새로 추가)
  onImageUploaded?: (file: File) => void;
  
  // 모바일 여부 (카메라 촬영 활성화)
  isMobile?: boolean;
}

export function LicenseUploadWithOCR({
  onOCRComplete,
  formData,
  onFormChange,
  onVerificationSuccess,
  onImageUploaded,
  isMobile = false,
}: LicenseUploadProps) {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failure'>('idle');
  const [verificationMessage, setVerificationMessage] = useState('');

  // 크롭 모달 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);

  // 문서 스캐너 상태
  const [showScanner, setShowScanner] = useState(false);
  const [scannerImageSrc, setScannerImageSrc] = useState<string | null>(null);

  // 파일 input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 모바일/네이티브 앱 감지
  const isNative = Capacitor.isNativePlatform();
  const isMobileDevice = isMobile || isNative || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const { isProcessing, extractedInfo, error: ocrError, processImage, reset: resetOCR } = useLicenseOCR();
  
  const verifyLicenseMutation = trpc.workers.verifyLicense.useMutation();

  // 이미지 업로드 핸들러 - 모바일이면 스캐너, 아니면 크롭 모달
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fromCamera: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[LicenseUpload] File selected:', { name: file.name, type: file.type, isMobileDevice, fromCamera });
    setVerificationStatus('idle');

    // 파일을 base64로 변환
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageSrc = event.target?.result as string;

      // 모바일에서 카메라로 찍었거나 모바일 기기인 경우 스캐너 열기
      if (isMobileDevice || fromCamera) {
        // 모바일: 문서 스캐너 먼저 열기
        console.log('[LicenseUpload] Opening scanner for mobile/camera');
        setScannerImageSrc(imageSrc);
        setShowScanner(true);
      } else {
        // 데스크톱: 크롭 모달 바로 열기
        console.log('[LicenseUpload] Opening crop modal for desktop');
        setOriginalImageSrc(imageSrc);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);

    // input 초기화
    e.target.value = '';
  };

  // 카메라 촬영 핸들러
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, true);
  };

  // 스캔 완료 후 크롭 모달로 이동
  const handleScanComplete = (scannedImageDataUrl: string) => {
    console.log('[LicenseUpload] Scan complete, opening crop modal');
    setShowScanner(false);
    setScannerImageSrc(null);

    // 스캔된 이미지로 크롭 모달 열기
    setOriginalImageSrc(scannedImageDataUrl);
    setShowCropModal(true);
  };

  // 스캔 취소
  const handleScanCancel = () => {
    setShowScanner(false);
    setScannerImageSrc(null);
  };

  // 크롭 완료 후 OCR 및 마스킹 처리
  const handleCropComplete = async (croppedImageBase64: string) => {
    setShowCropModal(false);

    // base64를 File로 변환
    const croppedFile = await base64ToFile(croppedImageBase64, 'license_cropped.jpg');

    // OCR 실행 (크롭된 이미지로)
    toast.info('면허증 정보를 추출하는 중...');
    const info = await processImage(croppedFile);

    if (info) {
      // OCR 후 주민번호 위치를 알 수 있으므로 정확한 마스킹 적용
      try {
        const maskedImageBase64 = await maskResidentNumberPrecise(croppedFile, info);

        // 마스킹된 이미지를 미리보기로 표시
        setImagePreview(maskedImageBase64);

        // 마스킹된 이미지를 File 객체로 변환하여 저장
        const maskedFile = await base64ToFile(maskedImageBase64, 'license_masked.jpg');
        setUploadedImage(maskedFile); // 마스킹된 파일 저장

        // 부모 컴포넌트에 마스킹된 파일 전달
        if (onImageUploaded) {
          onImageUploaded(maskedFile);
        }

        console.log('[LicenseUpload] 이미지 마스킹 완료 - 주민번호 뒷자리 숨김 처리됨');
      } catch (maskError) {
        console.error('[LicenseUpload] 마스킹 실패:', maskError);
        // 마스킹 실패 시 크롭된 이미지 사용
        setImagePreview(croppedImageBase64);
        setUploadedImage(croppedFile);
        toast.warning('이미지 마스킹에 실패했습니다. 크롭된 이미지가 사용됩니다.');
      }

      // 폼 자동 채우기
      onOCRComplete(info);

      if (info.confidence >= 60) {
        toast.success(`면허증 정보가 추출되었습니다 (신뢰도: ${info.confidence}%)`);
      } else {
        toast.warning(`신뢰도가 낮습니다 (${info.confidence}%). 정보를 확인하고 수정해주세요.`);
      }
    } else {
      // OCR 실패 시에도 일반 마스킹 적용
      try {
        const { maskResidentNumber } = await import('@/utils/imageMasking');
        const maskedImageBase64 = await maskResidentNumber(croppedFile);
        setImagePreview(maskedImageBase64);
        const maskedFile = await base64ToFile(maskedImageBase64, 'license_masked.jpg');
        setUploadedImage(maskedFile);

        // 부모 컴포넌트에 마스킹된 파일 전달
        if (onImageUploaded) {
          onImageUploaded(maskedFile);
        }
      } catch (maskError) {
        console.error('[LicenseUpload] 마스킹 실패:', maskError);
        setImagePreview(croppedImageBase64);
        setUploadedImage(croppedFile);

        // 마스킹 실패 시에도 크롭된 파일 전달
        if (onImageUploaded) {
          onImageUploaded(croppedFile);
        }
      }

      toast.error('면허증 정보를 추출하지 못했습니다. 수동으로 입력해주세요.');
    }
  };

  // 면허 인증 버튼
  const handleVerifyLicense = async () => {
    if (!formData.licenseNum || !formData.name) {
      toast.error('면허번호와 이름을 입력해주세요.');
      return;
    }
    
    console.log('[LicenseUpload] Starting verification:', {
      name: formData.name,
      licenseNum: formData.licenseNum,
      licenseType: formData.licenseType,
    });

    if (formData.licenseNum.replace(/[^0-9]/g, '').length !== 12) {
      toast.error('면허번호는 12자리 숫자여야 합니다.');
      return;
    }

    setVerificationStatus('loading');

    try {
      const result = await verifyLicenseMutation.mutateAsync({
        licenseNo: formData.licenseNum.replace(/[^0-9]/g, ''), // 숫자만 추출
        name: formData.name,
        licenseType: formData.licenseType || '12',
      });

      if (result.isValid) {
        setVerificationStatus('success');
        setVerificationMessage('✅ 인증 완료! 유효한 운전면허입니다.');
        toast.success('면허 인증 완료!');
        
        console.log('[LicenseUpload] Verification success, calling callback');
        if (onVerificationSuccess) {
          onVerificationSuccess();
          console.log('[LicenseUpload] Callback executed successfully');
        } else {
          console.warn('[LicenseUpload] No onVerificationSuccess callback provided');
        }
      } else {
        setVerificationStatus('failure');
        setVerificationMessage(`❌ 인증 실패: ${getErrorMessage(result.resultCode)}`);
        toast.error('면허 인증 실패');
      }
    } catch (error: any) {
      setVerificationStatus('failure');
      setVerificationMessage('❌ 인증 실패: ' + (error.message || '네트워크 오류'));
      toast.error('인증 중 오류 발생');
    }
  };

  // 초기화
  const handleReset = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setVerificationStatus('idle');
    setVerificationMessage('');
    setOriginalImageSrc(null);
    setShowCropModal(false);
    resetOCR();
  };

  return (
    <div className="space-y-6">
      {/* 1. 이미지 업로드 섹션 */}
      <div className="space-y-4 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <Label className="text-base font-semibold">📸 운전면허증 자동 인식</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {isMobileDevice
                ? '면허증 사진을 촬영하거나 갤러리에서 선택하세요'
                : '면허증 사진을 업로드 후 영역을 선택하면 자동으로 정보를 추출합니다'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              <Crop className="inline h-3 w-3 mr-1" />
              사진 업로드 후 면허증 영역만 선택할 수 있습니다 (회전/크롭 지원)
            </p>
          </div>
          {uploadedImage && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              초기화
            </Button>
          )}
        </div>

        {/* 이미지 업로드 버튼 */}
        {isMobileDevice ? (
          /* 모바일: 카메라와 갤러리 버튼 분리 */
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="h-16 flex-col gap-1 bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="h-5 w-5" />
              <span className="text-sm">카메라 촬영</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="h-16 flex-col gap-1"
            >
              <Upload className="h-5 w-5" />
              <span className="text-sm">갤러리 선택</span>
            </Button>
            {/* 숨겨진 카메라 input - form validation 우회 */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
              formNoValidate
            />
            {/* 숨겨진 갤러리 input - form validation 우회 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, false)}
              formNoValidate
            />
          </div>
        ) : (
          /* 데스크톱: 기존 파일 선택 input */
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, false)}
                disabled={isProcessing}
                className="cursor-pointer"
                id="license-upload"
              />
            </div>
          </div>
        )}

        {/* 이미지 미리보기 */}
        {imagePreview && (
          <div className="mt-4">
            <img
              src={imagePreview}
              alt="면허증 미리보기"
              className="max-w-full h-auto rounded-lg border border-gray-300"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}

        {/* OCR 진행 중 */}
        {isProcessing && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-700">
              면허증 정보를 추출하는 중입니다... 잠시만 기다려주세요.
            </AlertDescription>
          </Alert>
        )}

        {/* OCR 결과 */}
        {extractedInfo && !isProcessing && (
          <Alert className={extractedInfo.confidence >= 70 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}>
            <AlertCircle className={`h-4 w-4 ${extractedInfo.confidence >= 70 ? 'text-green-600' : 'text-orange-600'}`} />
            <AlertDescription className={extractedInfo.confidence >= 70 ? 'text-green-700' : 'text-orange-700'}>
              <div className="font-semibold">
                {extractedInfo.confidence >= 70 ? '✅ 자동 추출 완료' : '⚠️ OCR 정확도 낮음'} (신뢰도: {extractedInfo.confidence}%)
              </div>
              <div className="text-xs mt-1 space-y-1">
                {extractedInfo.confidence >= 70 ? (
                  <div>아래 정보를 확인하고 필요시 수정하세요</div>
                ) : (
                  <>
                    <div className="font-semibold">⚠️ 면허증을 보고 직접 입력해주세요!</div>
                    <div>OCR 인식률이 낮습니다. 아래 입력란에 직접 정확히 입력하세요.</div>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* OCR 오류 */}
        {ocrError && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {ocrError}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* 2. 면허 정보 입력 (자동 채워짐, 수정 가능) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-base font-semibold">✏️ 면허 정보 입력</Label>
          {extractedInfo && (
            <span className="text-xs text-muted-foreground">
              (자동 입력됨 - 수정 가능)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              placeholder="예: 홍길동"
              required
            />
          </div>

          {/* 면허번호 */}
          <div className="space-y-2">
            <Label htmlFor="licenseNum">면허번호 * (12자리)</Label>
            <Input
              id="licenseNum"
              value={formData.licenseNum}
              onChange={(e) => onFormChange('licenseNum', e.target.value)}
              placeholder="예: 16-99-619984-50"
              required
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              ⚠️ 지역코드 포함 12자리 (충남→16, 서울→11, 경기→13 등)
            </p>
          </div>

          {/* 면허종별 */}
          <div className="space-y-2">
            <Label htmlFor="licenseType">면허종별</Label>
            <Select
              value={formData.licenseType}
              onValueChange={(value) => onFormChange('licenseType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="면허종별 선택" />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_TYPES.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.name} ({type.description})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. 면허 인증 버튼 */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleVerifyLicense}
          disabled={!formData.licenseNum || !formData.name || verificationStatus === 'loading' || verificationStatus === 'success'}
          className="w-full h-12 text-base font-semibold"
        >
          {verificationStatus === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              인증 중...
            </>
          ) : verificationStatus === 'success' ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
              인증 완료
            </>
          ) : (
            <>
              🔍 면허 인증 (RIMS API)
            </>
          )}
        </Button>

        {/* 인증 결과 메시지 */}
        {verificationStatus === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 font-semibold">
              {verificationMessage}
            </AlertDescription>
          </Alert>
        )}

        {verificationStatus === 'failure' && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 font-semibold">
              {verificationMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* 안내 메시지 */}
        {verificationStatus === 'idle' && formData.licenseNum && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ Worker 등록 전에 반드시 <strong>면허 인증</strong>을 완료해주세요.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* 문서 스캐너 */}
      {showScanner && scannerImageSrc && (
        <DocumentScanner
          imageSrc={scannerImageSrc}
          onComplete={handleScanComplete}
          onCancel={handleScanCancel}
        />
      )}

      {/* 이미지 크롭 모달 */}
      {originalImageSrc && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setOriginalImageSrc(null);
          }}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}

/**
 * RIMS 결과 코드에 따른 에러 메시지
 */
function getErrorMessage(resultCode: string): string {
  const errorMessages: Record<string, string> = {
    '01': '면허 정지',
    '02': '면허 취소',
    '03': '면허 없음',
    '04': '적성검사 기간 경과',
    '05': '면허 갱신 필요',
    '06': '정보 불일치',
    '99': '시스템 오류',
  };

  return errorMessages[resultCode] || `부적격 (코드: ${resultCode})`;
}

