/**
 * 서류 검증 로직
 * 반입 요청 시 장비/인력의 필수 서류를 자동으로 검증합니다.
 */

import { getSupabase } from './db';
import { toCamelCaseArray } from './db-utils';

// ============================================================
// 타입 정의
// ============================================================

export type DocumentStatus = 'valid' | 'warning' | 'expired' | 'missing' | 'pending';

export interface DocumentInfo {
  docName: string;
  docTypeId: string;
  isMandatory: boolean;
  hasExpiry: boolean;
  status: DocumentStatus;
  expiryDate?: string;
  daysUntilExpiry?: number;
  fileUrl?: string;
  issueDate?: string;
  approvalStatus?: string;
}

export interface ItemValidationResult {
  itemId: string;
  itemType: 'equipment' | 'worker';
  itemName: string;
  overallStatus: DocumentStatus;
  documents: DocumentInfo[];
  issues: string[];
}

export interface ValidationResult {
  isValid: boolean;
  items: ItemValidationResult[];
  summary: {
    totalItems: number;
    validItems: number;
    warningItems: number;
    invalidItems: number;
  };
}

// ============================================================
// 서류 상태 판단 함수
// ============================================================

/**
 * 만료일까지 남은 일수 계산
 */
function getDaysUntilExpiry(expiryDate: string | Date | null | undefined): number | null {
  if (!expiryDate) return null;
  
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * 서류 상태 판단
 */
function getDocumentStatus(
  expiryDate: string | Date | null | undefined,
  approvalStatus: string | null | undefined,
  hasExpiry: boolean
): DocumentStatus {
  // 승인되지 않은 서류
  if (!approvalStatus || approvalStatus !== 'approved') {
    return 'pending';
  }
  
  // 만료일이 없는 서류는 정상
  if (!hasExpiry || !expiryDate) {
    return 'valid';
  }
  
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  
  if (daysUntilExpiry === null) {
    return 'valid';
  }
  
  // 만료된 서류
  if (daysUntilExpiry < 0) {
    return 'expired';
  }
  
  // 만료 예정 (7일 이내)
  if (daysUntilExpiry <= 7) {
    return 'warning';
  }
  
  // 정상
  return 'valid';
}

// ============================================================
// 장비 서류 검증
// ============================================================

/**
 * 장비의 필수 서류를 검증합니다.
 */
export async function validateEquipmentDocuments(equipmentId: string): Promise<ItemValidationResult> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // 1. 장비 정보 조회
  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select(`
      id,
      reg_num,
      equip_type_id,
      equip_types (
        id,
        name
      )
    `)
    .eq('id', equipmentId)
    .single();
  
  if (equipError || !equipment) {
    throw new Error(`장비를 찾을 수 없습니다: ${equipmentId}`);
  }
  
  // 2. 필수 서류 목록 조회
  const { data: requiredDocs, error: docsError } = await supabase
    .from('type_docs')
    .select('*')
    .eq('equip_type_id', equipment.equip_type_id);
  
  if (docsError) {
    throw new Error('필수 서류 목록을 조회할 수 없습니다');
  }
  
  // 3. 업로드된 서류 조회
  const { data: uploadedDocs, error: uploadError } = await supabase
    .from('docs_compliance')
    .select('*')
    .eq('target_type', 'equipment')
    .eq('target_id', equipmentId);
  
  if (uploadError) {
    throw new Error('업로드된 서류를 조회할 수 없습니다');
  }
  
  // 4. 서류 검증
  const documents: DocumentInfo[] = [];
  const issues: string[] = [];
  
  for (const requiredDoc of requiredDocs || []) {
    const uploadedDoc = uploadedDocs?.find(
      (doc: any) => doc.doc_type_id === requiredDoc.id
    );
    
    if (!uploadedDoc) {
      // 필수 서류가 없는 경우
      if (requiredDoc.is_mandatory) {
        documents.push({
          docName: requiredDoc.doc_name,
          docTypeId: requiredDoc.id,
          isMandatory: true,
          hasExpiry: requiredDoc.has_expiry,
          status: 'missing',
        });
        issues.push(`필수 서류 '${requiredDoc.doc_name}'이(가) 누락되었습니다.`);
      }
    } else {
      // 서류가 있는 경우 상태 확인
      const status = getDocumentStatus(
        uploadedDoc.expiry_date,
        uploadedDoc.status,
        requiredDoc.has_expiry
      );
      
      const daysUntilExpiry = getDaysUntilExpiry(uploadedDoc.expiry_date);
      
      documents.push({
        docName: requiredDoc.doc_name,
        docTypeId: requiredDoc.id,
        isMandatory: requiredDoc.is_mandatory,
        hasExpiry: requiredDoc.has_expiry,
        status,
        expiryDate: uploadedDoc.expiry_date,
        daysUntilExpiry: daysUntilExpiry ?? undefined,
        fileUrl: uploadedDoc.file_url,
        issueDate: uploadedDoc.issue_date,
        approvalStatus: uploadedDoc.status,
      });
      
      // 문제가 있는 경우 이슈 추가
      if (status === 'expired') {
        issues.push(`'${requiredDoc.doc_name}'이(가) 만료되었습니다.`);
      } else if (status === 'warning') {
        issues.push(`'${requiredDoc.doc_name}'이(가) ${daysUntilExpiry}일 후 만료됩니다.`);
      } else if (status === 'pending') {
        issues.push(`'${requiredDoc.doc_name}'이(가) 승인 대기 중입니다.`);
      }
    }
  }
  
  // 5. 전체 상태 판단
  let overallStatus: DocumentStatus = 'valid';
  
  if (documents.some(doc => doc.status === 'expired' || doc.status === 'missing')) {
    overallStatus = 'expired'; // 만료 또는 누락된 서류가 있으면 invalid
  } else if (documents.some(doc => doc.status === 'pending')) {
    overallStatus = 'pending'; // 승인 대기 중인 서류가 있으면 pending
  } else if (documents.some(doc => doc.status === 'warning')) {
    overallStatus = 'warning'; // 만료 예정 서류가 있으면 warning
  }
  
  return {
    itemId: equipmentId,
    itemType: 'equipment',
    itemName: `${(equipment as any).equip_types.name} ${equipment.reg_num}`,
    overallStatus,
    documents,
    issues,
  };
}

// ============================================================
// 인력 서류 검증
// ============================================================

/**
 * 인력의 필수 서류를 검증합니다.
 */
export async function validateWorkerDocuments(workerId: string): Promise<ItemValidationResult> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  // 1. 인력 정보 조회
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select(`
      id,
      name,
      license_num,
      worker_type_id,
      worker_types (
        id,
        name
      )
    `)
    .eq('id', workerId)
    .single();
  
  if (workerError || !worker) {
    throw new Error(`인력을 찾을 수 없습니다: ${workerId}`);
  }
  
  // 2. 필수 서류 목록 조회
  const { data: requiredDocs, error: docsError } = await supabase
    .from('worker_docs')
    .select('*')
    .eq('worker_type_id', worker.worker_type_id);
  
  if (docsError) {
    throw new Error('필수 서류 목록을 조회할 수 없습니다');
  }
  
  // 3. 업로드된 서류 조회
  const { data: uploadedDocs, error: uploadError } = await supabase
    .from('docs_compliance')
    .select('*')
    .eq('target_type', 'worker')
    .eq('target_id', workerId);
  
  if (uploadError) {
    throw new Error('업로드된 서류를 조회할 수 없습니다');
  }
  
  // 4. 서류 검증
  const documents: DocumentInfo[] = [];
  const issues: string[] = [];
  
  for (const requiredDoc of requiredDocs || []) {
    const uploadedDoc = uploadedDocs?.find(
      (doc: any) => doc.doc_type_id === requiredDoc.id
    );
    
    if (!uploadedDoc) {
      // 필수 서류가 없는 경우
      if (requiredDoc.is_mandatory) {
        documents.push({
          docName: requiredDoc.doc_name,
          docTypeId: requiredDoc.id,
          isMandatory: true,
          hasExpiry: requiredDoc.has_expiry,
          status: 'missing',
        });
        issues.push(`필수 서류 '${requiredDoc.doc_name}'이(가) 누락되었습니다.`);
      }
    } else {
      // 서류가 있는 경우 상태 확인
      const status = getDocumentStatus(
        uploadedDoc.expiry_date,
        uploadedDoc.status,
        requiredDoc.has_expiry
      );
      
      const daysUntilExpiry = getDaysUntilExpiry(uploadedDoc.expiry_date);
      
      documents.push({
        docName: requiredDoc.doc_name,
        docTypeId: requiredDoc.id,
        isMandatory: requiredDoc.is_mandatory,
        hasExpiry: requiredDoc.has_expiry,
        status,
        expiryDate: uploadedDoc.expiry_date,
        daysUntilExpiry: daysUntilExpiry ?? undefined,
        fileUrl: uploadedDoc.file_url,
        issueDate: uploadedDoc.issue_date,
        approvalStatus: uploadedDoc.status,
      });
      
      // 문제가 있는 경우 이슈 추가
      if (status === 'expired') {
        issues.push(`'${requiredDoc.doc_name}'이(가) 만료되었습니다.`);
      } else if (status === 'warning') {
        issues.push(`'${requiredDoc.doc_name}'이(가) ${daysUntilExpiry}일 후 만료됩니다.`);
      } else if (status === 'pending') {
        issues.push(`'${requiredDoc.doc_name}'이(가) 승인 대기 중입니다.`);
      }
    }
  }
  
  // 5. 전체 상태 판단
  let overallStatus: DocumentStatus = 'valid';
  
  if (documents.some(doc => doc.status === 'expired' || doc.status === 'missing')) {
    overallStatus = 'expired';
  } else if (documents.some(doc => doc.status === 'pending')) {
    overallStatus = 'pending';
  } else if (documents.some(doc => doc.status === 'warning')) {
    overallStatus = 'warning';
  }
  
  return {
    itemId: workerId,
    itemType: 'worker',
    itemName: `${worker.name} (${(worker as any).worker_types.name})`,
    overallStatus,
    documents,
    issues,
  };
}

// ============================================================
// 반입 요청 전체 검증
// ============================================================

/**
 * 반입 요청에 포함된 모든 장비/인력의 서류를 검증합니다.
 */
export async function validateEntryRequest(
  equipmentIds: string[],
  workerIds: string[]
): Promise<ValidationResult> {
  const items: ItemValidationResult[] = [];
  
  // 장비 검증
  for (const equipmentId of equipmentIds) {
    try {
      const result = await validateEquipmentDocuments(equipmentId);
      items.push(result);
    } catch (error) {
      console.error(`장비 검증 실패 (${equipmentId}):`, error);
      items.push({
        itemId: equipmentId,
        itemType: 'equipment',
        itemName: `장비 ${equipmentId}`,
        overallStatus: 'expired',
        documents: [],
        issues: ['장비 정보를 조회할 수 없습니다.'],
      });
    }
  }
  
  // 인력 검증
  for (const workerId of workerIds) {
    try {
      const result = await validateWorkerDocuments(workerId);
      items.push(result);
    } catch (error) {
      console.error(`인력 검증 실패 (${workerId}):`, error);
      items.push({
        itemId: workerId,
        itemType: 'worker',
        itemName: `인력 ${workerId}`,
        overallStatus: 'expired',
        documents: [],
        issues: ['인력 정보를 조회할 수 없습니다.'],
      });
    }
  }
  
  // 요약 정보 생성
  const summary = {
    totalItems: items.length,
    validItems: items.filter(item => item.overallStatus === 'valid').length,
    warningItems: items.filter(item => item.overallStatus === 'warning').length,
    invalidItems: items.filter(
      item => item.overallStatus === 'expired' || 
              item.overallStatus === 'missing' || 
              item.overallStatus === 'pending'
    ).length,
  };
  
  // 전체 유효성 판단
  const isValid = summary.invalidItems === 0;
  
  return {
    isValid,
    items,
    summary,
  };
}

