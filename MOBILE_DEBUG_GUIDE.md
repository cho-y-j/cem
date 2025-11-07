# 모바일 Worker 앱 디버깅 가이드

## 문제 해결 과정

### 1. 배정된 장비가 안 보이는 문제

**원인**: `getEquipmentByAssignedWorker` 함수가 `db.ts`에 없었음

**해결**: 함수 추가
```typescript
export async function getEquipmentByAssignedWorker(workerId: string): Promise<Equipment | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equip_type:equip_types!equipment_equip_type_id_fkey(id, name, description)
    `)
    .eq('assigned_worker_id', workerId)
    .single();

  if (error) {
    console.log("[Database] No equipment assigned to worker:", workerId);
    return undefined;
  }

  return toCamelCase(data) as Equipment;
}
```

### 2. 배정된 장비 조회 로직 개선

**수정 위치**: `server/mobile-router.ts` - `getMyAssignedEquipment`

**로직**:
1. `equipment.assigned_worker_id`로 배정된 장비 조회
2. 없으면 활성 `deployment`에서 장비 조회

```typescript
// 1. equipment.assigned_worker_id로 배정된 장비 조회
let equipment = await db.getEquipmentByAssignedWorker(worker.id);

// 2. assigned_worker_id가 없으면, deployment에서 확인
if (!equipment) {
  const deployments = await db.getDeploymentsByUserId(ctx.user.id, {
    status: "active",
  });
  
  if (deployments && deployments.length > 0) {
    const deployment = deployments[0];
    if (deployment.equipmentId) {
      equipment = await db.getEquipmentById(deployment.equipmentId);
    }
  }
}
```

### 3. 긴급 상황 버튼 UI 개선

**변경 내용**:
- `prompt` 제거
- Dialog 컴포넌트로 변경
- 모바일 친화적인 UI

## 디버깅 방법

### 브라우저 개발자 도구

1. `F12` 또는 `Ctrl+Shift+I`로 개발자 도구 열기
2. Console 탭에서 로그 확인:

```
[WorkerMain] User: { ... }
[WorkerMain] Assigned Equipment: { ... } 또는 null
[WorkerMain] Current Deployment: { ... } 또는 undefined
```

3. Network 탭에서 API 호출 확인:
   - `trpc/mobile.worker.getMyAssignedEquipment` 
   - `trpc/deployments.getMyDeployment`

### 서버 로그 확인

터미널에서 다음과 같은 로그 확인:

```
[Mobile] getMyAssignedEquipment called for user: <user_id> <user_name>
[Mobile] Looking for worker with PIN: <pin>
[Mobile] Found worker: <worker_id> <worker_name>
[Mobile] Equipment result: <equipment_id> 또는 null
```

## 테스트 체크리스트

### 1. 배정된 장비 표시

- [ ] 로그인 후 페이지 로딩
- [ ] 배정된 장비 카드 표시 확인
- [ ] 장비 번호와 유형 표시 확인

### 2. 작업 시작 버튼

- [ ] 버튼 활성화 상태 확인
- [ ] 클릭 시 토스트 메시지 표시
- [ ] 작업 세션 시작 확인
- [ ] 타이머 시작 확인

### 3. 긴급 상황 버튼

- [ ] 버튼 활성화 상태 확인
- [ ] 클릭 시 Dialog 열림 확인
- [ ] 유형 선택 가능 확인
- [ ] 설명 입력 가능 확인
- [ ] 제출 버튼 작동 확인
- [ ] 위치 정보 전송 확인

### 4. 휴식/연장 버튼

- [ ] 작업 중일 때만 표시
- [ ] 클릭 시 상태 변경 확인
- [ ] 타이머 상태 변경 확인

## 일반적인 문제 해결

### 배정된 장비가 안 보일 때

1. **Worker 테이블 확인**:
```sql
SELECT * FROM workers WHERE pin = '<PIN>';
```

2. **Equipment 테이블 확인**:
```sql
SELECT * FROM equipment WHERE assigned_worker_id = '<worker_id>';
```

3. **Deployment 테이블 확인**:
```sql
SELECT * FROM deployments 
WHERE worker_id = '<worker_id>' 
AND status = 'active';
```

### 버튼이 작동하지 않을 때

1. 브라우저 콘솔에서 에러 확인
2. 네트워크 탭에서 API 호출 실패 확인
3. 서버 터미널에서 에러 로그 확인

### 위치 정보가 전송되지 않을 때

1. 브라우저 위치 권한 확인
2. HTTPS 연결 확인 (localhost는 예외)
3. 콘솔에서 Geolocation API 에러 확인

## 추가 정보

### 데이터베이스 스키마

**equipment 테이블**:
- `id`: 장비 ID
- `reg_num`: 차량 번호
- `assigned_worker_id`: 배정된 운전자 ID
- `equip_type_id`: 장비 유형 ID

**workers 테이블**:
- `id`: Worker ID
- `user_id`: 연결된 User ID (users 테이블)
- `pin`: PIN 코드

**deployments 테이블**:
- `id`: 투입 ID
- `worker_id`: Worker ID
- `equipment_id`: 장비 ID
- `status`: 투입 상태 (active, completed, etc.)

### API 엔드포인트

- `trpc.mobile.worker.getMyAssignedEquipment`: 배정된 장비 조회
- `trpc.deployments.getMyDeployment`: 현재 투입 정보 조회
- `trpc.mobile.worker.getCurrentSession`: 현재 작업 세션 조회
- `trpc.mobile.worker.startWorkSession`: 작업 시작
- `trpc.mobile.worker.sendEmergencyAlert`: 긴급 상황 신고

