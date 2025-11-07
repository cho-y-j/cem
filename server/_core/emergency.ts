import { sendEmail, EmailNotificationPayload } from "./email";

export interface EmergencyReport {
  id: string;
  userId: string;
  userName: string;
  type: "accident" | "equipment_failure" | "safety_hazard" | "fire" | "other";
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  photos?: string[];
  timestamp: Date;
  status: "reported" | "acknowledged" | "responding" | "resolved";
}

export interface LocationTracking {
  userId: string;
  userName: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  workStatus: "working" | "resting" | "overtime";
}

/**
 * 긴급 신고 이메일 발송
 */
export async function sendEmergencyNotification(
  report: EmergencyReport
): Promise<boolean> {
  try {
    // 관리자 및 현장 책임자에게 알림
    // TODO: 실제 수신자 목록 조회
    const recipients = [
      "admin@company.com",
      "supervisor@company.com",
    ];

    const typeLabels: Record<EmergencyReport["type"], string> = {
      accident: "사고 발생",
      equipment_failure: "장비 고장",
      safety_hazard: "안전 위험",
      fire: "화재",
      other: "기타 긴급상황",
    };

    const payload: EmailNotificationPayload = {
      to: recipients,
      subject: `🚨 긴급 신고: ${typeLabels[report.type]}`,
      type: "emergency",
      data: {
        reportType: typeLabels[report.type],
        reporter: report.userName,
        description: report.description,
        location: report.location.address || `위도: ${report.location.lat}, 경도: ${report.location.lng}`,
        timestamp: report.timestamp.toLocaleString('ko-KR'),
        mapLink: `https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`,
      },
    };

    await sendEmail(payload);
    console.log(`[긴급 신고] 알림 발송 완료: ${report.id}`);
    return true;
  } catch (error) {
    console.error('[긴급 신고] 알림 발송 실패:', error);
    return false;
  }
}

/**
 * 위치 추적 데이터 저장
 */
export async function saveLocationTracking(
  tracking: LocationTracking
): Promise<boolean> {
  try {
    // TODO: 데이터베이스에 위치 정보 저장
    console.log('[위치 추적]', {
      user: tracking.userName,
      location: tracking.location,
      status: tracking.workStatus,
      timestamp: tracking.timestamp,
    });

    // 위치 이상 감지 (예: 현장 밖으로 이동)
    // TODO: 현장 경계 체크 로직 구현
    
    return true;
  } catch (error) {
    console.error('[위치 추적] 저장 실패:', error);
    return false;
  }
}

/**
 * 긴급 신고 상태 업데이트
 */
export async function updateEmergencyStatus(
  reportId: string,
  status: EmergencyReport["status"],
  updatedBy: string
): Promise<boolean> {
  try {
    // TODO: 데이터베이스 업데이트
    console.log('[긴급 신고] 상태 업데이트:', {
      reportId,
      status,
      updatedBy,
      timestamp: new Date(),
    });

    return true;
  } catch (error) {
    console.error('[긴급 신고] 상태 업데이트 실패:', error);
    return false;
  }
}

