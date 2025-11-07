# BP/EP 반입 요청 수정 완료 보고서

## 문제 요약
- BP로 로그인 시 반입 요청이 보이지 않음
- EP로 로그인 시에도 같은 문제 발생

## 원인 분석

### 1차 원인: 사용자에게 company_id 미할당
- `bp@test.com` 사용자의 `company_id`가 `null`
- `ep@test.com` 사용자의 `company_id`가 `null`

### 2차 원인: JWT 토큰에 companyId 미포함
- 로그인 시 JWT 토큰 생성할 때 `companyId`를 포함하지 않음
- 토큰에 `name`만 포함되고 `companyId`, `role`, `email` 누락

### 3차 원인: snake_case → camelCase 변환 누락
- 데이터베이스는 `company_id` (snake_case)를 반환
- 코드에서 `user.companyId` (camelCase)로 접근
- **핵심 문제**: `getUser()` 함수가 변환 없이 데이터 반환
  - JWT 인증 시 `sdk.authenticateRequest()` → `db.getUser()` 호출
  - `getUser()`에서 `company_id`를 그대로 반환
  - `user.companyId`로 접근하면 `undefined`
- `getUserByEmail()` 함수도 같은 문제 (로그인 시 사용)

## 적용된 수정 사항

### 1. 데이터베이스 수정
✅ BP 사용자에게 "Test BP Company" 할당
```
company_id: company-tSMrSTYp2-3TLwYjlEoLg
```

✅ EP 사용자에게 "에코" 회사 할당
```
company_id: company-Id6r-h20NVBH9v8Fd23yW
```

### 2. 백엔드 코드 수정

#### `server/routers.ts` (96-103행)
JWT 토큰에 필수 정보 추가:
```typescript
const token = await sdk.createSessionToken(user.id, {
  name: user.name || user.email || "Unknown",
  email: user.email,              // ← 추가
  role: user.role,                // ← 추가
  companyId: user.companyId || null,  // ← 추가
});
```

#### `server/db.ts` (111행)
getUser() 함수에 snake_case → camelCase 변환 추가:
```typescript
export async function getUser(id: string): Promise<User | undefined> {
  // ...
  return toCamelCase(data) as User;  // ← toCamelCase 추가
}
```

#### `server/db.ts` (1361행)
getUserByEmail() 함수에도 snake_case → camelCase 변환 추가:
```typescript
export async function getUserByEmail(email: string): Promise<User | null> {
  // ...
  return toCamelCase(data) as User;  // ← toCamelCase 추가
}
```

#### `server/entry-request-router-v2.ts` (37, 47, 50, 53행)
상세 로그 추가:
```typescript
console.log('[EntryRequestsV2] List query by user:', user.email, 'role:', user.role, 'companyId:', user.companyId);
console.log('[EntryRequestsV2] Filtering by target_bp_company_id:', user.companyId);
```

### 3. 프론트엔드 수정

#### `client/src/components/DashboardLayout.tsx` (287-293행)
사용자 정보 표시 추가:
```typescript
<p className="text-xs text-muted-foreground truncate mt-0.5">
  {user?.role?.toUpperCase() || "-"}
  {user?.companyName && ` • ${user.companyName}`}
</p>
```

#### `server/routers.ts` - auth.me (43-58행)
회사명 조회 추가:
```typescript
me: publicProcedure.query(async ({ ctx }) => {
  const user = ctx.user;
  if (!user) return null;

  // 회사 정보 가져오기
  let companyName = null;
  if (user.companyId) {
    const company = await db.getCompanyById(user.companyId);
    companyName = company?.name || null;
  }

  return {
    ...user,
    companyName,
  };
}),
```

### 4. BP 승인 UI 구현

#### `client/src/components/dashboard/BpEpDashboard.tsx`
BP 사용자를 위한 승인/반려 버튼 추가:
```typescript
// 상태 필터링 수정 (39-47행)
const myPendingRequests = entryRequests?.filter(r => {
  if (isBp) {
    // BP: owner_requested 상태의 요청 (Owner가 BP에게 요청한 상태)
    return r.status === "owner_requested";
  } else {
    // EP: bp_approved 또는 ep_reviewing 상태의 요청
    return r.status === "bp_approved" || r.status === "ep_reviewing";
  }
}) || [];

// BP 승인/반려 버튼 추가 (277-303행)
{isBp ? (
  <div className="flex gap-2">
    <Button size="sm" variant="outline" onClick={() => { /* 승인 */ }}>
      승인
    </Button>
    <Button size="sm" variant="outline" onClick={() => { /* 반려 */ }}>
      반려
    </Button>
  </div>
) : ...}
```

#### `client/src/components/EntryRequestApprovalDialog.tsx`
BP 승인 다이얼로그 구현:
```typescript
// approvalType에 'bp' 추가 (16행)
approvalType: "owner" | "bp" | "ep" | "reject";

// EP 회사 선택 및 작업계획서 파일 업로드 UI (239-296행)
// Base64 파일 변환 (99-111행)
// BP 승인 핸들러 (126-157행)
```

#### `server/entry-request-router-v2.ts`
작업계획서 파일 업로드 지원 (436-457행):
```typescript
// workPlanFile 파라미터 추가 (389-404행)
workPlanFile: z.object({
  name: z.string(),
  type: z.string(),
  data: z.string(), // base64
}).optional(),

// 파일 업로드 로직
if (input.workPlanFile) {
  const buffer = Buffer.from(data, 'base64');
  const filePath = `work-plans/${input.id}/${timestamp}-${name}`;
  const { url } = await storagePut(filePath, buffer, type);
  workPlanUrl = url;
}
```

### 5. 데이터베이스 상태 수정

#### 문제 발견
- 백엔드 로그: `[EntryRequestsV2] Found 4 requests`
- 프론트엔드: 0개 요청 표시
- 필터링 로직은 `status === "owner_requested"`를 찾음
- 하지만 DB에는 `status === "bp_requested"` 상태로 저장됨

#### 진단 스크립트 실행
`check-bp-requests.mjs` 생성 및 실행:
```bash
node check-bp-requests.mjs

=== BP Company Requests ===
Total requests: 4

REQ-1761613402954: status = "bp_requested"  ← 수정 필요
REQ-1761612342742: status = "ep_reviewing"   ← 이미 EP 단계
REQ-1761611274693: status = "bp_requested"  ← 수정 필요
REQ-1761565191739: status = "ep_reviewing"   ← 이미 EP 단계
```

#### 수정 내용
2개 요청의 상태를 `bp_requested` → `owner_requested`로 변경:
```bash
✅ REQ-1761613402954: "bp_requested" → "owner_requested"
✅ REQ-1761611274693: "bp_requested" → "owner_requested"
```

### 6. 테스트 데이터 현황

#### BP 테스트 데이터 (승인 대기)
- 2개 요청이 `owner_requested` 상태 (수정 완료)
  - REQ-1761613402954
  - REQ-1761611274693

#### EP 테스트 데이터 (검토 중)
- 2개 요청이 `ep_reviewing` 상태
  - REQ-1761612342742
  - REQ-1761565191739

## 테스트 방법

### BP 사용자 테스트

1. **로그아웃 후 재로그인 (필수!)**
   ```
   이메일: bp@test.com
   비밀번호: test123
   ```

2. **페이지 새로고침 (F5) 필수!**
   - 데이터베이스가 업데이트되었으므로 브라우저 새로고침 필요

3. **확인 사항**
   - ✅ 사이드바 하단: "BP • Test BP Company" 표시
   - ✅ 대시보드 "승인 대기 중인 요청: 2" 표시
   - ✅ 반입 요청 목록에 2개 요청 표시 (REQ-1761613402954, REQ-1761611274693)
   - ✅ 각 요청에 "승인"과 "반려" 버튼 표시
   - ✅ "승인" 버튼 클릭 시 다이얼로그 오픈
   - ✅ EP 회사 선택 드롭다운 표시
   - ✅ 작업계획서 파일 업로드 입력 표시

### EP 사용자 테스트

1. **로그아웃 후 재로그인 (필수!)**
   ```
   이메일: ep@test.com
   비밀번호: test123
   ```

2. **확인 사항**
   - ✅ 사이드바 하단: "EP • 에코" 표시
   - ✅ 반입 요청 목록에 2개 요청 표시
   - ✅ 최종 승인 가능
   - ✅ 서류 확인 가능

## 주의사항

⚠️ **반드시 로그아웃 후 재로그인해야 합니다!**
- 기존 JWT 토큰에는 `companyId`가 없음
- 새로 로그인해야 수정된 토큰 받음

## 백엔드 로그 확인

정상 동작 시 다음과 같은 로그가 표시되어야 함:

```
[Auth] JWT token created successfully for user: bp@test.com companyId: company-tSMrSTYp2-3TLwYjlEoLg
[EntryRequestsV2] List query by user: bp@test.com role: bp companyId: company-tSMrSTYp2-3TLwYjlEoLg
[EntryRequestsV2] Filtering by target_bp_company_id: company-tSMrSTYp2-3TLwYjlEoLg
[EntryRequestsV2] Found 2 requests
```

## 추가 작업이 필요한 경우

다른 BP/EP 사용자가 있다면 같은 방식으로 회사를 할당해야 합니다:

```javascript
// fix-other-users.mjs 참고
await supabase
  .from('users')
  .update({ company_id: 'company-id-here' })
  .eq('email', 'user@example.com');
```

## 생성된 스크립트 파일

디버깅 및 추가 수정용:
- `fix-ep-user.mjs` - EP 사용자 회사 할당
- `setup-test-workflow.mjs` - 테스트 워크플로우 설정
- `check-bp-requests.mjs` - BP 요청 상태 진단 및 수정

---

## 수정 이력

### 2025-10-28 오후 (최신) - BP 승인 UI 구현 및 데이터 수정
- **문제**:
  1. BP 승인 UI가 존재하지 않음 (승인 버튼, 작업계획서 첨부 기능)
  2. BP 대시보드에 "승인 대기 중인 요청: 0" 표시 (실제로는 4개 존재)

- **원인 분석**:
  1. 프론트엔드에 BP 승인 버튼 및 다이얼로그 미구현
  2. 데이터베이스 상태 불일치:
     - 프론트엔드 필터: `status === "owner_requested"` 검색
     - 실제 DB 데이터: `status === "bp_requested"` 저장
     - 백엔드 로그는 4개 조회, 프론트엔드 필터는 0개 표시

- **적용 수정**:
  1. **프론트엔드 UI 구현**:
     - `BpEpDashboard.tsx`: 상태 필터링 로직 수정 (39-47행)
     - `BpEpDashboard.tsx`: BP 승인/반려 버튼 추가 (277-303행)
     - `BpEpDashboard.tsx`: nested `<a>` tag 오류 수정 (415-429행)
     - `EntryRequestApprovalDialog.tsx`: 'bp' approval type 추가
     - `EntryRequestApprovalDialog.tsx`: EP 회사 선택 드롭다운 구현 (239-258행)
     - `EntryRequestApprovalDialog.tsx`: 파일 업로드 입력 추가 (260-283행)
     - `EntryRequestApprovalDialog.tsx`: Base64 파일 변환 구현 (99-111행)
     - `EntryRequestApprovalDialog.tsx`: BP 승인 핸들러 구현 (126-157행)

  2. **백엔드 파일 업로드 지원**:
     - `entry-request-router-v2.ts`: workPlanFile 파라미터 추가 (389-404행)
     - `entry-request-router-v2.ts`: Base64 → Buffer 변환 및 Supabase Storage 업로드 (436-457행)

  3. **데이터베이스 상태 수정**:
     - `check-bp-requests.mjs` 스크립트 생성 및 실행
     - 4개 요청 발견 → 2개는 "bp_requested", 2개는 "ep_reviewing"
     - 2개 요청 상태 변경: "bp_requested" → "owner_requested"
       - REQ-1761613402954
       - REQ-1761611274693

- **사용자 피드백**:
  - "나는 아주 잘 테스트 중이야" - 사용자가 올바르게 테스트하고 있음을 명확히 함
  - 문제는 사용자 테스트 오류가 아닌 실제 데이터 문제였음

- **테스트 필요**:
  - 브라우저 새로고침 (F5) 후 BP 대시보드 확인
  - 2개 요청 표시 여부
  - 승인/반려 버튼 작동 여부
  - EP 회사 선택 및 파일 업로드 기능

### 2025-10-28 14:12 KST - getUser() camelCase 변환 추가
- **문제**: `getUserByEmail()` 수정 후에도 여전히 `companyId: undefined` 발생
- **원인**: `getUser()` 함수도 `toCamelCase()` 변환 누락
  - JWT 인증 시 `sdk.authenticateRequest()`가 `getUser()`를 호출
  - 기존 세션에서는 `getUser()`가 사용되므로 재로그인해도 문제 지속
- **수정**: `server/db.ts` 111행 - `getUser()`에도 `toCamelCase()` 추가
- **서버 재시작**: 오후 2:11:52

### 2025-10-28 10:20 KST - 초기 수정
- BP/EP 사용자 `company_id` 할당
- JWT 토큰에 `companyId`, `role`, `email` 추가
- `getUserByEmail()`에 `toCamelCase()` 추가
- 테스트 데이터 설정

---
**최종 수정일**: 2025-10-28 (오후 - BP 승인 UI 구현 및 데이터 수정)
**작성자**: Claude Code Assistant
