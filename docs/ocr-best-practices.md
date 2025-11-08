# OCR 사용 Best Practices

## 🎯 OCR 사용 전략

### **원칙: "사용자 입력 > OCR"**

OCR은 **보조 도구**이지 **주요 입력 수단이 아닙니다**.

---

## 📋 필드별 처리 전략

### 1. **이름 (Name)**

**정확도: ❌ 매우 낮음 (25%)**

**전략:**
```typescript
// 기존 입력값이 있으면 유지
name: formData.name.trim() || info.name
```

**사용자 플로우:**
```
1. 이름 먼저 입력 ✏️
2. 면허증 업로드 📸
3. OCR 실행 (이름은 덮어쓰지 않음)
4. 이름은 사용자 입력값 유지 ✅
```

---

### 2. **면허번호 (License Number)**

**정확도: ✅ 높음 (80%)**

**전략:**
```typescript
// OCR 결과 우선 사용
licenseNum: info.licenseNum || formData.licenseNum
```

**처리:**
- 지역명 자동 변환 (충남 → 16)
- 12자리 숫자로 정규화
- 하이픈 자동 제거

---

### 3. **주소 (Address)**

**정확도: ⚠️ 보통 (60%)**

**전략:**
```typescript
// OCR 결과를 자동 입력, 수정 가능
address: info.address || formData.address
```

**패턴:**
```typescript
const addressPattern = /(서울특별시|부산광역시|경기도|충청남도|...)[^\d가-힣]*([가-힣\s\d-]+)/;
```

**예시:**
```
OCR 결과: "충청남도 음성군 홍성읍 문화로80번길 43, 202호"
→ 자동 입력 ✅
```

---

### 4. **주민등록번호 (Resident Number)**

**정확도: ✅ 높음 (90%)**

**전략:**
```typescript
// 뒷자리는 보안을 위해 마스킹
residentNumber: info.residentNumber // "711228-*******"
```

**보안 처리:**
```typescript
const residentPattern = /(\d{6})[\s-]*(\d{7})/;
if (match) {
  residentNumber = `${match[1]}-*******`; // 뒷자리 마스킹
}
```

---

### 5. **면허종별 (License Type)**

**정확도: ✅ 매우 높음 (95%)**

**전략:**
```typescript
// OCR 결과 우선 사용
licenseType: info.licenseType || formData.licenseType
```

**매핑:**
```typescript
const licenseTypeMap: Record<string, { code: string; name: string }> = {
  '1종대형': { code: '11', name: '1종 대형' },
  '1종보통': { code: '12', name: '1종 보통' },
  '2종보통': { code: '21', name: '2종 보통' },
  // ...
};
```

---

## 🔄 OCR 프로세스

### **1. 사전 입력 권장**
```
사용자 작업:
1. 이름 먼저 입력 ✏️
   (OCR로 덮어쓰지 않기 위해)
```

### **2. OCR 실행**
```
시스템 작업:
1. 면허증 이미지 업로드 📸
2. Tesseract.js OCR 실행
3. 정보 추출:
   - 이름 (사용자 입력값 우선)
   - 면허번호 ✅
   - 주소 ✅
   - 주민등록번호 ✅
   - 면허종별 ✅
```

### **3. 결과 병합**
```typescript
setFormData({
  ...formData,
  // 이름: 기존 값 우선
  name: formData.name.trim() || info.name,
  // 나머지: OCR 결과 우선
  licenseNum: info.licenseNum || formData.licenseNum,
  address: info.address || formData.address,
  residentNumber: info.residentNumber || formData.residentNumber,
  licenseType: info.licenseType || formData.licenseType,
});
```

### **4. 수동 수정**
```
사용자 확인:
- ⚠️ OCR 정확도 낮음 (60%)
- 모든 필드 수정 가능
- 특히 주소 확인 필요
```

### **5. 면허 인증**
```
시스템 검증:
1. 면허번호 12자리 확인
2. RIMS API 호출
3. 진위 확인 ✅
```

---

## 🎨 UI/UX 가이드

### **1. 이름 입력란 배치**
```tsx
{/* 이름을 OCR 컴포넌트보다 위에 배치 */}
<div className="space-y-2">
  <Label htmlFor="name">이름 *</Label>
  <Input
    id="name"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    placeholder="예: 홍길동"
    required
  />
  <p className="text-xs text-muted-foreground">
    💡 이름을 먼저 입력하면 OCR로 덮어쓰지 않습니다
  </p>
</div>

{/* 면허증 OCR 컴포넌트 */}
<LicenseUploadWithOCR ... />
```

### **2. OCR 결과 신뢰도 표시**
```tsx
{extractedInfo && (
  <Alert className={
    extractedInfo.confidence >= 70 
      ? 'bg-green-50 border-green-200' 
      : 'bg-orange-50 border-orange-200'
  }>
    <AlertDescription>
      {extractedInfo.confidence >= 70 ? (
        <div>✅ 자동 추출 완료 (신뢰도: {extractedInfo.confidence}%)</div>
      ) : (
        <div>⚠️ OCR 정확도 낮음 ({extractedInfo.confidence}%)</div>
      )}
      <div className="text-xs mt-1">
        추출된 정보를 확인하고 필요시 수정하세요
      </div>
    </AlertDescription>
  </Alert>
)}
```

### **3. 등록 버튼 상태**
```tsx
<Button
  type="submit"
  disabled={!editingId && formData.licenseNum && !licenseVerified}
>
  {(!editingId && formData.licenseNum && !licenseVerified) ? (
    <>
      🔒 면허 인증 필요
    </>
  ) : (
    <>
      등록
    </>
  )}
</Button>
```

---

## 📊 신뢰도 기준

| 신뢰도 | 상태 | UI 표시 | 권장 조치 |
|--------|------|---------|-----------|
| 90-100% | 🟢 매우 높음 | 녹색 배지 | 확인만 하고 진행 |
| 70-89% | 🟡 높음 | 노란색 배지 | 주요 필드만 확인 |
| 50-69% | 🟠 보통 | 주황색 배지 | 모든 필드 확인 |
| < 50% | 🔴 낮음 | 빨간색 배지 | 수동 입력 권장 |

---

## 🚫 하지 말아야 할 것

### ❌ **OCR 결과로 무조건 덮어쓰기**
```typescript
// ❌ 나쁜 예
setFormData({
  name: info.name, // OCR이 잘못 인식하면 사용자 입력 손실
  ...
});

// ✅ 좋은 예
setFormData({
  name: formData.name.trim() || info.name, // 기존 값 우선
  ...
});
```

### ❌ **신뢰도 무시**
```typescript
// ❌ 나쁜 예
if (info) {
  // 신뢰도 확인 없이 자동 제출
  submitForm();
}

// ✅ 좋은 예
if (info) {
  if (info.confidence >= 70) {
    toast.success('자동 추출 완료');
  } else {
    toast.warning('신뢰도가 낮습니다. 정보를 확인하세요.');
  }
  // 사용자가 확인 후 수동 제출
}
```

### ❌ **에러 처리 생략**
```typescript
// ❌ 나쁜 예
const info = await processImage(file);
setFormData({ ...info });

// ✅ 좋은 예
try {
  const info = await processImage(file);
  if (info) {
    setFormData({ ...formData, ...info });
    toast.success('정보 추출 완료');
  } else {
    toast.error('정보 추출 실패. 수동으로 입력하세요.');
  }
} catch (error) {
  console.error('OCR error:', error);
  toast.error('OCR 오류 발생');
}
```

---

## ✅ Best Practices 요약

1. **이름은 사용자가 먼저 입력** → OCR로 덮어쓰지 않음
2. **신뢰도 표시** → 사용자가 확인 가능
3. **모든 필드 수정 가능** → OCR은 보조 수단
4. **에러 처리 철저** → OCR 실패해도 서비스 정상 작동
5. **면허 인증 필수** → OCR 성공 ≠ 면허 유효성

---

## 🎯 결론

**OCR은 편의 기능이지 핵심 기능이 아닙니다!**

✅ **핵심 기능:**
- 사용자 입력
- 면허 인증 (RIMS API)

⚠️ **보조 기능:**
- OCR 자동 추출
- 신뢰도 표시

**사용자 경험:**
1. 이름 먼저 입력 ✏️
2. 면허증 업로드 📸
3. OCR 결과 확인 및 수정 ✏️
4. 면허 인증 🔍
5. Worker 등록 ✅

**이 프로세스가 가장 안정적이고 사용자 친화적입니다!** 🎉












