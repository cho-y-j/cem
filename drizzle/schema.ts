import {
  boolean,
  date,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * 건설현장 장비·인력 통합관리 시스템 데이터베이스 스키마
 * 
 * 주요 테이블:
 * - 사용자 및 권한: users
 * - 마스터 데이터: equipTypes, workerTypes, typeDocs, workerDocs, checklistForms
 * - 운영 데이터: equipment, workers, docsCompliance, checkRecords, workJournal
 */

// ============================================================
// PostgreSQL Enums
// ============================================================

export const userRoleEnum = pgEnum("user_role", ["admin", "owner", "bp", "ep", "worker", "inspector"]);
export const targetTypeEnum = pgEnum("target_type", ["equipment", "worker"]);
export const entryRequestStatusEnum = pgEnum("entry_request_status", [
  "bp_draft",
  "bp_requested",
  "owner_requested",
  "owner_reviewing",
  "owner_approved",
  "bp_reviewing",
  "bp_approved",
  "ep_reviewing",
  "ep_approved",
  "rejected"
]);
export const entryRequestItemTypeEnum = pgEnum("entry_request_item_type", ["equipment", "worker"]);
export const documentStatusEnum = pgEnum("document_status", ["valid", "warning", "expired", "missing", "pending"]);

// ============================================================
// 사용자 및 권한 관리
// ============================================================

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  password: text("password"), // 해시된 비밀번호 (이메일 로그인용)
  pin: varchar("pin", { length: 4 }), // PIN (Worker 모바일 로그인용)
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role")
    .default("owner")
    .notNull(),
  companyId: varchar("company_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  lastSignedIn: timestamp("last_signed_in").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// 마스터 데이터: 장비 종류 및 관련 서류
// ============================================================

/**
 * 장비 종류 정의 (예: 크레인, 펌프카, 굴삭기 등)
 */
export const equipTypes = pgTable("equip_types", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  checklistFormId: varchar("checklist_form_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EquipType = typeof equipTypes.$inferSelect;
export type InsertEquipType = typeof equipTypes.$inferInsert;

/**
 * 장비별 필수 서류 정의
 */
export const typeDocs = pgTable("type_docs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  equipTypeId: varchar("equip_type_id", { length: 64 }).notNull(),
  docName: varchar("doc_name", { length: 200 }).notNull(),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  hasExpiry: boolean("has_expiry").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TypeDoc = typeof typeDocs.$inferSelect;
export type InsertTypeDoc = typeof typeDocs.$inferInsert;

// ============================================================
// 마스터 데이터: 인력 유형 및 관련 서류
// ============================================================

/**
 * 인력 유형 정의 (예: 크레인 운전자, 용접공 등)
 */
export const workerTypes = pgTable("worker_types", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WorkerType = typeof workerTypes.$inferSelect;
export type InsertWorkerType = typeof workerTypes.$inferInsert;

/**
 * 인력별 필수 서류 정의
 */
export const workerDocs = pgTable("worker_docs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workerTypeId: varchar("worker_type_id", { length: 64 }).notNull(),
  docName: varchar("doc_name", { length: 200 }).notNull(),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  hasExpiry: boolean("has_expiry").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WorkerDoc = typeof workerDocs.$inferSelect;
export type InsertWorkerDoc = typeof workerDocs.$inferInsert;

// ============================================================
// 마스터 데이터: 안전점검표 템플릿
// ============================================================

/**
 * 안전점검표 템플릿 (JSON 형식으로 동적 양식 관리)
 */
export const checklistForms = pgTable("checklist_forms", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  formJson: jsonb("form_json").notNull(),
  createdBy: varchar("created_by", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ChecklistForm = typeof checklistForms.$inferSelect;
export type InsertChecklistForm = typeof checklistForms.$inferInsert;

// ============================================================
// 운영 데이터: 등록된 장비
// ============================================================

/**
 * 등록된 장비 정보
 */
export const equipment = pgTable("equipment", {
  id: varchar("id", { length: 64 }).primaryKey(),
  equipTypeId: varchar("equip_type_id", { length: 64 }).notNull(),
  regNum: varchar("reg_num", { length: 100 }).notNull().unique(),
  specification: varchar("specification", { length: 200 }), // 장비 세부 규격
  ownerId: varchar("owner_id", { length: 64 }),
  currentBpId: varchar("current_bp_id", { length: 64 }),
  status: varchar("status", { length: 50 }).default("idle").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ============================================================
// 운영 데이터: 등록된 인력
// ============================================================

/**
 * 등록된 인력 정보
 */
export const workers = pgTable("workers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }), // 로그인 계정 연결 (users.id)
  workerTypeId: varchar("worker_type_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  licenseNum: varchar("license_num", { length: 100 }),
  licenseStatus: varchar("license_status", { length: 50 }),
  ownerId: varchar("owner_id", { length: 64 }),
  phone: varchar("phone", { length: 20 }),
  pinCode: varchar("pin_code", { length: 6 }),
  address: text("address"),
  residentNumber: varchar("resident_number", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

// ============================================================
// 운영 데이터: 서류 관리
// ============================================================

/**
 * 업로드된 서류 관리 (장비 또는 인력)
 */
export const docsCompliance = pgTable("docs_compliance", {
  id: varchar("id", { length: 64 }).primaryKey(),
  targetType: targetTypeEnum("target_type").notNull(),
  targetId: varchar("target_id", { length: 64 }).notNull(),
  docTypeId: varchar("doc_type_id", { length: 64 }).notNull(),
  docType: varchar("doc_type", { length: 200 }).notNull(),
  fileName: varchar("file_name", { length: 300 }),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  
  // 승인 워크플로우
  workflowStage: varchar("workflow_stage", { length: 50 }).default("bp_upload").notNull(),
  adminApprovedAt: timestamp("admin_approved_at"),
  adminApprovedBy: varchar("admin_approved_by", { length: 64 }),
  bpApprovedAt: timestamp("bp_approved_at"),
  bpApprovedBy: varchar("bp_approved_by", { length: 64 }),
  epApprovedAt: timestamp("ep_approved_at"),
  epApprovedBy: varchar("ep_approved_by", { length: 64 }),
  
  // 작업지시서
  workOrderFileUrl: varchar("work_order_file_url", { length: 500 }),
  workOrderUploadedAt: timestamp("work_order_uploaded_at"),
  
  status: varchar("status", { length: 50 }).default("pending_admin").notNull(),
  rejectReason: text("reject_reason"),
  uploadedBy: varchar("uploaded_by", { length: 64 }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DocsCompliance = typeof docsCompliance.$inferSelect;
export type InsertDocsCompliance = typeof docsCompliance.$inferInsert;

// ============================================================
// 운영 데이터: 안전점검 기록
// ============================================================

/**
 * 실제 안전점검 결과 저장
 */
export const checkRecords = pgTable("check_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  equipmentId: varchar("equipment_id", { length: 64 }).notNull(),
  checklistFormId: varchar("checklist_form_id", { length: 64 }).notNull(),
  inspectorId: varchar("inspector_id", { length: 64 }),
  inspectionDate: timestamp("inspection_date").notNull(),
  resultJson: jsonb("result_json").notNull(),
  status: varchar("status", { length: 50 }).default("completed").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CheckRecord = typeof checkRecords.$inferSelect;
export type InsertCheckRecord = typeof checkRecords.$inferInsert;

// ============================================================
// 운영 데이터: 일일 작업 확인서
// ============================================================

/**
 * 일일 작업 확인서
 */
export const workJournal = pgTable("work_journal", {
  id: varchar("id", { length: 64 }).primaryKey(),

  // 투입 연결 (핵심!)
  deploymentId: varchar("deployment_id", { length: 64 }).notNull(),

  // 기본 정보 (deployment에서 자동 복사, 이력 보존용)
  equipmentId: varchar("equipment_id", { length: 64 }).notNull(),
  workerId: varchar("worker_id", { length: 64 }).notNull(),
  bpCompanyId: varchar("bp_company_id", { length: 64 }).notNull(),

  // 현장 정보 (deployment에서 자동 복사)
  siteName: varchar("site_name", { length: 200 }).notNull(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  equipmentName: varchar("equipment_name", { length: 100 }),
  specification: varchar("specification", { length: 100 }),

  // 작업 정보 (운전자 입력)
  workDate: timestamp("work_date").notNull(),
  workLocation: varchar("work_location", { length: 200 }), // 작업위치
  workContent: text("work_content"), // 작업내용 (상세)
  workDetails: text("work_details"), // 기존 필드 유지 (호환성)

  // 시간 정보 (혼합 방식: 자동 계산 + 수동 조정)
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  totalHours: integer("total_hours").notNull(), // 총 시간 (호환성)
  regularHours: decimal("regular_hours", { precision: 4, scale: 2 }), // 일반 근무
  otHours: decimal("ot_hours", { precision: 4, scale: 2 }), // OT
  nightHours: decimal("night_hours", { precision: 4, scale: 2 }), // 철야

  // 제출 및 승인
  submittedBy: varchar("submitted_by", { length: 64 }),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedByBp: varchar("approved_by_bp", { length: 64 }),
  approvedAtBp: timestamp("approved_at_bp"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  bpComments: text("bp_comments"),

  // 서명 (Phase 2)
  bpSignatureData: text("bp_signature_data"), // 서명 이미지 base64
  bpSignerName: varchar("bp_signer_name", { length: 100 }), // 서명자 이름
  signedAt: timestamp("signed_at"), // 서명 일시

  // PDF (Phase 2)
  pdfUrl: varchar("pdf_url", { length: 500 }), // PDF 파일 URL
});

export type WorkJournal = typeof workJournal.$inferSelect;
export type InsertWorkJournal = typeof workJournal.$inferInsert;

/**
 * 월별 작업 리포트
 * - 일일 작업확인서를 자동 집계
 * - 월별 총 작업시간 및 금액 계산
 */
export const monthlyWorkReports = pgTable("monthly_work_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  deploymentId: varchar("deployment_id", { length: 64 }).notNull(),
  yearMonth: varchar("year_month", { length: 7 }).notNull(), // '2025-01'

  // 집계 정보
  totalWorkDays: integer("total_work_days").default(0),
  totalRegularHours: decimal("total_regular_hours", { precision: 8, scale: 2 }).default("0"),
  totalOtHours: decimal("total_ot_hours", { precision: 8, scale: 2 }).default("0"),
  totalNightHours: decimal("total_night_hours", { precision: 8, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }), // 총 금액

  // 서명 및 PDF (Phase 2)
  pdfUrl: varchar("pdf_url", { length: 500 }),
  autoSigned: boolean("auto_signed").default(false), // 일일 서명 자동 반영 여부

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MonthlyWorkReport = typeof monthlyWorkReports.$inferSelect;
export type InsertMonthlyWorkReport = typeof monthlyWorkReports.$inferInsert;


// ============================================================
// 반입 요청 및 승인 워크플로우
// ============================================================

/**
 * 반입 요청 (BP → Owner → BP → EP)
 * 1. BP: 장비+인력 투입 요청
 * 2. Owner: 서류 첨부 및 승인
 * 3. BP: 작업계획서 첨부 및 승인
 * 4. EP: 최종 승인 → 반입 완료
 */
export const entryRequests = pgTable("entry_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  requestNumber: varchar("request_number", { length: 100 }).notNull(), // 요청 번호
  
  // 요청 정보
  bpCompanyId: varchar("bp_company_id", { length: 64 }).notNull(), // 협력사 ID
  bpUserId: varchar("bp_user_id", { length: 64 }).notNull(), // 요청자 ID
  equipmentId: varchar("equipment_id", { length: 64 }), // 장비 ID (호환성 유지, NULL 허용)
  workerId: varchar("worker_id", { length: 64 }), // 운전자 ID (호환성 유지, NULL 허용)
  
  purpose: text("purpose"), // 투입 목적
  requestedStartDate: timestamp("requested_start_date"), // 투입 예정일
  requestedEndDate: timestamp("requested_end_date"), // 철수 예정일
  
  // 워크플로우 상태
  status: entryRequestStatusEnum("status").default("bp_requested").notNull(),
  
  // 서류 검증
  documentsVerifiedAt: timestamp("documents_verified_at"),
  documentsVerificationResult: jsonb("documents_verification_result"),
  
  // Owner 승인 (2단계)
  ownerApprovedAt: timestamp("owner_approved_at"),
  ownerApprovedBy: varchar("owner_approved_by", { length: 64 }),
  ownerComment: text("owner_comment"),
  
  // BP 승인 (3단계)
  bpApprovedAt: timestamp("bp_approved_at"),
  bpApprovedBy: varchar("bp_approved_by", { length: 64 }),
  workPlanFileUrl: varchar("work_plan_file_url", { length: 500 }), // 작업계획서
  bpComment: text("bp_comment"),
  
  // EP 승인 (4단계)
  epApprovedAt: timestamp("ep_approved_at"),
  epApprovedBy: varchar("ep_approved_by", { length: 64 }),
  epComment: text("ep_comment"),
  
  // 반려
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: varchar("rejected_by", { length: 64 }),
  rejectReason: text("reject_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EntryRequest = typeof entryRequests.$inferSelect;
export type InsertEntryRequest = typeof entryRequests.$inferInsert;



/**
 * 반입 요청 아이템 (장비/인력 목록)
 * 한 반입 요청에 여러 장비/인력을 포함할 수 있습니다.
 */
export const entryRequestItems = pgTable("entry_request_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  entryRequestId: varchar("entry_request_id", { length: 64 }).notNull(),
  itemType: entryRequestItemTypeEnum("item_type").notNull(),
  itemId: varchar("item_id", { length: 64 }).notNull(),
  
  // 서류 검증 결과
  documentStatus: documentStatusEnum("document_status").default("pending").notNull(),
  documentIssues: jsonb("document_issues"),
  
  // 차량-인력 페어링
  pairedEquipmentId: varchar("paired_equipment_id", { length: 64 }),
  pairedWorkerId: varchar("paired_worker_id", { length: 64 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export type EntryRequestItem = typeof entryRequestItems.$inferSelect;
export type InsertEntryRequestItem = typeof entryRequestItems.$inferInsert;

// ============================================================
// 투입 관리 (Deployments)
// ============================================================

export const deploymentStatusEnum = pgEnum("deployment_status", ["pending", "active", "extended", "completed"]);

/**
 * 투입 관리
 * EP 승인 후 실제 장비+인력이 현장에 투입된 상태를 관리
 */
export const deployments = pgTable("deployments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  entryRequestId: varchar("entry_request_id", { length: 64 }).notNull(),
  equipmentId: varchar("equipment_id", { length: 64 }).notNull(),
  workerId: varchar("worker_id", { length: 64 }).notNull(),
  ownerId: varchar("owner_id", { length: 64 }).notNull(),
  bpCompanyId: varchar("bp_company_id", { length: 64 }).notNull(),
  epCompanyId: varchar("ep_company_id", { length: 64 }),

  startDate: timestamp("start_date").notNull(),
  plannedEndDate: timestamp("planned_end_date").notNull(),
  actualEndDate: timestamp("actual_end_date"),

  status: varchar("status", { length: 50 }).default("active").notNull(),

  // 작업확인서용 추가 정보
  siteName: varchar("site_name", { length: 200 }), // 공사명/현장명
  workType: varchar("work_type", { length: 20 }), // 'daily' | 'monthly'
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }), // 일대 단가
  monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }), // 월대 단가
  otRate: decimal("ot_rate", { precision: 10, scale: 2 }), // OT 단가
  nightRate: decimal("night_rate", { precision: 10, scale: 2 }), // 철야 단가

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = typeof deployments.$inferInsert;

/**
 * 운전자 교체 이력
 */
export const deploymentWorkerChanges = pgTable("deployment_worker_changes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  deploymentId: varchar("deployment_id", { length: 64 }).notNull(),
  oldWorkerId: varchar("old_worker_id", { length: 64 }).notNull(),
  newWorkerId: varchar("new_worker_id", { length: 64 }).notNull(),
  changeReason: text("change_reason"),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: varchar("changed_by", { length: 64 }).notNull(),
});

export type DeploymentWorkerChange = typeof deploymentWorkerChanges.$inferSelect;
export type InsertDeploymentWorkerChange = typeof deploymentWorkerChanges.$inferInsert;

/**
 * 투입 기간 연장 이력
 */
export const deploymentExtensions = pgTable("deployment_extensions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  deploymentId: varchar("deployment_id", { length: 64 }).notNull(),
  oldEndDate: timestamp("old_end_date").notNull(),
  newEndDate: timestamp("new_end_date").notNull(),
  extensionReason: text("extension_reason"),
  extendedAt: timestamp("extended_at").defaultNow(),
  extendedBy: varchar("extended_by", { length: 64 }).notNull(),
});

export type DeploymentExtension = typeof deploymentExtensions.$inferSelect;
export type InsertDeploymentExtension = typeof deploymentExtensions.$inferInsert;

// ============================================================
// 안전점검 시스템 (Safety Inspection System)
// ============================================================

/**
 * 안전점검 템플릿
 * 장비 타입별로 점검 항목을 정의하는 템플릿
 */
export const safetyInspectionTemplates = pgTable("safety_inspection_templates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 예: "스카이장비 일일점검"
  equipTypeId: varchar("equip_type_id", { length: 64 }), // null이면 전체 장비용
  inspectorType: varchar("inspector_type", { length: 20 }).notNull(), // "inspector" or "driver"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by", { length: 64 }),
  updatedAt: timestamp("updated_at"),
});

export type SafetyInspectionTemplate = typeof safetyInspectionTemplates.$inferSelect;
export type InsertSafetyInspectionTemplate = typeof safetyInspectionTemplates.$inferInsert;

/**
 * 안전점검 템플릿 체크 항목
 * 각 템플릿의 구체적인 점검 항목들
 */
export const safetyInspectionTemplateItems = pgTable("safety_inspection_template_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  templateId: varchar("template_id", { length: 64 }).notNull(),
  category: varchar("category", { length: 100 }), // 항목 카테고리 구분 (선택사항)
  itemText: text("item_text").notNull(), // 점검 항목 내용
  checkFrequency: varchar("check_frequency", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "as_needed"
  checkTiming: varchar("check_timing", { length: 100 }), // "before_use", "during_use", "after_use" (콤마로 구분)
  resultType: varchar("result_type", { length: 20 }).default("status"), // "status" (양호/불량 등) or "text" (텍스트 입력)
  displayOrder: integer("display_order").default(0),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SafetyInspectionTemplateItem = typeof safetyInspectionTemplateItems.$inferSelect;
export type InsertSafetyInspectionTemplateItem = typeof safetyInspectionTemplateItems.$inferInsert;

/**
 * 안전점검 기록
 * 실제로 수행된 점검 기록
 */
export const safetyInspections = pgTable("safety_inspections", {
  id: varchar("id", { length: 64 }).primaryKey(),
  templateId: varchar("template_id", { length: 64 }),
  equipmentId: varchar("equipment_id", { length: 64 }).notNull(),
  inspectorId: varchar("inspector_id", { length: 64 }).notNull(), // 점검원 또는 운전자
  inspectorType: varchar("inspector_type", { length: 20 }).notNull(), // "inspector" or "driver"

  inspectionDate: date("inspection_date").notNull(),
  checkFrequency: varchar("check_frequency", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "as_needed"

  // 장비 정보 (스냅샷 - 점검 시점의 정보)
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  equipmentName: varchar("equipment_name", { length: 255 }),

  // 점검원 정보
  inspectorName: varchar("inspector_name", { length: 100 }),
  inspectorSignature: text("inspector_signature"), // Base64 서명 이미지
  signedAt: timestamp("signed_at"),

  // 상태
  status: varchar("status", { length: 20 }).default("draft"), // "draft", "submitted", "reviewed"
  overallResult: varchar("overall_result", { length: 20 }), // "pass", "fail", "conditional"

  // EP 확인 (점검원이 작성한 경우만)
  reviewedBy: varchar("reviewed_by", { length: 64 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewComments: text("review_comments"),

  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type SafetyInspection = typeof safetyInspections.$inferSelect;
export type InsertSafetyInspection = typeof safetyInspections.$inferInsert;

// ============================================================
// 운전자 안전점검 시스템 (Driver Inspection System)
// 안전점검원(inspector) 시스템과 별도로 운전자(driver)용 점검 시스템
// ============================================================

/**
 * 운전자 점검표 템플릿
 * 차종별 운전자 점검 항목을 정의
 */
export const driverInspectionTemplates = pgTable("driver_inspection_templates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 예: "크레인 점검표"
  equipTypeId: varchar("equip_type_id", { length: 64 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by", { length: 64 }),
  updatedAt: timestamp("updated_at"),
});

export type DriverInspectionTemplate = typeof driverInspectionTemplates.$inferSelect;
export type InsertDriverInspectionTemplate = typeof driverInspectionTemplates.$inferInsert;

/**
 * 운전자 점검표 템플릿 항목
 * 각 템플릿의 구체적인 점검 항목들
 */
export const driverInspectionTemplateItems = pgTable("driver_inspection_template_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  templateId: varchar("template_id", { length: 64 }).notNull(),
  category: varchar("category", { length: 100 }), // 예: "유체레벨", "구조부", "안전장치"
  itemText: text("item_text").notNull(),
  checkFrequency: varchar("check_frequency", { length: 20 }).notNull(), // "daily", "weekly", "monthly"
  resultType: varchar("result_type", { length: 20 }).default("status"), // "status", "text", "numeric"
  displayOrder: integer("display_order").default(0),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DriverInspectionTemplateItem = typeof driverInspectionTemplateItems.$inferSelect;
export type InsertDriverInspectionTemplateItem = typeof driverInspectionTemplateItems.$inferInsert;

/**
 * 운전자 점검 기록
 * 운전자가 작성한 점검 기록 및 운행 정보
 */
export const driverInspectionRecords = pgTable("driver_inspection_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  templateId: varchar("template_id", { length: 64 }),
  equipmentId: varchar("equipment_id", { length: 64 }).notNull(),
  driverId: varchar("driver_id", { length: 64 }).notNull(),
  inspectionDate: date("inspection_date").notNull(),
  checkFrequency: varchar("check_frequency", { length: 20 }).notNull(),

  // 장비 정보 (스냅샷)
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  equipmentName: varchar("equipment_name", { length: 255 }),
  driverName: varchar("driver_name", { length: 100 }),

  // 운행 정보
  accumulatedHours: decimal("accumulated_hours", { precision: 10, scale: 2 }), // 건설기계 누적시간
  accumulatedMileage: decimal("accumulated_mileage", { precision: 10, scale: 2 }), // 차량 누적거리
  operationHoursToday: decimal("operation_hours_today", { precision: 8, scale: 2 }),
  mileageToday: decimal("mileage_today", { precision: 8, scale: 2 }),

  // 소모품 정보
  lastOilChangeDate: date("last_oil_change_date"),
  lastOilChangeHours: decimal("last_oil_change_hours", { precision: 10, scale: 2 }),
  lastOilChangeMileage: decimal("last_oil_change_mileage", { precision: 10, scale: 2 }),
  lastHydraulicOilChangeDate: date("last_hydraulic_oil_change_date"),
  lastFilterChangeDate: date("last_filter_change_date"),

  // 서명 및 상태
  driverSignature: text("driver_signature"),
  signedAt: timestamp("signed_at"),
  status: varchar("status", { length: 20 }).default("draft"), // "draft", "completed"
  overallResult: varchar("overall_result", { length: 20 }), // "pass", "attention_required"
  notes: text("notes"),

  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type DriverInspectionRecord = typeof driverInspectionRecords.$inferSelect;
export type InsertDriverInspectionRecord = typeof driverInspectionRecords.$inferInsert;

/**
 * 운전자 점검 기록 상세 항목
 * 각 점검 항목별 결과
 */
export const driverInspectionRecordItems = pgTable("driver_inspection_record_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  recordId: varchar("record_id", { length: 64 }).notNull(),
  templateItemId: varchar("template_item_id", { length: 64 }),
  category: varchar("category", { length: 100 }),
  itemText: text("item_text").notNull(),
  result: varchar("result", { length: 20 }), // "good", "bad", "warning"
  resultText: text("result_text"),
  numericValue: decimal("numeric_value", { precision: 10, scale: 2 }),
  actionRequired: text("action_required"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DriverInspectionRecordItem = typeof driverInspectionRecordItems.$inferSelect;
export type InsertDriverInspectionRecordItem = typeof driverInspectionRecordItems.$inferInsert;

/**
 * 안전점검 항목별 결과
 * 각 점검 항목에 대한 상세 결과
 */
export const safetyInspectionResults = pgTable("safety_inspection_results", {
  id: varchar("id", { length: 64 }).primaryKey(),
  inspectionId: varchar("inspection_id", { length: 64 }).notNull(),
  templateItemId: varchar("template_item_id", { length: 64 }),

  // 점검 항목 정보 (템플릿 항목이 삭제되어도 기록 유지를 위해 복사)
  itemText: text("item_text").notNull(),
  checkTiming: varchar("check_timing", { length: 20 }), // "before_use", "during_use", "after_use"

  // 결과
  result: varchar("result", { length: 20 }), // "good" (양호/ㅇ), "adjust" (조정), "replace" (교환/ㅁ), "manufacture" (제작), "discard" (폐기/불량/X), "na" (해당없음)
  resultText: text("result_text"), // 텍스트형 결과 (예: "바람 세기 10m/s")

  // 조치사항
  actionRequired: text("action_required"),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SafetyInspectionResult = typeof safetyInspectionResults.$inferSelect;
export type InsertSafetyInspectionResult = typeof safetyInspectionResults.$inferInsert;

