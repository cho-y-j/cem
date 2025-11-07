# Supabase Storage 적용 완료 보고서

**작성일**: 2025-10-26  
**문제**: 무한 로딩 및 서류 저장 실패  
**해결**: Supabase Storage 적용

---

## ✅ 수정 완료

Base64 직접 저장 방식에서 **Supabase Storage**를 사용하도록 변경했습니다.

---

## 🔧 수정 내역

### 1. storage.ts 전면 수정

기존 Manus 내장 스토리지 코드를 제거하고 Supabase Storage를 사용하도록 수정했습니다.

#### 수정된 코드
```typescript
// Supabase Storage helper functions
import { getSupabase } from './db';

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  const key = normalizeKey(relKey);
  const bucketName = 'erms';

  // 파일 업로드
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(key, data, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[Storage] Upload error:', uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Public URL 가져오기
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(key);

  console.log(`[Storage] File uploaded: ${key} -> ${publicUrl}`);
  return { key, url: publicUrl };
}
```

#### 주요 변경 사항
1. **Manus 내장 스토리지 제거**: 모든 Forge API 관련 코드 제거
2. **Supabase Storage 사용**: `supabase.storage.from('erms')` 사용
3. **버킷 이름**: `erms` (사용자가 생성한 버킷)
4. **Public URL 반환**: `getPublicUrl()` 사용
5. **에러 로깅**: 상세한 에러 메시지 출력

### 2. routers.ts 복원

Base64 직접 저장 방식을 다시 Supabase Storage 업로드 방식으로 복원했습니다.

#### equipment.createWithDocs (line 456-490)
```typescript
// base64 디코딩
const buffer = Buffer.from(doc.fileData, 'base64');

// Supabase Storage에 파일 업로드
const filePath = `equipment/${equipmentId}/${nanoid()}_${doc.fileName}`;
const { url } = await storagePut(filePath, buffer, doc.mimeType);

// 서류 정보 DB 저장
await db.createDocsCompliance({
  id: nanoid(),
  targetType: "equipment",
  targetId: equipmentId,
  docTypeId: doc.docTypeId,
  docType: doc.docName,
  fileName: doc.fileName,
  fileUrl: url, // Supabase Storage URL
  fileSize: buffer.length,
  mimeType: doc.mimeType,
  issueDate: doc.issueDate ? new Date(doc.issueDate) : undefined,
  expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
  uploadedBy: ctx.user.id,
  status: "approved",
});

console.log(`[Equipment] Document uploaded: ${doc.docName} for equipment ${equipmentId}`);
```

#### workers.createWithDocs (line 576-611)
- 동일한 방식으로 수정
- 파일 경로: `worker/${workerId}/${nanoid()}_${fileName}`

---

## 🗂️ Supabase Storage 설정

### 버킷 정보
- **버킷 이름**: `erms`
- **접근 권한**: Public (필수)
- **파일 경로 구조**:
  - 장비 서류: `equipment/{equipmentId}/{fileId}_{fileName}`
  - 인력 서류: `worker/{workerId}/{fileId}_{fileName}`

### Public 접근 설정 확인

Supabase 대시보드에서 다음을 확인해 주세요:

1. **Storage** → **erms** 버킷 선택
2. **Configuration** → **Public bucket** 체크 확인
3. 또는 **Policies** 탭에서 다음 정책 추가:

```sql
-- SELECT (읽기) 정책
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'erms' );

-- INSERT (쓰기) 정책 (인증된 사용자만)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'erms' AND auth.role() = 'authenticated' );
```

---

## 🚀 테스트 서버

**URL**: https://3000-i2rbu5qzksu646zz8h6uy-87777a64.manus-asia.computer

**상태**: 실행 중 ✅

---

## 🧪 테스트 시나리오

### 1. 장비 등록 및 서류 업로드
1. Owner 계정으로 로그인
2. "장비 관리" → "장비 등록"
3. 장비 정보 입력
4. 필수 서류 파일 업로드 (이미지 또는 PDF)
5. "등록" 버튼 클릭
6. **서류가 Supabase Storage에 업로드되고 DB에 저장되는지 확인**

### 2. 서류 관리 페이지 확인
1. "서류 관리" 페이지 접속
2. **등록한 장비의 서류가 표시되는지 확인**
3. 눈 아이콘 클릭하여 서류 미리보기
4. **Supabase Storage URL에서 파일이 로드되는지 확인**

### 3. 서류 다운로드
1. 다운로드 아이콘 클릭
2. **파일이 정상적으로 다운로드되는지 확인**

### 4. 서류 삭제
1. 휴지통 아이콘 클릭
2. 확인 다이얼로그에서 "확인"
3. **서류가 DB에서 삭제되는지 확인**
   - 주의: Supabase Storage에서는 파일이 남아있음 (추가 구현 필요)

---

## 📊 파일 URL 형식

### Supabase Storage Public URL
```
https://zlgehckxiuhjpfjlaycf.supabase.co/storage/v1/object/public/erms/equipment/{equipmentId}/{fileId}_{fileName}
```

예시:
```
https://zlgehckxiuhjpfjlaycf.supabase.co/storage/v1/object/public/erms/equipment/abc123/xyz789_license.pdf
```

---

## 🔍 디버깅 로그

서류 업로드 시 다음과 같은 로그가 출력됩니다:

```
[Storage] File uploaded: equipment/abc123/xyz789_license.pdf -> https://...
[Equipment] Document uploaded: 면허증 for equipment abc123
```

에러 발생 시:
```
[Storage] Upload error: { message: "...", statusCode: 400 }
[Equipment] Error uploading document: Error: Storage upload failed: ...
```

---

## ⚠️ 주의 사항

### 1. Supabase Storage 버킷이 Public이어야 함

**확인 방법**:
1. Supabase 대시보드 → Storage → erms 버킷
2. Configuration → "Public bucket" 체크 확인

**Public이 아닐 경우**:
- 파일 URL 접근 시 403 Forbidden 에러 발생
- 서류 미리보기 및 다운로드 불가

### 2. 파일 삭제 시 Storage에서도 삭제 필요

현재는 DB에서만 삭제되고 Supabase Storage에는 파일이 남아있습니다.

**개선 방안**:
```typescript
// docsCompliance.delete 라우터 수정
delete: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    // 1. DB에서 서류 정보 조회
    const doc = await db.getDocsComplianceById(input.id);
    
    // 2. Supabase Storage에서 파일 삭제
    if (doc && doc.fileUrl.includes('supabase.co')) {
      const supabase = getSupabase();
      const filePath = doc.fileUrl.split('/public/erms/')[1];
      await supabase.storage.from('erms').remove([filePath]);
    }
    
    // 3. DB에서 서류 정보 삭제
    await db.deleteDocsCompliance(input.id);
    return { success: true };
  }),
```

### 3. 파일 크기 제한

Supabase Storage 무료 플랜:
- **저장 용량**: 1GB
- **파일 크기 제한**: 50MB (기본값)

**권장 제한**:
- 이미지: 최대 5MB
- PDF: 최대 10MB

---

## 🔄 향후 개선 사항

### 1. 파일 삭제 시 Storage에서도 삭제 (우선순위: 높음)
현재는 DB에서만 삭제되므로, Storage에서도 삭제하도록 수정 필요

### 2. 파일 크기 제한 (우선순위: 중간)
프론트엔드에서 파일 크기 검증 추가

### 3. 파일 형식 제한 (우선순위: 중간)
이미지(jpg, png) 및 PDF만 허용하도록 제한

### 4. 썸네일 생성 (우선순위: 낮음)
이미지 파일의 경우 썸네일 자동 생성

---

## ✨ 완료!

Supabase Storage 적용이 완료되었습니다. 

**테스트 서버 URL**: https://3000-i2rbu5qzksu646zz8h6uy-87777a64.manus-asia.computer

**다음 단계**:
1. Supabase 대시보드에서 `erms` 버킷이 Public인지 확인
2. 장비 등록 시 서류 업로드 테스트
3. 서류 관리 페이지에서 서류 확인
4. 문제 발생 시 서버 로그 확인: `tail -f /tmp/server.log`

---

**작성일**: 2025-10-26  
**작성자**: AI Assistant  
**버전**: 2.0

