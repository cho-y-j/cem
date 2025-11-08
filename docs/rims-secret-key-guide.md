# RIMS Secret Key 설정 가이드

## 🔑 Secret Key란?

RIMS(운전자격확인시스템)에서 발급한 **AES 암호화 키**입니다.

---

## 📋 Secret Key 확인 방법

### 1. RIMS 홈페이지 로그인
```
https://rims.kotsa.or.kr
```

### 2. OpenAPI 메뉴 이동
```
로그인 → 내 정보 → OpenAPI 관리
```

### 3. Secret Key 확인
```
┌─────────────────────────────────────────┐
│ API 인증 정보                           │
├─────────────────────────────────────────┤
│ 인증키 (Auth Key):                      │
│ [복사]  a1b2c3d4e5f6g7h8i9j0...          │
│                                         │
│ Secret Key:                             │
│ [복사]  MySecretKey12345                 │
│                                         │
│ 발급일: 2024-01-01                      │
│ 상태: 승인 완료                         │
└─────────────────────────────────────────┘
```

---

## 🔧 .env 파일 설정

### **정확한 값을 복사하여 붙여넣으세요!**

```env
# RIMS API 설정
RIMS_API_URL=https://rims.kotsa.or.kr:8114
RIMS_AUTH_KEY=여기에_인증키_붙여넣기
RIMS_SECRET_KEY=여기에_Secret_Key_붙여넣기
```

### ⚠️ 주의사항

1. **공백 없이 복사**
   ```env
   # ❌ 잘못된 예
   RIMS_SECRET_KEY= MySecretKey12345  (앞뒤 공백 있음)
   
   # ✅ 올바른 예
   RIMS_SECRET_KEY=MySecretKey12345
   ```

2. **따옴표 없이**
   ```env
   # ❌ 잘못된 예
   RIMS_SECRET_KEY="MySecretKey12345"
   RIMS_SECRET_KEY='MySecretKey12345'
   
   # ✅ 올바른 예
   RIMS_SECRET_KEY=MySecretKey12345
   ```

3. **원본 그대로 사용**
   ```env
   # ❌ 잘못된 예 (임의로 변경)
   RIMS_SECRET_KEY=my_custom_key_123
   
   # ✅ 올바른 예 (RIMS에서 발급받은 원본)
   RIMS_SECRET_KEY=k0T5A_S3cR3T_2024!@#
   ```

---

## 🔍 Secret Key 길이

AES 암호화는 키 길이에 따라 알고리즘이 다릅니다:

| 키 길이 | AES 알고리즘 | 예시 |
|---------|--------------|------|
| 16 bytes | AES-128-ECB | `MySecretKey1234` (16자) |
| 24 bytes | AES-192-ECB | `MySecretKey123456789012` (24자) |
| 32 bytes | AES-256-ECB | `MySecretKey1234567890123456789012` (32자) |

**RIMS에서 발급한 Secret Key가 몇 바이트인지 확인하세요!**

---

## 🧪 Secret Key 테스트

### 서버 로그 확인

서버를 실행하면 다음과 같은 로그가 나타납니다:

```
[RIMS Crypto] Secret Key length: 16 bytes
```

**올바른 길이 (16, 24, 32)가 아니면 암호화 실패합니다!**

---

## 🚨 문제 해결

### 1. **"복호화 실패" 오류**
```
[RIMS] Response data: {
  "respCode": -190,
  "errorMsg": "복호화 실패: 데이터 복호화에 실패했습니다."
}
```

**원인:**
- Secret Key가 잘못됨
- Secret Key에 공백이나 특수문자가 포함됨
- Secret Key를 잘못 복사함

**해결:**
1. RIMS 홈페이지에서 Secret Key 다시 확인
2. `.env` 파일에 정확히 복사
3. 앞뒤 공백 제거
4. 서버 재시작

### 2. **"Invalid key length" 경고**
```
[RIMS Crypto] Invalid key length (20), padding to 16 bytes
```

**원인:**
- Secret Key 길이가 16, 24, 32 바이트가 아님

**해결:**
- RIMS에서 발급한 원본 Secret Key 다시 확인
- 복사 과정에서 일부가 누락되었을 수 있음

### 3. **환경 변수 로드 안 됨**
```
[RIMS] Secret Key length: 0 bytes
```

**원인:**
- `.env` 파일이 없거나
- `.env` 파일 위치가 잘못됨
- 서버가 환경 변수를 읽지 못함

**해결:**
```bash
# 프로젝트 루트 디렉토리에 .env 파일 있는지 확인
ls -la .env

# 파일 내용 확인
cat .env | grep RIMS

# 서버 재시작
pnpm dev
```

---

## 📝 예시 (.env 파일)

```env
# Database
DATABASE_URL=postgresql://...

# Supabase
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# RIMS API (운전자격확인시스템)
RIMS_API_URL=https://rims.kotsa.or.kr:8114
RIMS_AUTH_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
RIMS_SECRET_KEY=MyRealSecretKey2024!

# 기타 환경 변수
NODE_ENV=development
PORT=3000
```

---

## 🔐 보안 주의사항

### 1. **절대 커밋하지 마세요!**
```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### 2. **팀원과 안전하게 공유**
- Slack/이메일로 직접 전송 (❌)
- 비밀번호 관리 도구 사용 (✅)
  - 1Password
  - LastPass
  - Bitwarden

### 3. **정기적으로 갱신**
- 6개월~1년마다 Secret Key 재발급
- 퇴사자 발생 시 즉시 재발급

---

## ✅ 체크리스트

- [ ] RIMS 홈페이지에서 Secret Key 확인
- [ ] `.env` 파일에 정확히 복사 (공백 없이)
- [ ] 서버 로그에서 `Secret Key length: XX bytes` 확인
- [ ] 길이가 16, 24, 32 중 하나인지 확인
- [ ] 면허 인증 테스트 성공

---

## 🚀 다음 단계

Secret Key 설정이 완료되면:

1. 서버 재시작
   ```bash
   pnpm dev
   ```

2. Worker 등록 페이지 이동

3. 면허 인증 테스트
   ```
   이름: 홍경자
   면허번호: 16-99-619984-50
   [🔍 면허 인증]
   ```

4. 서버 로그 확인
   ```
   [RIMS Crypto] Secret Key length: 16 bytes
   [RIMS Crypto] Encryption successful
   [RIMS] Response status: 200
   [RIMS] Response data: {
     "header": { "f_rtn_cd": "0" },
     "body": { "f_rtn_code": "00" }
   }
   ✅ 인증 완료!
   ```

---

## 📞 문제가 계속되면?

1. **서버 로그 전체 복사**
2. **`.env` 파일 내용 확인** (Secret Key는 가림)
3. **RIMS 고객센터 문의**
   - 전화: 1577-0990
   - 이메일: rims@kotsa.or.kr

---

**Secret Key는 민감한 정보입니다. 절대 공개하지 마세요!** 🔒











