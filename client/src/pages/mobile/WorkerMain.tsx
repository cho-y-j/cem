import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import MobileLayout from "@/components/mobile/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Play,
  Square,
  Coffee,
  Clock,
  AlertTriangle,
  AlertCircle,
  Truck,
  MapPin,
  Building2,
  Calendar,
  PackageCheck,
  Loader2,
  ClipboardCheck,
  CheckCircle,
  Fingerprint,
  Settings,
  Trash2,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { startAuthentication } from '@simplewebauthn/browser';
import { useFcmToken } from "@/hooks/useFcmToken";
import { Capacitor } from "@capacitor/core";
import { isNativeApp, isBiometricAvailable as checkBiometricAvailable, performNativeBiometricAuth } from "@/utils/biometricAuth";

export default function WorkerMain() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // FCM 토큰 등록 (모바일 앱에서만 작동)
  useFcmToken();

  // 로그인 체크 (로딩 중일 때는 리다이렉션하지 않음)
  useEffect(() => {
    const token = localStorage.getItem('authToken');

    // 토큰이 없으면 즉시 로그인 페이지로 리다이렉션
    if (!token) {
      console.log('[WorkerMain] No token found, redirecting to login');
      setLocation("/mobile/login");
      return;
    }

    // 로딩 중이면 대기
    if (loading) {
      console.log('[WorkerMain] Loading user info...');
      return;
    }

    // 사용자 정보가 있으면 역할 확인
    if (user) {
      if (user.role !== "worker") {
        console.log('[WorkerMain] User is not a worker, redirecting to login', { role: user.role });
        setLocation("/mobile/login");
      } else {
        console.log('[WorkerMain] User authenticated:', user.name, user.role);
      }
      return;
    }

    // 토큰이 있는데 사용자 정보가 없으면 auth.me 쿼리를 강제로 실행
    if (token && !user && !loading) {
      console.log('[WorkerMain] Token exists but user info not loaded, refetching...');
      utils.auth.me.refetch().then((result) => {
        if (!result.data || result.data.role !== "worker") {
          console.log('[WorkerMain] Failed to get user info or not a worker, redirecting to login');
          setLocation("/mobile/login");
        }
      }).catch((error) => {
        console.error('[WorkerMain] Failed to fetch user info:', error);
        setLocation("/mobile/login");
      });
    }
  }, [user, loading, setLocation, utils]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [checkInTimeDisplay, setCheckInTimeDisplay] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const [showPWAHint, setShowPWAHint] = useState(false);

  // 긴급 신고 Drawer 상태
  const [isEmergencyDrawerOpen, setIsEmergencyDrawerOpen] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<{
    label: string;
    icon: any;
    color: string;
    type: string;
    desc: string;
  } | null>(null);
  const [emergencyDetails, setEmergencyDetails] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  // 생체인식 에러 메시지 상태
  const [biometricError, setBiometricError] = useState<string>("");

  // 생체인식 지원 여부 체크 (네이티브 앱 + 웹 WebAuthn)
  useEffect(() => {
    setIsMounted(true);

    const checkBiometricAvailability = async () => {
      if (typeof window === 'undefined') return;

      const isNative = isNativeApp();
      console.log('[WorkerMain] ===== 생체인식 지원 체크 =====');
      console.log('[WorkerMain] Is native app:', isNative);

      if (isNative) {
        // 네이티브 앱: capacitor-native-biometric 사용
        const result = await checkBiometricAvailable();
        console.log('[WorkerMain] Native biometric result:', result);
        setIsBiometricAvailable(result.available);
        if (!result.available && result.errorMessage) {
          setBiometricError(result.errorMessage);
          console.log('[WorkerMain] Biometric error:', result.errorMessage);
        }
      } else {
        // 웹 브라우저: WebAuthn 사용
        const hasWebAuthn = 'PublicKeyCredential' in window;
        const isSecureContext =
          window.location.protocol === 'https:' ||
          window.location.hostname === 'localhost';
        const isAvailable = hasWebAuthn && isSecureContext;

        console.log('[WorkerMain] WebAuthn supported:', hasWebAuthn);
        console.log('[WorkerMain] Secure context:', isSecureContext);
        console.log('[WorkerMain] Biometric available:', isAvailable);

        setIsBiometricAvailable(isAvailable);
      }

      console.log('[WorkerMain] URL:', window.location.href);
      console.log('[WorkerMain] User agent:', navigator.userAgent);
    };

    checkBiometricAvailability();
  }, []);

  // PWA 안내 표시 여부 체크
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 설치되어 있으면 안내 표시 안 함
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 한 번 본 적이 있으면 안내 표시 안 함
    const hasSeenHint = localStorage.getItem('pwa-hint-seen');
    if (hasSeenHint) return;

    setShowPWAHint(true);
  }, []);

  // 배정된 장비 조회
  const {
    data: assignedEquipment,
    isLoading: isLoadingEquipment,
    error: equipmentError
  } = trpc.mobile.worker.getMyAssignedEquipment.useQuery(undefined, {
    enabled: !!user && user.role === "worker",
    retry: false,
    onError: (error) => {
      console.error('[WorkerMain] Equipment query error:', error);
      toast.error("장비 정보를 불러오는 중 오류가 발생했습니다.");
    },
  });

  // 현재 투입 정보 조회 (BP사 정보 포함)
  const {
    data: currentDeployment,
    error: deploymentError
  } = trpc.mobile.worker.getCurrentDeployment.useQuery(undefined, {
    enabled: !!user && user.role === "worker",
    retry: false,
    onError: (error) => {
      console.error('[WorkerMain] Deployment query error:', error);
      // deployment 에러는 조용히 처리 (장비가 없을 수도 있음)
    },
  });

  // 디버깅: 장비 및 투입 정보 로그
  useEffect(() => {
    console.log('[WorkerMain] User:', user);
    console.log('[WorkerMain] Assigned Equipment:', assignedEquipment);
    console.log('[WorkerMain] Current Deployment:', currentDeployment);
  }, [user, assignedEquipment, currentDeployment]);



  // 현재 작업 세션 조회
  const {
    data: currentSession,
    refetch: refetchSession,
    isLoading: isLoadingSession,
    error: sessionError
  } = trpc.mobile.worker.getCurrentSession.useQuery(undefined, {
    enabled: !!user && user.role === "worker",
    retry: false,
    onError: (error) => {
      console.error('[WorkerMain] Session query error:', error);
      // 세션 에러는 조용히 처리 (세션이 없을 수도 있음)
    },
  });

  // 오늘 출근 상태 조회
  const {
    data: todayCheckInStatus,
    refetch: refetchCheckIn,
    error: checkInError
  } = trpc.checkIn.getTodayStatus.useQuery(undefined, {
    enabled: !!user && user.role === "worker",
    retry: false,
    onError: (error) => {
      console.error('[WorkerMain] Check-in status query error:', error);
      // 출근 상태 에러는 조용히 처리
    },
  });

  // 출근 시간 포맷팅 (클라이언트에서만, 한국 시간으로 변환)
  useEffect(() => {
    if (isMounted && todayCheckInStatus?.checkIn?.checkInTime) {
      // UTC 시간을 한국 시간(KST, UTC+9)으로 변환
      // 브라우저의 toLocaleTimeString을 사용하여 자동으로 타임존 변환
      try {
        const date = new Date(todayCheckInStatus.checkIn.checkInTime);

        if (isNaN(date.getTime())) {
          console.error('[WorkerMain] Invalid date:', todayCheckInStatus.checkIn.checkInTime);
          setCheckInTimeDisplay('');
          return;
        }

        // toLocaleTimeString을 사용하여 한국 시간대(Asia/Seoul)로 자동 변환
        // 브라우저가 UTC 시간을 자동으로 KST로 변환해줌
        const timeStr = date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Seoul',
          hour12: false, // 24시간 형식 (14:11)
        });

        setCheckInTimeDisplay(timeStr);
      } catch (error) {
        console.error('[WorkerMain] formatTime error:', error);
        setCheckInTimeDisplay('');
      }
    }
  }, [isMounted, todayCheckInStatus?.checkIn?.checkInTime]);

  // 출근 체크
  const checkInMutation = trpc.checkIn.create.useMutation({
    onSuccess: async (data) => {
      const distanceMsg = data.isWithinZone
        ? `작업 구역 내에서 출근하셨습니다 (${data.distanceFromZone}m)`
        : `작업 구역 밖에서 출근하셨습니다 (${data.distanceFromZone}m 떨어짐)`;
      toast.success(`출근이 완료되었습니다!\n${distanceMsg}`);

      // 출근 상태 즉시 새로고침 (여러 방법으로 강제 새로고침)
      try {
        // 1. 캐시 무효화
        await utils.checkIn.getTodayStatus.invalidate();
        // 2. 강제 refetch
        await utils.checkIn.getTodayStatus.refetch();
        // 3. refetchCheckIn도 호출
        await refetchCheckIn();
        // 4. 약간의 지연 후 한 번 더 refetch (UI 업데이트 보장)
        setTimeout(async () => {
          await utils.checkIn.getTodayStatus.refetch();
        }, 500);
      } catch (error) {
        console.error('[WorkerMain] Error refetching check-in status:', error);
      }
    },
    onError: (error) => {
      console.error('[WorkerMain] Check-in error:', error);
      // 에러 메시지 정리 (deployment 관련 에러 메시지 개선)
      let errorMessage = error.message || '알 수 없는 오류';
      if (errorMessage.includes('deployment') || errorMessage.includes('투입')) {
        errorMessage = errorMessage.replace(/deployment.*not.*defined/gi, '투입 정보를 찾을 수 없습니다');
        errorMessage = errorMessage.replace(/deployment/gi, '투입');
      }
      toast.error("출근 체크 실패: " + errorMessage);
    },
  });

  // 출근 기록 삭제 (테스트용)
  const deleteCheckInMutation = trpc.checkIn.delete.useMutation({
    onSuccess: async () => {
      toast.success("출근 기록이 삭제되었습니다.");
      // 출근 상태 즉시 새로고침
      try {
        await refetchCheckIn();
        await utils.checkIn.getTodayStatus.invalidate();
        await utils.checkIn.getTodayStatus.refetch();
      } catch (error) {
        console.error('[WorkerMain] Error refetching after delete:', error);
      }
    },
    onError: (error) => {
      toast.error("출근 기록 삭제 실패: " + error.message);
    },
  });

  const handleDeleteCheckIn = () => {
    console.log('[WorkerMain] Delete check-in clicked:', {
      hasCheckIn: !!todayCheckInStatus?.checkIn,
      checkInId: todayCheckInStatus?.checkIn?.id,
      todayCheckInStatus,
    });

    if (!todayCheckInStatus?.checkIn?.id) {
      toast.error("삭제할 출근 기록이 없습니다.");
      console.error('[WorkerMain] No check-in ID found');
      return;
    }

    if (confirm("오늘 출근 기록을 삭제하시겠습니까?\n(테스트를 위해 삭제합니다)")) {
      console.log('[WorkerMain] Deleting check-in:', todayCheckInStatus.checkIn.id);
      deleteCheckInMutation.mutate({
        checkInId: todayCheckInStatus.checkIn.id,
        deleteToday: true,
      });
    }
  };

  // 작업 시작
  const startWorkMutation = trpc.mobile.worker.startWorkSession.useMutation({
    onSuccess: () => {
      toast.success("작업이 시작되었습니다.");
      refetchSession();
      // 즉시 위치 전송
      const equipment = assignedEquipment || currentDeployment?.equipment;
      if (equipment) {
        toast.info("GPS로 현위치가 전송됩니다.");
        sendLocationOnce();
      }
    },
    onError: (error) => {
      toast.error("작업 시작 실패: " + error.message);
    },
  });

  // 작업 종료
  const endWorkMutation = trpc.mobile.worker.endWorkSession.useMutation({
    onSuccess: async () => {
      // 퇴근 시 위치 전송
      const equipment = assignedEquipment || currentDeployment?.equipment;
      if (equipment && "geolocation" in navigator) {
        try {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await sendLocationMutation.mutateAsync({
                  equipmentId: equipment.id,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                });
                console.log('[GPS] 퇴근 시 위치 전송 성공');
              } catch (error) {
                console.error('[GPS] 퇴근 시 위치 전송 실패:', error);
              }
            },
            (error) => {
              console.error('[GPS] 퇴근 시 위치 수집 실패:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        } catch (error) {
          console.error('[GPS] 퇴근 시 위치 전송 중 예외:', error);
        }
      }

      toast.success("작업이 종료되었습니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("작업 종료 실패: " + error.message);
    },
  });

  // 휴식 시작
  const startBreakMutation = trpc.mobile.worker.startBreak.useMutation({
    onSuccess: async () => {
      // 휴식 시작 시 위치 전송
      if (assignedEquipment && "geolocation" in navigator) {
        try {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await sendLocationMutation.mutateAsync({
                  equipmentId: assignedEquipment.id,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                });
                console.log('[GPS] 휴식 시작 시 위치 전송 성공');
              } catch (error) {
                console.error('[GPS] 휴식 시작 시 위치 전송 실패:', error);
              }
            },
            (error) => {
              console.error('[GPS] 휴식 시작 시 위치 수집 실패:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        } catch (error) {
          console.error('[GPS] 휴식 시작 시 위치 전송 중 예외:', error);
        }
      }

      toast.success("휴식이 시작되었습니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("휴식 시작 실패: " + error.message);
    },
  });

  // 휴식 종료
  const endBreakMutation = trpc.mobile.worker.endBreak.useMutation({
    onSuccess: () => {
      // 휴식 종료 시 위치 전송
      if (assignedEquipment) {
        sendLocationOnce();
      }
      toast.success("작업을 재개합니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("휴식 종료 실패: " + error.message);
    },
  });

  // 연장 시작
  const startOvertimeMutation = trpc.mobile.worker.startOvertime.useMutation({
    onSuccess: () => {
      toast.success("연장 작업이 시작되었습니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("연장 시작 실패: " + error.message);
    },
  });

  // 연장 종료
  const endOvertimeMutation = trpc.mobile.worker.endOvertime.useMutation({
    onSuccess: () => {
      toast.success("정상 작업으로 돌아갑니다.");
      refetchSession();
    },
    onError: (error) => {
      toast.error("연장 종료 실패: " + error.message);
    },
  });

  // 위치 전송
  const sendLocationMutation = trpc.mobile.worker.sendLocation.useMutation({
    onError: (error) => {
      console.error('[GPS] 위치 전송 실패:', error);
      // 사용자에게는 조용히 실패 (백그라운드 작업이므로)
      // 재시도는 자동으로 다음 간격에 시도됨
    },
  });

  // 긴급 알림
  const sendEmergencyMutation = trpc.mobile.worker.sendEmergencyAlert.useMutation({
    onSuccess: () => {
      toast.success("장비 운영사에 긴급 알림이 전송되었습니다.");
    },
    onError: (error) => {
      toast.error("긴급 알림 전송 실패: " + error.message);
    },
  });

  // 위치 전송 함수 (재시도 로직 포함)
  const sendLocationWithRetry = async (retryCount = 0, maxRetries = 3) => {
    if (!assignedEquipment) return;

    try {
      if (!("geolocation" in navigator)) {
        console.warn('[GPS] Geolocation API를 사용할 수 없습니다.');
        return;
      }

      // GPS 옵션 설정
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10초 타임아웃
        maximumAge: 0, // 캐시 사용 안 함
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const result = await sendLocationMutation.mutateAsync({
              equipmentId: assignedEquipment.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            console.log('[GPS] 위치 전송 성공:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              result,
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            console.error('[GPS] 위치 전송 실패:', error);

            // 네트워크 오류인 경우 재시도
            if (retryCount < maxRetries && (
              error.message?.includes('network') ||
              error.message?.includes('Network') ||
              error.message?.includes('fetch') ||
              error.code === 'NETWORK_ERROR'
            )) {
              console.log(`[GPS] 네트워크 오류로 재시도 중... (${retryCount + 1}/${maxRetries})`);
              setTimeout(() => {
                sendLocationWithRetry(retryCount + 1, maxRetries);
              }, 5000); // 5초 후 재시도
            }
          }
        },
        (error) => {
          console.error('[GPS] 위치 정보 가져오기 실패:', {
            code: error.code,
            message: error.message,
            retryCount,
          });

          // GPS 수신 실패 시 재시도 (PERMISSION_DENIED 제외)
          if (retryCount < maxRetries && error.code !== error.PERMISSION_DENIED) {
            console.log(`[GPS] 위치 수신 실패로 재시도 중... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              sendLocationWithRetry(retryCount + 1, maxRetries);
            }, 10000); // 10초 후 재시도
          } else if (error.code === error.PERMISSION_DENIED) {
            console.warn('[GPS] 위치 권한이 거부되었습니다.');
          }
        },
        options
      );
    } catch (error: any) {
      console.error('[GPS] 위치 전송 중 예외 발생:', error);

      // 예외 발생 시 재시도
      if (retryCount < maxRetries) {
        setTimeout(() => {
          sendLocationWithRetry(retryCount + 1, maxRetries);
        }, 5000);
      }
    }
  };

  // 즉시 위치 전송 (작업 시작/휴식 종료 시 호출)
  const sendLocationOnce = () => {
    if (!assignedEquipment) {
      console.warn('[GPS] 배정된 장비가 없어 위치 전송을 할 수 없습니다.');
      return;
    }

    console.log('[GPS] 즉시 위치 전송 시작 - 장비 ID:', assignedEquipment.id);
    sendLocationWithRetry();
  };

  // 경과 시간 계산
  useEffect(() => {
    if (!currentSession || !currentSession.startTime) return;

    const timer = setInterval(() => {
      // UTC 시간으로 명시적으로 파싱 (타임존 이슈 해결)
      const startTimeStr = currentSession.startTime.replace(' ', 'T') + 'Z';
      const start = new Date(startTimeStr).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession]);

  // 경과 시간 포맷팅
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 상태 배지
  const getStatusBadge = () => {
    if (!currentSession) return null;

    const statusMap: Record<string, { label: string; className: string }> = {
      working: { label: "작업 중", className: "bg-green-500 text-white" },
      break: { label: "휴식 중", className: "bg-yellow-500 text-white" },
      overtime: { label: "연장 중", className: "bg-orange-500 text-white" },
    };

    const status = statusMap[currentSession.status] || {
      label: currentSession.status,
      className: "bg-gray-500 text-white",
    };

    return <Badge className={`${status.className} text-sm px-3 py-1`}>{status.label}</Badge>;
  };

  // 출근 체크 핸들러 (PIN)
  const handleCheckIn = () => {
    if ("geolocation" in navigator) {
      toast.info("GPS 위치를 확인하는 중...");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('[CheckIn] GPS Position:', position.coords.latitude, position.coords.longitude);
          try {
            await checkInMutation.mutateAsync({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              authMethod: "pin",
            });
            console.log('[CheckIn] PIN check-in mutation succeeded');
          } catch (error: any) {
            console.error('[CheckIn] PIN check-in mutation error:', error);
            toast.error(`출근 체크 실패: ${error.message || '알 수 없는 오류'}`);
          }
        },
        (error) => {
          console.error('[CheckIn] GPS Error:', error);
          toast.error("위치 정보를 가져올 수 없습니다. GPS를 활성화해주세요.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      toast.error("이 기기는 위치 정보를 지원하지 않습니다.");
    }
  };

  // 생체 인증 출근 핸들러 (네이티브 앱 + 웹 WebAuthn 지원)
  const handleBiometricCheckIn = async () => {
    try {
      // 1. GPS 위치 가져오기
      if (!("geolocation" in navigator)) {
        toast.error("이 기기는 위치 정보를 지원하지 않습니다.");
        return;
      }

      toast.info("생체 인증 및 GPS 확인 중...");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // 네이티브 앱인지 확인
            const isNative = isNativeApp();
            console.log('[BiometricCheckIn] Is native app:', isNative);

            if (isNative) {
              // ========== 네이티브 앱: capacitor-native-biometric 사용 ==========
              console.log('[BiometricCheckIn] Using native biometric authentication');

              const authResult = await performNativeBiometricAuth({
                reason: '출근 확인을 위해 생체인식이 필요합니다.',
                title: '출근 생체인식',
                subtitle: '',
                description: '지문 또는 얼굴을 인식해주세요.',
              });

              if (!authResult.success) {
                toast.error(authResult.errorMessage || '생체인식 인증에 실패했습니다.');
                return;
              }

              console.log('[BiometricCheckIn] Native biometric auth succeeded');

              // 출근 체크 (네이티브 생체인식 성공)
              try {
                await checkInMutation.mutateAsync({
                  lat: latitude,
                  lng: longitude,
                  authMethod: "native_biometric",
                  webauthnCredentialId: `native_${Date.now()}`, // 네이티브는 credential ID 없음
                });
                console.log('[BiometricCheckIn] Check-in mutation succeeded (native)');
              } catch (error: any) {
                console.error('[BiometricCheckIn] Check-in mutation error:', error);
                toast.error(`출근 체크 실패: ${error.message || '알 수 없는 오류'}`);
              }

            } else {
              // ========== 웹 브라우저: WebAuthn 사용 ==========
              console.log('[BiometricCheckIn] Using WebAuthn authentication');

              // 인증 챌린지 가져오기
              let authOptions;
              try {
                console.log('[BiometricCheckIn] Requesting authentication challenge...');
                authOptions = await utils.webauthn.generateAuthenticationChallenge.fetch();
                console.log('[BiometricCheckIn] Challenge received:', {
                  hasChallenge: !!authOptions.challenge,
                  rpId: authOptions.rpId,
                  allowCredentials: authOptions.allowCredentials?.length || 0,
                });
              } catch (error: any) {
                console.error('[BiometricCheckIn] Challenge generation error:', error);

                if (error.data?.code === 'NOT_FOUND') {
                  toast.error("등록된 생체 인증이 없습니다. 먼저 생체 인증을 등록해주세요.");
                } else if (error.data?.code === 'INTERNAL_SERVER_ERROR') {
                  toast.error(`서버 오류: ${error.message || '알 수 없는 오류'}`);
                } else {
                  toast.error(`인증 챌린지 생성 실패: ${error.message || '알 수 없는 오류'}`);
                }
                return;
              }

              // 생체 인증 (지문/얼굴 스캔)
              toast.info("생체 인증을 진행해주세요...");

              let authResponse;
              try {
                authResponse = await startAuthentication(authOptions);
              } catch (error: any) {
                console.error('[BiometricCheckIn] startAuthentication error:', error);

                if (error.name === 'NotAllowedError') {
                  toast.error("생체 인증이 취소되었습니다.");
                } else if (error.name === 'InvalidStateError') {
                  toast.error("생체 인증이 이미 사용 중입니다. 잠시 후 다시 시도해주세요.");
                } else if (error.name === 'NotSupportedError') {
                  toast.error("이 기기는 생체 인증을 지원하지 않습니다.");
                } else if (error.name === 'SecurityError') {
                  toast.error("보안 오류가 발생했습니다. HTTPS 연결을 확인해주세요.");
                } else {
                  toast.error(`생체 인증 실패: ${error.message || error.name || '알 수 없는 오류'}`);
                }
                return;
              }

              console.log('[BiometricCheckIn] WebAuthn authentication succeeded');

              // credential ID 추출
              let credentialId: string;
              if (authResponse.id) {
                credentialId = authResponse.id;
              } else if (authResponse.rawId instanceof ArrayBuffer) {
                const bytes = new Uint8Array(authResponse.rawId);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                credentialId = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
              } else if (typeof authResponse.rawId === 'string') {
                credentialId = authResponse.rawId;
              } else {
                credentialId = String(authResponse.rawId);
              }

              // 출근 체크 (WebAuthn 성공)
              try {
                await checkInMutation.mutateAsync({
                  lat: latitude,
                  lng: longitude,
                  authMethod: "webauthn",
                  webauthnCredentialId: credentialId,
                });
                console.log('[BiometricCheckIn] Check-in mutation succeeded (webauthn)');
              } catch (error: any) {
                console.error('[BiometricCheckIn] Check-in mutation error:', error);
                toast.error(`출근 체크 실패: ${error.message || '알 수 없는 오류'}`);
              }
            }
          } catch (error: any) {
            console.error('[BiometricCheckIn] Error:', error);

            if (error.name === 'NotAllowedError') {
              toast.error("생체 인증이 취소되었습니다.");
            } else if (error.message?.includes("등록된 생체 인증이 없습니다")) {
              toast.error("생체 인증이 등록되지 않았습니다. 설정에서 먼저 등록해주세요.");
            } else {
              toast.error(`생체 인증 실패: ${error.message}`);
            }
          }
        },
        (error) => {
          console.error('[BiometricCheckIn] GPS Error:', error);
          toast.error("위치 정보를 가져올 수 없습니다. GPS를 활성화해주세요.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error: any) {
      console.error('[BiometricCheckIn] Outer error:', error);
      toast.error(`출근 실패: ${error.message}`);
    }
  };

  // 작업 시작 핸들러
  const handleStartWork = () => {
    console.log('[WorkerMain] handleStartWork called');
    console.log('[WorkerMain] assignedEquipment:', assignedEquipment);
    console.log('[WorkerMain] currentDeployment:', currentDeployment);

    const equipment = assignedEquipment || currentDeployment?.equipment;

    if (!equipment) {
      toast.error("배정된 장비가 없습니다. 관리자에게 문의하세요.");
      return;
    }

    console.log('[WorkerMain] Starting work session with equipment:', equipment.id);
    startWorkMutation.mutate({ equipmentId: equipment.id });
  };

  // 로딩 중일 때
  if (isLoadingEquipment || isLoadingSession) {
    return (
      <MobileLayout title="장비 운전자" showMenu={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  // 에러 발생 시 처리
  if (equipmentError) {
    return (
      <MobileLayout title="장비 운전자" showMenu={false}>
        <div className="flex flex-col items-center justify-center h-screen p-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold mb-2">오류가 발생했습니다</h2>
          <p className="text-sm text-gray-600 text-center mb-4">
            {equipmentError.message || "장비 정보를 불러올 수 없습니다."}
          </p>
          <Button onClick={() => window.location.reload()}>
            새로고침
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="작업 관리" showMenu={false}>
      <div>
        {/* 출근 체크 섹션 - Clean Design */}
        {!todayCheckInStatus?.hasCheckedIn ? (
          <div className="px-4 mb-6 mt-2">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">안녕하세요, {user?.name}님!</h2>
              <p className="text-gray-500 mt-1">오늘도 안전한 하루 되세요</p>
            </div>

            <Card className="border-0 shadow-lg bg-white overflow-hidden">
              <div className="h-2 bg-blue-600 w-full" />
              <CardContent className="p-6 space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <div className="text-lg font-semibold text-gray-900">출근 전입니다</div>
                  <div className="text-sm text-gray-500">작업 시작 전 출근 체크를 해주세요</div>
                </div>

                {/* PIN 출근 버튼 */}
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-md active:scale-95 transition-all rounded-xl"
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending || !!todayCheckInStatus?.checkIn}
                >
                  {checkInMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      확인 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      출근하기
                    </>
                  )}
                </Button>

                {/* 생체 인증 출근 버튼 */}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-14 text-base font-semibold border-gray-200 hover:bg-gray-50 active:scale-95 transition-all rounded-xl"
                  onClick={() => {
                    if (!isBiometricAvailable) {
                      if (Capacitor.isNativePlatform()) {
                        // 더 구체적인 에러 메시지 표시
                        const errorMsg = biometricError
                          ? `생체 인증 오류: ${biometricError}\n\n기기 설정에서 지문 또는 얼굴 인식을 등록해주세요.`
                          : "생체 인증을 사용할 수 없습니다.\n\n기기 설정 > 보안 > 지문/얼굴 인식에서 등록해주세요.";
                        toast.info(errorMsg, { duration: 5000 });
                      } else {
                        toast.info(
                          "생체 인증은 HTTPS 환경에서만 사용 가능합니다.",
                          { duration: 3000 }
                        );
                      }
                      return;
                    }
                    handleBiometricCheckIn();
                  }}
                  disabled={checkInMutation.isPending || !!todayCheckInStatus?.checkIn}
                >
                  <Fingerprint className="mr-2 h-5 w-5 text-purple-600" />
                  생체 인증으로 출근
                </Button>

                <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-2">
                  <MapPin className="h-3 w-3" />
                  <span>현재 위치가 자동으로 기록됩니다</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="px-4 mb-6 mt-2">
            <Card className="border-0 shadow-md bg-white overflow-hidden">
              <div className="h-2 bg-green-500 w-full" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">출근 완료</div>
                      <div className="text-sm text-gray-500 font-medium">
                        {checkInTimeDisplay}
                      </div>
                    </div>
                  </div>

                  {todayCheckInStatus?.checkIn?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      onClick={handleDeleteCheckIn}
                      disabled={deleteCheckInMutation.isPending}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {todayCheckInStatus?.checkIn?.isWithinZone !== undefined && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {todayCheckInStatus.checkIn.isWithinZone
                        ? `작업 구역 내 (${todayCheckInStatus.checkIn.distanceFromZone}m)`
                        : `작업 구역 밖 (${todayCheckInStatus.checkIn.distanceFromZone}m)`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* PWA 안내 */}
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
                      {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                        <>공유 버튼(□↑) → 홈 화면에 추가</>
                      ) : (
                        <>메뉴(⋮) → 홈 화면에 추가</>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-700 h-8"
                      onClick={() => {
                        localStorage.setItem('pwa-hint-seen', 'true');
                        setShowPWAHint(false);
                      }}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 작업 상태 카드 - 큰 화면 상단 */}
        {currentSession && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 mb-4">
            <div className="text-center space-y-3">
              {getStatusBadge()}
              <div className="text-5xl font-mono font-bold tracking-wider">
                {formatElapsedTime(elapsedTime)}
              </div>
              <div className="text-sm opacity-90">경과 시간</div>
            </div>
          </div>
        )}

        {/* 배정된 장비 정보 */}
        {/* 배정된 장비가 없을 때만 에러 카드 표시 */}
        {!assignedEquipment && !currentDeployment && (
          <div className="px-4 mb-4">
            <Card className="border-2 border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <Truck className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <div className="font-medium text-red-700">배정된 장비가 없습니다</div>
                <div className="text-sm text-red-600 mt-1">관리자에게 문의하세요</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 배정 정보 (차량 + 현장) */}
        {(assignedEquipment || currentDeployment) && (
          <div className="px-4 mb-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-5 w-5 text-blue-700" />
                  <span className="font-bold text-blue-900">배정 정보</span>
                </div>
                <div className="space-y-3">
                  {/* 차량 정보 */}
                  {(assignedEquipment || currentDeployment?.equipment) && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm">차량번호:</span>
                        <span className="text-lg font-bold text-blue-900">
                          {assignedEquipment?.regNum || currentDeployment?.equipment?.regNum}
                        </span>
                      </div>
                      {(assignedEquipment?.equipType?.name || currentDeployment?.equipment?.equipType?.name) && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-sm">차량종류:</span>
                          <span className="font-medium text-gray-800">
                            {assignedEquipment?.equipType?.name || currentDeployment?.equipment?.equipType?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* 현장 정보 (BP사) */}
                  {currentDeployment?.bpCompany?.name && (
                    <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600 text-sm">현장:</span>
                      <span className="font-medium text-gray-800">{currentDeployment.bpCompany.name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 작업 제어 버튼 영역 */}
        <div className="px-4 space-y-4">
          {!currentSession ? (
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg active:scale-95 transition-transform"
              onClick={handleStartWork}
              disabled={!(assignedEquipment || currentDeployment?.equipment) || startWorkMutation.isPending}
            >
              {startWorkMutation.isPending ? (
                <>
                  <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                  작업 시작 중...
                </>
              ) : (
                <>
                  <Play className="mr-3 h-7 w-7" />
                  작업 시작
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full h-20 text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg active:scale-95 transition-transform"
                onClick={() => endWorkMutation.mutate()}
                disabled={endWorkMutation.isPending}
              >
                {endWorkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                    작업 종료 중...
                  </>
                ) : (
                  <>
                    <Square className="mr-3 h-7 w-7" />
                    작업 종료
                  </>
                )}
              </Button>

              {currentSession.status === "working" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 text-base border-2 border-yellow-400 hover:bg-yellow-50 active:scale-95 transition-transform"
                    onClick={() => startBreakMutation.mutate()}
                    disabled={startBreakMutation.isPending}
                  >
                    <Coffee className="mr-2 h-5 w-5" />
                    휴식 시작
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 text-base border-2 border-orange-400 hover:bg-orange-50 active:scale-95 transition-transform"
                    onClick={() => startOvertimeMutation.mutate()}
                    disabled={startOvertimeMutation.isPending}
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    연장 시작
                  </Button>
                </div>
              )}

              {currentSession.status === "break" && (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg active:scale-95 transition-transform"
                  onClick={() => endBreakMutation.mutate()}
                  disabled={endBreakMutation.isPending}
                >
                  <Play className="mr-2 h-5 w-5" />
                  휴식 종료
                </Button>
              )}

              {currentSession.status === "overtime" && (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg active:scale-95 transition-transform"
                  onClick={() => endOvertimeMutation.mutate()}
                  disabled={endOvertimeMutation.isPending}
                >
                  <Square className="mr-2 h-5 w-5" />
                  연장 종료
                </Button>
              )}
            </>
          )}
        </div>

        {/* 빠른 메뉴 - Grid Layout */}
        <div className="px-4 mt-6 space-y-3">
          <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            빠른 메뉴
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 현위치 전송 */}
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all rounded-xl shadow-sm"
              onClick={() => {
                if (!assignedEquipment) {
                  toast.error("배정된 장비가 없습니다.");
                  return;
                }
                setIsSendingLocation(true);
                // ... (기존 로직 유지)
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
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
              }}
              disabled={!assignedEquipment || isSendingLocation}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                {isSendingLocation ? (
                  <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                ) : (
                  <MapPin className="h-5 w-5 text-green-600" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">현위치 전송</span>
            </Button>



            {/* 생체 인증 설정 */}
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all rounded-xl shadow-sm"
              onClick={() => setLocation("/mobile/biometric-setup")}
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">생체 인증 설정</span>
            </Button>
          </div>
        </div>

        {/* 긴급 상황 버튼 (4개 큰 버튼 - 한 번 탭으로 즉시 신고) */}
        {/* 긴급 상황 버튼 - Grid Layout */}
        <div className="px-4 mt-8 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              긴급 신고 센터
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">즉시 전송됨</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "사고", icon: AlertTriangle, color: "red", type: "사고", desc: "사고 발생" },
              { label: "고장", icon: Truck, color: "orange", type: "고장", desc: "장비 고장" },
              { label: "위험", icon: AlertCircle, color: "yellow", type: "안전위험", desc: "안전 위험" },
              { label: "기타", icon: Bell, color: "purple", type: "기타", desc: "기타 긴급" },
            ].map((item) => (
              <button
                key={item.label}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-${item.color}-100 bg-${item.color}-50 active:scale-95 transition-transform`}
                onClick={() => {
                  if (!assignedEquipment) {
                    toast.error("배정된 장비가 없습니다.");
                    return;
                  }
                  // Drawer 열기
                  setSelectedEmergencyType(item);
                  setEmergencyDetails(""); // 내용 초기화
                  setIsEmergencyDrawerOpen(true);
                }}
                disabled={!assignedEquipment || sendEmergencyMutation.isPending}
              >
                <div className={`h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm text-${item.color}-600`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs font-medium text-${item.color}-700`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 긴급 신고 Drawer */}
        <Drawer open={isEmergencyDrawerOpen} onOpenChange={setIsEmergencyDrawerOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
                  {selectedEmergencyType && (
                    <>
                      <selectedEmergencyType.icon className={`h-6 w-6 text-${selectedEmergencyType.color}-600`} />
                      <span className={`text-${selectedEmergencyType.color}-700`}>{selectedEmergencyType.desc} 신고</span>
                    </>
                  )}
                </DrawerTitle>
                <DrawerDescription className="text-center">
                  상황을 자세히 적어주시면 빠른 조치에 도움이 됩니다.<br />
                  (내용 없이도 즉시 신고 가능합니다)
                </DrawerDescription>
              </DrawerHeader>

              <div className="p-4 pb-0">
                <Textarea
                  placeholder="예: 3번 게이트 앞 타이어 펑크, 작업자 부상 등 (선택사항)"
                  className="min-h-[120px] text-base resize-none bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  value={emergencyDetails}
                  onChange={(e) => setEmergencyDetails(e.target.value)}
                />
              </div>

              <DrawerFooter>
                <Button
                  size="lg"
                  className={`w-full h-14 text-lg font-bold shadow-lg ${selectedEmergencyType
                    ? `bg-${selectedEmergencyType.color}-600 hover:bg-${selectedEmergencyType.color}-700`
                    : 'bg-red-600'
                    }`}
                  onClick={() => {
                    if (!assignedEquipment || !selectedEmergencyType) return;

                    setIsLocating(true);

                    const sendAlert = (lat?: number, lng?: number) => {
                      // 위치 정보가 없으면 Work Zone 위치 사용 (Fallback)
                      let finalLat = lat;
                      let finalLng = lng;

                      if (!finalLat || !finalLng) {
                        // workZone 객체 확인 (camelCase와 snake_case 모두 지원)
                        const workZone = currentDeployment?.workZone || (currentDeployment as any)?.work_zone;
                        if (workZone) {
                          // camelCase (centerLat) 또는 snake_case (center_lat) 모두 지원
                          const rawLat = workZone.centerLat || workZone.center_lat;
                          const rawLng = workZone.centerLng || workZone.center_lng;
                          const zoneLat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
                          const zoneLng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng);

                          if (!isNaN(zoneLat) && !isNaN(zoneLng) && zoneLat !== 0 && zoneLng !== 0) {
                            finalLat = zoneLat;
                            finalLng = zoneLng;
                            console.log('[Emergency] Using Work Zone location as fallback:', finalLat, finalLng);
                            toast.info("현장 위치(Work Zone)로 대체하여 전송합니다.");
                          } else {
                            console.warn('[Emergency] Work Zone location is invalid:', workZone);
                            finalLat = undefined;
                            finalLng = undefined;
                          }
                        } else {
                          console.warn('[Emergency] No location and no Work Zone fallback available.');
                          console.log('[Emergency] currentDeployment:', currentDeployment);
                        }
                      }

                      console.log('[Emergency] Sending alert:', {
                        equipmentId: assignedEquipment.id,
                        alertType: selectedEmergencyType.type,
                        latitude: finalLat,
                        longitude: finalLng,
                        description: emergencyDetails
                      });

                      sendEmergencyMutation.mutate({
                        equipmentId: assignedEquipment.id,
                        alertType: selectedEmergencyType.type,
                        latitude: finalLat,
                        longitude: finalLng,
                        description: emergencyDetails,
                      }, {
                        onSuccess: (data) => {
                          console.log('[Emergency] Alert created successfully:', data);
                          toast.success("긴급 알림이 전송되었습니다.", {
                            description: "관리자에게 푸시 알림이 발송됩니다."
                          });
                          setIsEmergencyDrawerOpen(false);
                          setEmergencyDetails("");
                          setSelectedEmergencyType(null);
                        },
                        onError: (error) => {
                          console.error('[Emergency] Failed to create alert:', error);
                          toast.error("긴급 알림 전송 실패", {
                            description: `오류: ${error.message || "알 수 없는 오류가 발생했습니다."}`
                          });
                          // 네트워크 에러인 경우 추가 안내
                          if (error.message?.includes("fetch") || error.message?.includes("Network")) {
                            toast.error("네트워크 연결을 확인해주세요.");
                          }
                        }
                      });
                    };

                // 위치 정보 가져오기 시도 (타임아웃 5초)
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setIsLocating(false);
                      sendAlert(position.coords.latitude, position.coords.longitude);
                    },
                    (error) => {
                      console.warn('[Emergency] Geolocation error:', error);
                      setIsLocating(false);
                      // 위치 실패해도 전송 (Fallback 로직이 sendAlert 안에 있음)
                      sendAlert();
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                  );
                    } else {
                  setIsLocating(false);
                sendAlert();
                    }
                  }}
                disabled={sendEmergencyMutation.isPending || isLocating}
                >
                {sendEmergencyMutation.isPending || isLocating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isLocating ? "위치 확인 중..." : "전송 중..."}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    신고하기
                  </>
                )}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="h-12">취소</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

    </div>
    </MobileLayout >
  );
}

