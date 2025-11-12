# Worker 기능 수정사항 체크리스트

**작성일**: 2025-11-05  
**우선순위**: 긴급 🔴

---

## ✅ 완료된 작업

### 1. 휴식 시간 계산 수정 ✅
- **문제**: 휴식 시간이 근로 시간에 포함됨
- **해결**: 실제 근로 시간 = 전체 시간 - 휴식 시간
- **파일**: `server/mobile-router.ts` (endWorkSession)
- **수정 완료**: ✅

---

## 🔴 긴급 수정 필요

### 2. 작업 확인서에 차량 번호/장비명 표시 안됨
- **문제**: 작업 확인서 목록에서 차량 번호와 장비명이 "-"로 표시됨
- **원인**: 백엔드 API에서 equipment 정보 JOIN 안 되어 있음
- **해결 방법**:
  1. `server/work-journal-router.ts` 확인
  2. `ownerList`, `bpList`, `epList` API에서 equipment JOIN 추가
  3. `vehicleNumber` (regNum), `equipmentName` (name), `specification` 포함

**수정 위치**:
```typescript
// server/work-journal-router.ts
.select(`
  *,
  equipment:equipment!work_journals_equipment_id_fkey(
    id,
    reg_num,
    equip_type:equip_types(name)
  )
`)
```

**테스트**:
- [ ] 작업 확인서 목록에서 차량 번호 표시 확인
- [ ] 작업 확인서 목록에서 장비명 표시 확인

---

### 3. OT/철야 시간 수동 입력 기능 추가
- **문제**: 버튼을 못 누른 경우 수동 조정 불가
- **요구사항**: Worker가 작업 종료 시 OT, 철야 시간 직접 입력 가능

**구현 방법**:
1. **작업 종료 시 다이얼로그 추가**
   - 일반 근로 시간 (자동 계산, 수정 가능)
   - OT 시간 (수동 입력)
   - 철야 시간 (수동 입력)

2. **UI 설계**:
```
┌─────────────────────────────────┐
│   작업 종료 확인                 │
├─────────────────────────────────┤
│ 작업 시간 정보:                  │
│                                  │
│ 총 작업 시간: 9시간 30분         │
│ 휴식 시간:   1시간               │
│ 실제 근로:   8시간 30분   ←자동  │
│                                  │
│ ┌─ 시간 조정 (선택사항) ─────┐ │
│ │                            │ │
│ │ 일반 근로: [8.5] 시간      │ │
│ │ OT(연장): [0] 시간         │ │
│ │ 철야:     [0] 시간         │ │
│ │                            │ │
│ │ ⚠️ 버튼을 못 누른 경우만   │ │
│ │   수동으로 입력하세요       │ │
│ └────────────────────────────┘ │
│                                  │
│ [취소]        [작업 종료]        │
└─────────────────────────────────┘
```

**파일 수정**:
- `client/src/pages/mobile/WorkerMain.tsx`
  - 작업 종료 다이얼로그 추가
  - 시간 입력 필드 추가
  - API 호출 시 수동 입력값 전송

- `server/mobile-router.ts`
  - `endWorkSession` API 수정
  - `regularHours`, `otHours`, `nightHours` 파라미터 추가

**테스트**:
- [ ] 작업 종료 시 다이얼로그 표시
- [ ] 자동 계산된 시간 확인
- [ ] 수동 입력 가능 확인
- [ ] 작업 확인서에 반영 확인

---

### 4. 작업 시작 시 경과 시간 표시 확인
- **문제**: "9:00부터 시작"이라고 함 (정확한 상황 불명)
- **현재 로직**: 00:00:00부터 카운트 (정상)
- **확인 필요**: 
  - [ ] 실제 화면에서 어떻게 표시되는지 확인
  - [ ] 현재 시각이 아닌 경과 시간이 맞는지 확인

**디버깅**:
```typescript
// client/src/pages/mobile/WorkerMain.tsx:210-215
const formatElapsedTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
```

이 로직은 정상입니다. 스크린샷 필요!

---

## 🎯 구현 우선순위

### 즉시 (오늘)
1. ✅ 휴식 시간 계산 수정 (완료)
2. 🔴 작업 확인서 차량 정보 표시
3. 🔴 OT/철야 수동 입력 기능

### 확인 필요
4. 작업 시작 시간 표시 이슈 (스크린샷 대기)

---

## 📊 예상 작업 시간

- **작업 확인서 차량 정보**: 30분
- **OT/철야 수동 입력**: 1-2시간
- **테스트**: 30분

**총 예상 시간**: 2-3시간

---

## 🧪 최종 테스트 시나리오

### 시나리오 1: 정상 작업
1. 작업 시작 → `00:00:00` 카운트 시작
2. 1시간 작업
3. 휴식 시작
4. 15분 휴식
5. 휴식 종료
6. 1시간 더 작업
7. 작업 종료
   - 총 작업 시간: 2시간 15분
   - 휴식 시간: 15분
   - 실제 근로: 2시간 ✅
   - OT: 0시간
   - 철야: 0시간

### 시나리오 2: 버튼 못 누른 경우
1. 작업 시작
2. (휴식 버튼 안 누름...)
3. 8시간 후 작업 종료
4. 다이얼로그에서 수동 조정:
   - 일반: 7시간
   - OT: 1시간
   - 철야: 0시간
5. 작업 확인서에 반영 확인 ✅

---

## 📁 관련 파일

### 프론트엔드
- `client/src/pages/mobile/WorkerMain.tsx` - Worker 메인 페이지
- `client/src/pages/WorkJournal.tsx` - 작업 확인서 목록
- `client/src/pages/mobile/WorkLog.tsx` - 모바일 작업 일지

### 백엔드
- `server/mobile-router.ts` - Worker API
- `server/work-journal-router.ts` - 작업 확인서 API
- `server/db.ts` - 데이터베이스 함수

### 데이터베이스
- `work_sessions` 테이블
- `work_journals` 테이블
- `equipment` 테이블

---

**다음 작업**: 작업 확인서 차량 정보 표시 수정부터 시작!
























