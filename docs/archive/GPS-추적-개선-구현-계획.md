# GPS 추적 시스템 개선 - 최종 구현 계획

**작성일**: 2025-01-XX  
**상태**: 구현 대기 중

---

## 목표

- 자동 GPS 추적 완전 제거 (개인정보 보호)
- 출퇴근 시 위치 자동 기록 유지
- 작업자 수동 위치 전송 기능 추가 (UI/UX 개선)
- 관리자 화면에 마지막 업데이트 시간 표시 개선

---

## 1. 자동 GPS 추적 완전 제거

### 파일: `client/src/pages/mobile/WorkerMain.tsx`

**제거할 코드**:
- `locationInterval` state (47줄)
- `gpsIntervalMinutes` state (48줄)
- `gpsIntervalData` query (90-94줄)
- `startLocationTracking()` 함수 (322-344줄)
- `stopLocationTracking()` 함수 (346-353줄)
- 작업 세션 상태 변경 시 GPS 전송 로직 (355-376줄 useEffect)
- 작업 시작/종료/휴식 시 GPS 추적 호출 (154, 166, 178, 192줄)

**작업 내용**:
- 위의 모든 코드 제거
- GPS 관련 import 정리 (필요한 것만 유지)

---

## 2. 퇴근 시 위치 자동 기록 추가

### 파일: `client/src/pages/mobile/WorkerMain.tsx`

**수정할 부분**: `endWorkMutation` (162-171줄)

**작업 내용**:
- 퇴근 버튼 클릭 시 GPS 위치 수집
- 위치 수집 후 `endWorkSession` mutation에 위치 정보 포함하여 전송
- 서버에서 `location_logs` 테이블에 기록

### 파일: `server/mobile-router.ts`

**수정할 부분**: `endWorkSession` mutation (273-301줄)

**작업 내용**:
- 입력에 `latitude`, `longitude`, `accuracy` 추가 (optional)
- 위치 정보가 있으면 `location_logs` 테이블에 기록
- 배정된 장비 ID 조회하여 기록

---

## 3. 작업자 수동 위치 전송 버튼 추가 (UI/UX 개선)

### 파일: `client/src/pages/mobile/WorkerMain.tsx`

**추가 위치**: 빠른 메뉴 섹션 (868-903줄 이후)

**UI 디자인**:
- 그라데이션 배경: `from-green-500 to-green-600`
- 큰 아이콘: MapPin (6x6)
- 명확한 텍스트: "현위치 전송" + "관리자에게 현재 위치를 전송합니다"
- 전송 중 로딩 상태 표시
- 성공/실패 토스트 메시지

**구현 내용**:
- `isSendingLocation` state 추가
- `handleSendLocation` 함수 추가:
  - GPS 위치 수집
  - `sendLocationMutation` 호출
  - 성공: "위치가 전송되었습니다" 토스트
  - 실패: "위치 전송에 실패했습니다" 토스트
- `sendLocationWithRetry` 함수는 유지 (수동 전송용)

**코드 예시**:
```tsx
const [isSendingLocation, setIsSendingLocation] = useState(false);

const handleSendLocation = () => {
  if (!assignedEquipment) {
    toast.error("배정된 장비가 없습니다.");
    return;
  }

  setIsSendingLocation(true);
  
  if (!("geolocation" in navigator)) {
    toast.error("이 기기는 위치 정보를 지원하지 않습니다.");
    setIsSendingLocation(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await sendLocationMutation.mutateAsync({
          equipmentId: assignedEquipment.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        toast.success("위치가 전송되었습니다.");
      } catch (error: any) {
        toast.error("위치 전송에 실패했습니다: " + error.message);
      } finally {
        setIsSendingLocation(false);
      }
    },
    (error) => {
      toast.error("위치 정보를 가져올 수 없습니다.");
      setIsSendingLocation(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};
```

**버튼 UI**:
```tsx
<Button
  size="lg"
  className="w-full h-16 text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg active:scale-95 transition-transform"
  onClick={handleSendLocation}
  disabled={!assignedEquipment || isSendingLocation}
>
  {isSendingLocation ? (
    <>
      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      전송 중...
    </>
  ) : (
    <>
      <MapPin className="mr-2 h-6 w-6" />
      <div className="text-left flex-1">
        <div>현위치 전송</div>
        <div className="text-xs text-white/80 font-normal">
          관리자에게 현재 위치를 전송합니다
        </div>
      </div>
    </>
  )}
</Button>
```

---

## 4. 관리자 화면 개선 - 마지막 업데이트 시간 표시

### 파일: `server/db.ts`

**수정할 부분**: `getAllActiveLocations` 함수 (2958-3387줄)

**작업 내용**:
- 각 worker의 오늘 출근 시간 조회 (`check_ins` 테이블)
- 반환 데이터에 `checkInTime` 필드 추가
- 출근 시간이 있으면 "출근: 09:00" 형식으로 표시
- 출근 시간이 없으면 "마지막 업데이트: 14:30" 형식으로 표시

**쿼리 추가**:
```typescript
// worker별 오늘 출근 시간 조회
const checkInMap = new Map<string, Date>();
if (resultWorkerIds.length > 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('worker_id, check_in_time')
    .in('worker_id', resultWorkerIds)
    .gte('check_in_time', today.toISOString());
  
  if (checkIns) {
    checkIns.forEach((ci: any) => {
      if (!checkInMap.has(ci.worker_id)) {
        checkInMap.set(ci.worker_id, new Date(ci.check_in_time));
      }
    });
  }
}

// 각 location에 출근 시간 추가
result.forEach((loc: any) => {
  if (loc.worker_id && checkInMap.has(loc.worker_id)) {
    loc.checkInTime = checkInMap.get(loc.worker_id);
  }
});
```

### 파일: `client/src/pages/LocationTracking.tsx`

**수정할 부분**: 마커 정보창 (228-239줄), 위치 목록 (585-600줄)

**작업 내용**:
- 출근 시간이 있으면 "출근: 09:00" 표시
- 출근 시간이 없으면 "마지막 업데이트: 14:30" 표시
- 시간 포맷: `toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })`

**코드 예시**:
```tsx
const formatLocationTime = (loc: any) => {
  if (loc.checkInTime) {
    const checkInTime = new Date(loc.checkInTime);
    return `출근: ${checkInTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (loc.logged_at || loc.loggedAt) {
    const loggedAt = new Date(loc.logged_at || loc.loggedAt);
    return `마지막 업데이트: ${loggedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return "시간 정보 없음";
};
```

---

## 5. PWA 바탕화면 아이콘 안내 추가

### 파일: `client/src/pages/mobile/WorkerMain.tsx`

**추가 위치**: 출근 체크 섹션 이후 또는 빠른 메뉴 이전

**작업 내용**:
- PWA 설치 가능 여부 확인
- iOS/Android 구분하여 안내 메시지 표시
- 한 번 보면 다시 안 보이도록 localStorage 사용 (선택 사항)

**코드 예시**:
```tsx
const [showPWAHint, setShowPWAHint] = useState(false);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

useEffect(() => {
  // 이미 설치되어 있으면 안내 표시 안 함
  if (isStandalone) return;
  
  // 한 번 본 적이 있으면 안내 표시 안 함
  const hasSeenHint = localStorage.getItem('pwa-hint-seen');
  if (hasSeenHint) return;
  
  setShowPWAHint(true);
}, []);

const handleDismissPWAHint = () => {
  localStorage.setItem('pwa-hint-seen', 'true');
  setShowPWAHint(false);
};
```

**UI 예시**:
```tsx
{showPWAHint && (
  <div className="px-4 mb-4">
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-blue-900 mb-1">
              홈 화면에 추가
            </div>
            <div className="text-sm text-blue-800 mb-2">
              {isIOS ? (
                <>공유 버튼(□↑) → 홈 화면에 추가</>
              ) : (
                <>메뉴(⋮) → 홈 화면에 추가</>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-700"
              onClick={handleDismissPWAHint}
            >
              닫기
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

---

## 6. 출근 시 위치 기록 확인

### 파일: `server/check-in-router.ts`

**확인 사항**: 출근 시 위치 기록 로직 (257-275줄)

**작업 내용**:
- 이미 구현되어 있으면 유지
- 없으면 추가 (이미 추가되어 있음)

---

## 구현 순서

1. **자동 GPS 추적 제거** (가장 중요, 개인정보 보호)
2. **작업자 수동 위치 전송 버튼 추가** (UI/UX 개선)
3. **퇴근 시 위치 자동 기록 추가**
4. **관리자 화면 개선** (마지막 업데이트 시간 표시)
5. **PWA 안내 추가**

---

## 주의사항

- 자동 GPS 추적 관련 코드를 완전히 제거하여 개인정보 보호
- 작업자 UI/UX를 개선하여 사용 편의성 향상
- 출퇴근 위치는 필수이므로 자동 기록 유지
- 수동 전송은 선택 사항이므로 명확한 피드백 제공
- 배터리 소모 최소화 (수동 전송만 사용)

---

## 테스트 체크리스트

- [ ] 자동 GPS 추적이 완전히 제거되었는지 확인
- [ ] 출근 시 위치가 자동으로 기록되는지 확인
- [ ] 퇴근 시 위치가 자동으로 기록되는지 확인
- [ ] 수동 위치 전송 버튼이 정상 작동하는지 확인
- [ ] 관리자 화면에 출근 시간이 표시되는지 확인
- [ ] 관리자 화면에 마지막 업데이트 시간이 표시되는지 확인
- [ ] PWA 안내가 표시되는지 확인

