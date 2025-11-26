# 모바일 로그인 방식 개선 제안

## 📌 현재 문제점

### ❌ PIN 번호만으로 로그인
```
Worker A: PIN 1234
Worker B: PIN 1234  ← 중복 가능! 누가 로그인한 건지 구분 불가
```

**문제:**
1. ✗ PIN 중복 가능 (4자리 숫자만으로는 고유성 보장 불가)
2. ✗ 보안 취약 (숫자 4자리는 쉽게 추측 가능)
3. ✗ DB 쿼리에서 `.single()` 사용 → 중복 시 에러 발생
4. ✗ Worker 간 충돌 가능성

**현재 코드:**
```typescript
// server/db.ts
export async function getWorkerByPinCode(pinCode: string) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('pin_code', pinCode)
    .single();  // ← 중복 PIN이면 에러!
}
```

---

## ✅ 제안: 이메일 + 비밀번호 로그인 + 자동 로그인

### 1️⃣ **첫 로그인: 이메일 + 비밀번호**

```
┌─────────────────────────────┐
│  🔐 모바일 로그인            │
├─────────────────────────────┤
│  이메일                      │
│  [worker@company.com]        │
│                              │
│  비밀번호                    │
│  [••••••••]                  │
│                              │
│  ☑️ 이 기기에 로그인 유지     │
│                              │
│  [로그인]                    │
└─────────────────────────────┘
```

### 2️⃣ **다음부터: 자동 로그인**

```
기기에 저장된 인증 토큰으로 자동 로그인
↓
앱 실행 → 즉시 메인 화면
```

---

## 🎯 개선 방안 비교

| 항목 | 현재 (PIN) | 제안 (Email + Password + 자동) |
|-----|-----------|------------------------------|
| **보안** | ❌ 낮음 (4자리 숫자) | ✅ 높음 (이메일 + 비밀번호) |
| **중복 가능성** | ❌ 높음 | ✅ 없음 (이메일은 고유) |
| **사용 편의성** | △ 매번 4자리 입력 | ✅ 한 번 로그인 → 자동 로그인 |
| **Worker 구분** | ❌ PIN 중복 시 구분 불가 | ✅ 이메일로 명확히 구분 |
| **비밀번호 재설정** | ❌ 관리자만 가능 | ✅ 본인이 재설정 가능 |
| **다중 기기 지원** | △ 가능하지만 불편 | ✅ 각 기기에서 자동 로그인 |

---

## 🔧 구현 방안

### A. **개선안 1: 이메일 + 비밀번호 (추천) ⭐**

```typescript
// 1️⃣ 첫 로그인
loginMutation.mutate({
  email: "worker@company.com",
  password: "SecurePass123!",
  rememberMe: true  // 자동 로그인 체크박스
});

// 2️⃣ 로그인 성공 시 토큰 저장
localStorage.setItem('authToken', data.token);
localStorage.setItem('refreshToken', data.refreshToken);

// 3️⃣ 앱 실행 시 자동 로그인
const token = localStorage.getItem('authToken');
if (token) {
  // 토큰으로 자동 로그인
  autoLoginMutation.mutate({ token });
}
```

**장점:**
- ✅ 보안 강화 (이메일 + 비밀번호)
- ✅ 중복 불가 (이메일은 고유)
- ✅ 사용자 편의성 최고 (한 번만 로그인)
- ✅ 표준 인증 방식

**단점:**
- △ 첫 로그인 시 이메일 입력 필요 (하지만 한 번만)

---

### B. **개선안 2: PIN + 회사 코드**

```
┌─────────────────────────────┐
│  회사 코드: ABC123           │  ← 회사별 고유 코드
│  PIN: 1234                   │  ← Worker별 PIN
└─────────────────────────────┘

중복 방지: 회사코드 + PIN 조합으로 고유성 보장
예: ABC123-1234, XYZ789-1234 (다른 Worker)
```

**장점:**
- ✅ 기존 PIN 방식 유지
- ✅ 회사 단위로 PIN 중복 방지

**단점:**
- ❌ 여전히 회사 내에서 PIN 중복 가능
- ❌ 회사 코드를 기억해야 함
- ❌ 보안 여전히 낮음

---

### C. **개선안 3: QR 코드 로그인**

```
┌─────────────────────────────┐
│  📱 QR 코드로 로그인         │
│                              │
│  관리자가 발급한 QR 코드를   │
│  스캔하세요                  │
│                              │
│  [카메라 열기]               │
└─────────────────────────────┘
```

**장점:**
- ✅ 편리함 (QR 스캔만)
- ✅ 보안 (QR에 암호화된 토큰)

**단점:**
- ❌ QR 코드 발급 시스템 필요
- ❌ 카메라 권한 필요
- ❌ 개발 복잡도 높음

---

## 📊 최종 추천: **개선안 1 (이메일 + 비밀번호 + 자동 로그인)** ⭐

### 이유:

1. **보안 강화**: 이메일 + 비밀번호는 업계 표준
2. **중복 방지**: 이메일은 고유하므로 Worker 구분 명확
3. **사용자 편의성**: 한 번만 로그인하면 자동 로그인
4. **표준 인증**: JWT 토큰 기반, 리프레시 토큰으로 보안 유지
5. **기존 시스템 호환**: 데스크톱과 동일한 인증 방식

### 사용자 경험:

```
📱 첫 사용:
1. 이메일 + 비밀번호 입력
2. "이 기기에 로그인 유지" 체크
3. 로그인

📱 다음부터:
1. 앱 실행 → 즉시 메인 화면
   (인증 토큰으로 자동 로그인)
```

---

## 🚀 구현 순서

### 1단계: 모바일 로그인 페이지 수정
- PIN 입력 → 이메일 + 비밀번호 입력
- "로그인 유지" 체크박스 추가

### 2단계: 인증 토큰 저장
- localStorage에 authToken, refreshToken 저장
- 토큰 만료 시 자동 갱신

### 3단계: 자동 로그인 구현
- 앱 실행 시 토큰 확인
- 유효한 토큰이 있으면 자동 로그인

### 4단계: 보안 강화
- 토큰 암호화 저장
- 리프레시 토큰으로 보안 유지
- 로그아웃 시 토큰 삭제

---

## 📝 예상 코드

### 모바일 로그인 페이지
```typescript
export default function MobileLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (rememberMe) {
        // 토큰 저장
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      setLocation("/mobile/worker");
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      loginMutation.mutate({ email, password });
    }}>
      <Input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Checkbox
        checked={rememberMe}
        onCheckedChange={setRememberMe}
      >
        이 기기에 로그인 유지
      </Checkbox>
      <Button type="submit">로그인</Button>
    </form>
  );
}
```

### 자동 로그인 체크
```typescript
// App.tsx 또는 최상위 컴포넌트
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (token) {
    // 토큰 유효성 확인 후 자동 로그인
    autoLoginMutation.mutate({ token });
  }
}, []);
```

---

## 🎯 결론

**PIN 방식의 문제:**
- ❌ 중복 가능
- ❌ 보안 취약
- ❌ Worker 구분 불가

**이메일 + 비밀번호 + 자동 로그인의 장점:**
- ✅ 보안 강화
- ✅ 중복 불가
- ✅ 사용자 편의성 최고
- ✅ 표준 인증 방식

**추천: 개선안 1 (이메일 + 비밀번호 + 자동 로그인)** ⭐

































