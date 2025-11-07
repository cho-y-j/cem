import { TRPCError } from "@trpc/server";

/**
 * 이메일 알림 타입
 */
export type EmailNotificationType = 
  | "entry_request_submitted"      // 반입 요청 제출
  | "entry_request_approved"       // 반입 요청 승인
  | "entry_request_rejected"       // 반입 요청 반려
  | "document_expiring_soon"       // 서류 만료 예정
  | "document_expired"             // 서류 만료
  | "inspection_required"          // 안전점검 필요
  | "work_journal_submitted"       // 작업 확인서 제출
  | "work_journal_approved"        // 작업 확인서 승인
  | "work_journal_rejected"        // 작업 확인서 반려
  | "emergency";                   // 긴급 신고

/**
 * 이메일 알림 페이로드
 */
export type EmailNotificationPayload = {
  type: EmailNotificationType;
  to: string | string[];           // 수신자 이메일
  subject: string;                 // 제목
  content: string;                 // 내용
  data?: Record<string, any>;      // 추가 데이터
};

/**
 * 이메일 템플릿 생성
 */
function generateEmailTemplate(payload: EmailNotificationPayload): string {
  const { type, subject, content, data } = payload;

  // HTML 이메일 템플릿
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .content h2 {
      color: #1f2937;
      font-size: 20px;
      margin-top: 0;
    }
    .content p {
      margin: 15px 0;
    }
    .info-box {
      background: white;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #667eea;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      background: #1f2937;
      color: #9ca3af;
      padding: 20px;
      border-radius: 0 0 10px 10px;
      text-align: center;
      font-size: 14px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .danger {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏗️ 건설현장 장비·인력 통합관리 시스템</h1>
  </div>
  <div class="content">
    <h2>${subject}</h2>
    <p>${content}</p>
    ${data ? generateDataSection(type, data) : ''}
  </div>
  <div class="footer">
    <p>이 이메일은 자동으로 발송되었습니다.</p>
    <p>© 2024 건설현장 장비·인력 통합관리 시스템. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 타입별 데이터 섹션 생성
 */
function generateDataSection(type: EmailNotificationType, data: Record<string, any>): string {
  switch (type) {
    case "entry_request_submitted":
    case "entry_request_approved":
    case "entry_request_rejected":
      return `
        <div class="info-box">
          <p><strong>요청 번호:</strong> ${data.requestNumber || '-'}</p>
          <p><strong>장비:</strong> ${data.equipmentName || '-'}</p>
          <p><strong>인력:</strong> ${data.workerName || '-'}</p>
          <p><strong>요청일:</strong> ${data.requestDate || '-'}</p>
          ${data.rejectReason ? `<p><strong>반려 사유:</strong> ${data.rejectReason}</p>` : ''}
        </div>
      `;
    
    case "document_expiring_soon":
    case "document_expired":
      return `
        <div class="${type === 'document_expired' ? 'danger' : 'warning'}">
          <p><strong>서류명:</strong> ${data.docName || '-'}</p>
          <p><strong>대상:</strong> ${data.targetName || '-'}</p>
          <p><strong>만료일:</strong> ${data.expiryDate || '-'}</p>
          ${data.daysRemaining ? `<p><strong>남은 기간:</strong> ${data.daysRemaining}일</p>` : ''}
        </div>
      `;
    
    case "inspection_required":
      return `
        <div class="warning">
          <p><strong>장비:</strong> ${data.equipmentName || '-'}</p>
          <p><strong>장비 번호:</strong> ${data.equipmentNumber || '-'}</p>
          <p><strong>점검 예정일:</strong> ${data.inspectionDate || '-'}</p>
        </div>
      `;
    
    case "work_journal_submitted":
    case "work_journal_approved":
    case "work_journal_rejected":
      return `
        <div class="info-box">
          <p><strong>작업일:</strong> ${data.workDate || '-'}</p>
          <p><strong>장비:</strong> ${data.equipmentName || '-'}</p>
          <p><strong>작업자:</strong> ${data.workerName || '-'}</p>
          <p><strong>작업 시간:</strong> ${data.workHours || '-'}시간</p>
          ${data.rejectReason ? `<p><strong>반려 사유:</strong> ${data.rejectReason}</p>` : ''}
        </div>
      `;
    
    default:
      return '';
  }
}

/**
 * 이메일 발송 함수 (실제 구현 시 SendGrid, AWS SES 등 사용)
 * 현재는 콘솔 로그로 대체
 */
export async function sendEmail(payload: EmailNotificationPayload): Promise<boolean> {
  try {
    // 수신자 배열로 변환
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

    // 이메일 템플릿 생성
    const htmlContent = generateEmailTemplate(payload);

    // TODO: 실제 이메일 발송 로직 구현
    // 예: SendGrid, AWS SES, Nodemailer 등 사용
    
    console.log('='.repeat(80));
    console.log('📧 이메일 발송 시뮬레이션');
    console.log('='.repeat(80));
    console.log(`타입: ${payload.type}`);
    console.log(`수신자: ${recipients.join(', ')}`);
    console.log(`제목: ${payload.subject}`);
    console.log(`내용: ${payload.content}`);
    if (payload.data) {
      console.log(`추가 데이터:`, JSON.stringify(payload.data, null, 2));
    }
    console.log('='.repeat(80));

    // 실제 환경에서는 이메일 서비스 API 호출
    // const result = await emailService.send({
    //   to: recipients,
    //   subject: payload.subject,
    //   html: htmlContent,
    // });

    return true;
  } catch (error) {
    console.error('[Email] 이메일 발송 실패:', error);
    return false;
  }
}

/**
 * 서류 만료 예정 알림 발송
 */
export async function sendDocumentExpiryNotification(
  email: string,
  docName: string,
  targetName: string,
  expiryDate: string,
  daysRemaining: number
): Promise<boolean> {
  const isExpired = daysRemaining <= 0;
  
  return sendEmail({
    type: isExpired ? "document_expired" : "document_expiring_soon",
    to: email,
    subject: isExpired 
      ? `[긴급] 서류 만료: ${docName}` 
      : `[알림] 서류 만료 예정: ${docName} (${daysRemaining}일 남음)`,
    content: isExpired
      ? `${targetName}의 ${docName}이(가) 만료되었습니다. 즉시 갱신이 필요합니다.`
      : `${targetName}의 ${docName}이(가) ${daysRemaining}일 후 만료 예정입니다. 갱신을 준비해주세요.`,
    data: {
      docName,
      targetName,
      expiryDate,
      daysRemaining: isExpired ? 0 : daysRemaining,
    },
  });
}

/**
 * 반입 요청 알림 발송
 */
export async function sendEntryRequestNotification(
  email: string,
  type: "submitted" | "approved" | "rejected",
  requestNumber: string,
  equipmentName: string,
  workerName: string,
  requestDate: string,
  rejectReason?: string
): Promise<boolean> {
  const typeMap = {
    submitted: "entry_request_submitted" as EmailNotificationType,
    approved: "entry_request_approved" as EmailNotificationType,
    rejected: "entry_request_rejected" as EmailNotificationType,
  };

  const subjectMap = {
    submitted: `[알림] 반입 요청 제출: ${requestNumber}`,
    approved: `[승인] 반입 요청 승인: ${requestNumber}`,
    rejected: `[반려] 반입 요청 반려: ${requestNumber}`,
  };

  const contentMap = {
    submitted: `반입 요청 ${requestNumber}이(가) 제출되었습니다. 검토를 진행해주세요.`,
    approved: `반입 요청 ${requestNumber}이(가) 승인되었습니다.`,
    rejected: `반입 요청 ${requestNumber}이(가) 반려되었습니다.${rejectReason ? ` 사유: ${rejectReason}` : ''}`,
  };

  return sendEmail({
    type: typeMap[type],
    to: email,
    subject: subjectMap[type],
    content: contentMap[type],
    data: {
      requestNumber,
      equipmentName,
      workerName,
      requestDate,
      rejectReason,
    },
  });
}

/**
 * 작업 확인서 알림 발송
 */
export async function sendWorkJournalNotification(
  email: string,
  type: "submitted" | "approved" | "rejected",
  workDate: string,
  equipmentName: string,
  workerName: string,
  workHours: number,
  rejectReason?: string
): Promise<boolean> {
  const typeMap = {
    submitted: "work_journal_submitted" as EmailNotificationType,
    approved: "work_journal_approved" as EmailNotificationType,
    rejected: "work_journal_rejected" as EmailNotificationType,
  };

  const subjectMap = {
    submitted: `[알림] 작업 확인서 제출: ${workDate}`,
    approved: `[승인] 작업 확인서 승인: ${workDate}`,
    rejected: `[반려] 작업 확인서 반려: ${workDate}`,
  };

  const contentMap = {
    submitted: `${workDate}의 작업 확인서가 제출되었습니다. 검토를 진행해주세요.`,
    approved: `${workDate}의 작업 확인서가 승인되었습니다.`,
    rejected: `${workDate}의 작업 확인서가 반려되었습니다.${rejectReason ? ` 사유: ${rejectReason}` : ''}`,
  };

  return sendEmail({
    type: typeMap[type],
    to: email,
    subject: subjectMap[type],
    content: contentMap[type],
    data: {
      workDate,
      equipmentName,
      workerName,
      workHours,
      rejectReason,
    },
  });
}

