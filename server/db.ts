import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { toSnakeCase, toCamelCase, toCamelCaseArray } from './db-utils';
import {
  InsertUser,
  User,
  EquipType,
  InsertEquipType,
  WorkerType,
  InsertWorkerType,
  TypeDoc,
  InsertTypeDoc,
  WorkerDoc,
  InsertWorkerDoc,
  ChecklistForm,
  InsertChecklistForm,
  Equipment,
  InsertEquipment,
  Worker,
  InsertWorker,
  DocsCompliance,
  InsertDocsCompliance,
  CheckRecord,
  InsertCheckRecord,
  WorkJournal,
  InsertWorkJournal,
  EntryRequest,
  InsertEntryRequest,
  EntryRequestItem,
  InsertEntryRequestItem,
  Deployment,
  InsertDeployment,
  WorkZone,
  InsertWorkZone,
  CheckIn,
  InsertCheckIn,
  WebauthnCredential,
  InsertWebauthnCredential,
  SystemSetting,
  InsertSystemSetting,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase() {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Database] Supabase credentials missing!', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
      });
      return null;
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Database] Supabase client initialized', {
      url: supabaseUrl.substring(0, 30) + '...',
    });
  }
  return _supabase;
}

export function getSupabaseAdmin() {
  if (!_supabaseAdmin && supabaseUrl && supabaseServiceKey) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[Database] Supabase Admin client initialized');
  }
  return _supabaseAdmin;
}

// getDb는 호환성을 위해 유지하지만 Supabase 클라이언트를 반환
export async function getDb() {
  return getSupabase();
}

// ============================================================
// 사용자 관리
// ============================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.warn("[Database] Cannot upsert user: Supabase not available");
    return;
  }

  try {
    // 비밀번호가 있으면 해싱
    const userData = { ...user };
    if (userData.password) {
      const { hashPassword } = await import("./_core/password");
      userData.password = hashPassword(userData.password);
    }

    const { error } = await supabase
      .from('users')
      .upsert(toSnakeCase(userData), { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// Alias for createUser (same as upsertUser)
export const createUser = upsertUser;

export async function getUser(id: string): Promise<User | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting user:", error);
    return undefined;
  }

  return toCamelCase(data) as User;
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error("[Database] Error getting users:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as User[];
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    console.error("[Database] Error updating user role:", error);
  }
}

// ============================================================
// 장비 종류 관리
// ============================================================

export async function createEquipType(data: InsertEquipType) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('equip_types')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllEquipTypes(): Promise<EquipType[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('equip_types')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[Database] Error getting equip types:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as EquipType[];
}

export async function getEquipTypeById(id: string): Promise<EquipType | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('equip_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting equip type:", error);
    return undefined;
  }

  return data as EquipType;
}

export async function updateEquipType(id: string, data: Partial<InsertEquipType>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('equip_types')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating equip type:", error);
  }
}

export async function deleteEquipType(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('equip_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting equip type:", error);
  }
}

// ============================================================
// 장비별 필수 서류 관리
// ============================================================

export async function createTypeDoc(data: InsertTypeDoc) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('type_docs')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllTypeDocs(): Promise<TypeDoc[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('type_docs')
    .select('*');

  if (error) {
    console.error("[Database] Error getting type docs:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as TypeDoc[];
}

export async function getTypeDocsByEquipType(equipTypeId: string): Promise<TypeDoc[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('type_docs')
    .select('*')
    .eq('equip_type_id', equipTypeId);

  if (error) {
    console.error("[Database] Error getting type docs by equip type:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as TypeDoc[];
}

export async function deleteTypeDoc(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('type_docs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting type doc:", error);
  }
}

// ============================================================
// 인력 유형 관리
// ============================================================

export async function createWorkerType(data: InsertWorkerType) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('worker_types')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllWorkerTypes(): Promise<WorkerType[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('worker_types')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[Database] Error getting worker types:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as WorkerType[];
}

export async function getWorkerTypeById(id: string): Promise<WorkerType | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('worker_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting worker type:", error);
    return undefined;
  }

  return data as WorkerType;
}

export async function updateWorkerType(id: string, data: Partial<InsertWorkerType>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('worker_types')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating worker type:", error);
  }
}

export async function deleteWorkerType(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('worker_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting worker type:", error);
  }
}

// ============================================================
// 인력별 필수 서류 관리
// ============================================================

export async function createWorkerDoc(data: InsertWorkerDoc) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('worker_docs')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllWorkerDocs(): Promise<WorkerDoc[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('worker_docs')
    .select('*');

  if (error) {
    console.error("[Database] Error getting worker docs:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as WorkerDoc[];
}

export async function getWorkerDocsByWorkerType(workerTypeId: string): Promise<WorkerDoc[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('worker_docs')
    .select('*')
    .eq('worker_type_id', workerTypeId);

  if (error) {
    console.error("[Database] Error getting worker docs by worker type:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as WorkerDoc[];
}

export async function deleteWorkerDoc(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('worker_docs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting worker doc:", error);
  }
}

// ============================================================
// 안전점검표 템플릿 관리
// ============================================================

export async function createChecklistForm(data: InsertChecklistForm) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('checklist_forms')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllChecklistForms(): Promise<ChecklistForm[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('checklist_forms')
    .select('*');

  if (error) {
    console.error("[Database] Error getting checklist forms:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as ChecklistForm[];
}

export async function getChecklistFormById(id: string): Promise<ChecklistForm | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('checklist_forms')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting checklist form:", error);
    return undefined;
  }

  return data as ChecklistForm;
}

export async function updateChecklistForm(id: string, data: Partial<InsertChecklistForm>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('checklist_forms')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating checklist form:", error);
  }
}

export async function deleteChecklistForm(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('checklist_forms')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting checklist form:", error);
  }
}

// ============================================================
// 장비 관리
// ============================================================

export async function createEquipment(data: InsertEquipment) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('equipment')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllEquipment(): Promise<Equipment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('equipment')
    .select('*');

  if (error) {
    console.error("[Database] Error getting equipment:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as Equipment[];
}

export async function getEquipmentById(id: string): Promise<Equipment | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equip_type:equip_types!equipment_equip_type_id_fkey(id, name, description)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting equipment:", error);
    return undefined;
  }

  return toCamelCase(data) as Equipment;
}

export async function getEquipmentByOwner(ownerId: string): Promise<Equipment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('owner_id', ownerId);

  if (error) {
    console.error("[Database] Error getting equipment by owner:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as Equipment[];
}

export async function getEquipmentByAssignedWorker(workerId: string): Promise<Equipment | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  console.log("[Database] getEquipmentByAssignedWorker called with workerId:", workerId);

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equip_type:equip_types!equipment_equip_type_id_fkey(id, name, description)
    `)
    .eq('assigned_worker_id', workerId)
    .maybeSingle();

  if (error) {
    console.error("[Database] Error getting equipment by assigned worker:", workerId, error);
    return undefined;
  }

  if (!data) {
    console.log("[Database] No equipment assigned to worker:", workerId);
    return undefined;
  }

  console.log("[Database] Found equipment:", data.id, "for worker:", workerId);
  return toCamelCase(data) as Equipment;
}

export async function updateEquipment(id: string, data: Partial<InsertEquipment>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('equipment')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating equipment:", error);
  }
}

export async function deleteEquipment(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting equipment:", error);
  }
}

// ============================================================
// 인력 관리
// ============================================================

export async function createWorker(data: InsertWorker) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('workers')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllWorkers(): Promise<Worker[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('workers')
    .select('*');

  if (error) {
    console.error("[Database] Error getting workers:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as Worker[];
}

export async function getWorkerById(id: string): Promise<Worker | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting worker:", error);
    return undefined;
  }

  return data as Worker;
}

export async function getWorkerByPin(pinCode: string): Promise<User | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('pin', pinCode)
    .eq('role', 'worker')
    .single();

  if (error) {
    console.error("[Database] Error getting worker by PIN:", error);
    return undefined;
  }

  return data as User;
}

export async function getWorkersByOwner(ownerId: string): Promise<Worker[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('owner_id', ownerId);

  if (error) {
    console.error("[Database] Error getting workers by owner:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as Worker[];
}

export async function updateWorker(id: string, data: Partial<InsertWorker>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('workers')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating worker:", error);
  }
}

export async function getWorkerByPinCode(pinCode: string): Promise<Worker | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  console.log("[Database] getWorkerByPinCode called with PIN:", pinCode);

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('pin_code', pinCode)
    .maybeSingle();

  if (error) {
    console.error("[Database] Error getting worker by PIN:", pinCode, error);
    return undefined;
  }

  if (!data) {
    console.log("[Database] No worker found with PIN:", pinCode);
    // 디버깅: 모든 worker의 PIN 확인
    const { data: allWorkers } = await supabase
      .from('workers')
      .select('id, name, pin_code');
    console.log("[Database] All workers with PINs:", allWorkers?.map((w: any) => ({ id: w.id, name: w.name, pin: w.pin_code })));
    return undefined;
  }

  console.log("[Database] Found worker:", data.id, data.name, "with PIN:", pinCode);
  return toCamelCase(data) as Worker;
}

export async function getWorkerByEmail(email: string): Promise<Worker | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  console.log("[Database] getWorkerByEmail called with email:", email);

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error("[Database] Error getting worker by email:", email, error);
    return undefined;
  }

  if (!data) {
    console.log("[Database] No worker found with email:", email);
    return undefined;
  }

  console.log("[Database] Found worker:", data.id, data.name, "with email:", email);
  return toCamelCase(data) as Worker;
}

export async function deleteWorker(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting worker:", error);
  }
}

// ============================================================
// 서류 관리
// ============================================================

export async function createDocsCompliance(data: InsertDocsCompliance) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('docs_compliance')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllDocsCompliance(): Promise<DocsCompliance[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('docs_compliance')
    .select('*');

  if (error) {
    console.error("[Database] Error getting docs compliance:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as DocsCompliance[];
}

export async function getDocsComplianceById(id: string): Promise<DocsCompliance | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('docs_compliance')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting docs compliance:", error);
    return undefined;
  }

  return data as DocsCompliance;
}

export async function getDocsComplianceByTarget(targetType: "equipment" | "worker", targetId: string): Promise<DocsCompliance[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('docs_compliance')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  if (error) {
    console.error("[Database] Error getting docs compliance by target:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as DocsCompliance[];
}

export async function updateDocsCompliance(id: string, data: Partial<InsertDocsCompliance>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('docs_compliance')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating docs compliance:", error);
  }
}

export async function deleteDocsCompliance(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('docs_compliance')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Database] Error deleting docs compliance:", error);
  }
}

// 만료 예정 서류 조회
export async function getExpiringDocs(daysAhead: number = 30): Promise<DocsCompliance[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('docs_compliance')
    .select('*')
    .lte('expiry_date', futureDate.toISOString())
    .gte('expiry_date', new Date().toISOString());

  if (error) {
    console.error("[Database] Error getting expiring docs:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as DocsCompliance[];
}

// ============================================================
// 안전점검 기록
// ============================================================

export async function createCheckRecord(data: InsertCheckRecord) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('check_records')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllCheckRecords(): Promise<CheckRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('check_records')
    .select('*')
    .order('inspection_date', { ascending: false });

  if (error) {
    console.error("[Database] Error getting check records:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as CheckRecord[];
}

export async function getCheckRecordsByEquipment(equipmentId: string): Promise<CheckRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('check_records')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('inspection_date', { ascending: false });

  if (error) {
    console.error("[Database] Error getting check records by equipment:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as CheckRecord[];
}

// ============================================================
// 일일 작업 확인서
// ============================================================

export async function createWorkJournal(data: InsertWorkJournal) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('work_journal')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getWorkJournals(filters?: {
  workerId?: string;
  bpCompanyId?: string;
  deploymentId?: string;
  ownerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<WorkJournal[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  console.log("[Database] getWorkJournals called with filters:", filters);

  // Owner 필터가 있으면 deployment를 통해 필터링
  if (filters?.ownerId) {
    // Step 1: Owner의 deployment IDs 조회
    const { data: deployments } = await supabase
      .from('deployments')
      .select('id')
      .eq('owner_id', filters.ownerId);

    const deploymentIds = (deployments || []).map((d: any) => d.id);
    if (deploymentIds.length === 0) {
      console.log("[Database] No deployments found for owner:", filters.ownerId);
      return [];
    }

    // Step 2: 해당 deployment의 work_journal 조회 (worker 정보 포함)
    let query = supabase
      .from('work_journal')
      .select(`
        *,
        worker:workers!work_journal_worker_id_fkey(id, name, license_num)
      `)
      .in('deployment_id', deploymentIds)
      .order('work_date', { ascending: false });

    if (filters?.workerId) {
      query = query.eq('worker_id', filters.workerId);
    }
    if (filters?.bpCompanyId) {
      query = query.eq('bp_company_id', filters.bpCompanyId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('work_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('work_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[Database] Error getting work journals:", error);
      return [];
    }

    console.log("[Database] getWorkJournals returned:", data?.length || 0, "records (filtered by owner)");
    return toCamelCaseArray(data || []) as WorkJournal[];
  }

  // Owner 필터가 없으면 기존 방식 (worker 정보 포함)
  let query = supabase
    .from('work_journal')
    .select(`
      *,
      worker:workers!work_journal_worker_id_fkey(id, name, license_num)
    `)
    .order('work_date', { ascending: false});

  if (filters?.workerId) {
    query = query.eq('worker_id', filters.workerId);
  }
  if (filters?.bpCompanyId) {
    query = query.eq('bp_company_id', filters.bpCompanyId);
  }
  if (filters?.deploymentId) {
    query = query.eq('deployment_id', filters.deploymentId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('work_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('work_date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Database] Error getting work journals:", error);
    return [];
  }

  console.log("[Database] getWorkJournals returned:", data?.length || 0, "records");
  if (data && data.length > 0) {
    console.log("[Database] First record BP Company ID:", data[0].bp_company_id);
  }

  return toCamelCaseArray(data || []) as WorkJournal[];
}

export async function getAllWorkJournals(): Promise<WorkJournal[]> {
  return getWorkJournals();
}

export async function getWorkJournalById(id: string): Promise<WorkJournal | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('work_journal')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting work journal:", error);
    return undefined;
  }

  return data as WorkJournal;
}

export async function updateWorkJournal(id: string, data: Partial<InsertWorkJournal>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('work_journal')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating work journal:", error);
  }
}

/**
 * Owner의 작업확인서 목록 조회
 * deployment를 통해 owner_id로 필터링
 */
export async function getWorkJournalsByOwnerId(ownerId: string, filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<WorkJournal[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // Step 1: Get deployment IDs for this owner
  console.log("[Database] getWorkJournalsByOwnerId - Searching deployments for owner_id:", ownerId);
  const { data: deployments, error: deploymentError } = await supabase
    .from('deployments')
    .select('id')
    .eq('owner_id', ownerId);

  if (deploymentError) {
    console.error("[Database] Error getting deployments for owner:", deploymentError);
    return [];
  }

  console.log("[Database] getWorkJournalsByOwnerId - Found deployments:", deployments?.length || 0);
  const deploymentIds = (deployments || []).map((d: any) => d.id);
  if (deploymentIds.length === 0) {
    console.log("[Database] getWorkJournalsByOwnerId - No deployments found for owner:", ownerId);
    // Check what owner_ids exist in deployments table
    const { data: allDeployments } = await supabase
      .from('deployments')
      .select('owner_id')
      .limit(10);
    console.log("[Database] Sample owner_ids in deployments table:", allDeployments?.map((d: any) => d.owner_id));
    return []; // No deployments for this owner
  }

  console.log("[Database] getWorkJournalsByOwnerId - Deployment IDs:", deploymentIds);

  // Step 2: Get work journals for these deployments
  let query = supabase
    .from('work_journal')
    .select('*')
    .in('deployment_id', deploymentIds)
    .order('work_date', { ascending: false });

  // Check what deployment_ids exist in work_journal table
  const { data: allWorkJournals } = await supabase
    .from('work_journal')
    .select('deployment_id')
    .limit(10);
  console.log("[Database] Sample deployment_ids in work_journal table:", allWorkJournals?.map((wj: any) => wj.deployment_id));

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('work_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('work_date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Database] Error getting work journals by owner:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as WorkJournal[];
}

// ============================================================
// 반입 요청
// ============================================================

export async function createEntryRequest(data: InsertEntryRequest) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('entry_requests')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getAllEntryRequests(): Promise<EntryRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('entry_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[Database] Error getting entry requests:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as EntryRequest[];
}

export async function getEntryRequestById(id: string): Promise<EntryRequest | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('entry_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting entry request:", error);
    return undefined;
  }

  return data as EntryRequest;
}

export async function updateEntryRequest(id: string, data: Partial<InsertEntryRequest>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('entry_requests')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating entry request:", error);
  }
}



// ============================================================
// 반입 요청 아이템 (장비/인력 목록)
// ============================================================

export async function createEntryRequestItem(data: InsertEntryRequestItem) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('entry_request_items')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function createEntryRequestItems(items: InsertEntryRequestItem[]) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('entry_request_items')
    .insert(items.map(item => toSnakeCase(item)));

  if (error) throw error;
}

export async function getEntryRequestItems(entryRequestId: string): Promise<EntryRequestItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('entry_request_items')
    .select('*')
    .eq('entry_request_id', entryRequestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("[Database] Error getting entry request items:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as EntryRequestItem[];
}

export async function updateEntryRequestItem(id: string, data: Partial<InsertEntryRequestItem>) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('entry_request_items')
    .update(toSnakeCase(data))
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating entry request item:", error);
  }
}

export async function deleteEntryRequestItems(entryRequestId: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('entry_request_items')
    .delete()
    .eq('entry_request_id', entryRequestId);

  if (error) {
    console.error("[Database] Error deleting entry request items:", error);
  }
}



// ============================================================
// 모바일 앱 관련 함수
// ============================================================

// Work Sessions
export async function createWorkSession(data: {
  id: string;
  equipmentId: string;
  workerId: string;
  workDate: Date;
  startTime: Date;
  status: string;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase
    .from('work_sessions')
    .insert(toSnakeCase(data));

  if (error) {
    console.error("[Database] Error creating work session:", error);
    throw error;
  }
}

export async function updateWorkSession(id: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase
    .from('work_sessions')
    .update({ ...toSnakeCase(data), updated_at: new Date() })
    .eq('id', id);

  if (error) {
    console.error("[Database] Error updating work session:", error);
    throw error;
  }
}

export async function getCurrentWorkSession(workerId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('worker_id', workerId)
    .is('end_time', null)  // status 컬럼 대신 end_time이 null인 것으로 진행 중 세션 판별
    .order('start_time', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("[Database] Error getting current work session:", error);
    throw error;
  }

  return data ? toCamelCaseArray([data])[0] : null;
}

export async function getAllActiveWorkSessions() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('work_sessions')
    .select(`
      *,
      workers:worker_id (
        id,
        name,
        worker_type_id
      ),
      equipment:equipment_id (
        id,
        reg_num,
        equip_type_id
      )
    `)
    .in('status', ['working', 'break', 'overtime'])
    .order('start_time', { ascending: false });

  if (error) {
    console.error("[Database] Error getting all active work sessions:", error);
    throw error;
  }

  return toCamelCaseArray(data || []);
}

export async function getWorkSessionsByWorker(workerId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .eq('worker_id', workerId)
    .order('work_date', { ascending: false });

  if (error) {
    console.error("[Database] Error getting work sessions:", error);
    throw error;
  }

  return toCamelCaseArray(data || []);
}

// Emergency Alerts - 새 버전은 아래에 있음

// Equipment - 배정된 장비 조회 (571번 라인에 정의되어 있음 - 중복 제거)

// Equipment - 차량번호 뒷 4자리로 검색
export async function searchEquipmentByLastFourDigits(lastFour: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .ilike('registration_number', `%${lastFour}`);

  if (error) {
    console.error("[Database] Error searching equipment:", error);
    throw error;
  }

  return toCamelCaseArray(data || []);
}



// ============================================================
// Companies 관리
// ============================================================

export async function createCompany(company: any): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const { error } = await supabase
    .from('companies')
    .insert(toSnakeCase(company));

  if (error) throw error;
}

export async function getCompanyById(id: string): Promise<any | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return undefined;
  return data;
}

export async function getAllCompanies(): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) return [];
  return (data || []).map(toCamelCase);
}

export async function getCompaniesByType(companyType: string): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('company_type', companyType)
    .order('name');

  if (error) return [];
  return (data || []).map(toCamelCase);
}

export async function updateCompany(id: string, updates: any): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const { error } = await supabase
    .from('companies')
    .update({ ...toSnakeCase(updates), updated_at: new Date() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getUsersByCompany(companyId: string): Promise<User[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId);

  if (error) return [];
  return (data || []) as User[];
}

/**
 * 이메일로 사용자 조회
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[Database] getUserByEmail: Supabase client not available');
    return null;
  }

  console.log('[Database] getUserByEmail: Querying for email:', email);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('[Database] getUserByEmail error:', error);
    return null;
  }
  
  if (!data) {
    console.log('[Database] getUserByEmail: No user found for email:', email);
    return null;
  }
  
  console.log('[Database] getUserByEmail: Found user:', data.id, data.email);
  return toCamelCase(data) as User;
}

/**
 * 이메일 + PIN으로 사용자 조회 (Inspector/Worker 모바일 로그인용)
 */
export async function getUserByEmailAndPin(email: string, pin: string): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('pin', pin)
    .single();

  if (error) return null;
  return toCamelCase(data) as User;
}

/**
 * 사용자 PIN 업데이트
 */
export async function updateUserPin(userId: string, newPin: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const { error } = await supabase
    .from('users')
    .update({ pin: newPin })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update PIN: ${error.message}`);
  }
}

// ============================================================
// Location Logs (위치 추적)
// ============================================================

export async function createLocationLog(log: any): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  try {
    const { error } = await supabase
      .from('location_logs')
      .insert({
        id: log.id,
        worker_id: log.workerId,
        equipment_id: log.equipmentId,
        latitude: log.latitude,
        longitude: log.longitude,
        accuracy: log.accuracy,
        logged_at: log.loggedAt || new Date(),
        created_at: new Date()
      });

    if (error) {
      console.error('[DB] createLocationLog error:', error);
      throw new Error(`위치 기록 실패: ${error.message}`);
    }
  } catch (error: any) {
    console.error('[DB] createLocationLog exception:', error);
    throw error;
  }
}

export async function getLatestLocationByWorker(workerId: string): Promise<any | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('location_logs')
    .select('*, workers(*), equipment(*)')
    .eq('worker_id', workerId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return undefined;
  return toCamelCase(data);
}

export async function getLatestLocationByEquipment(equipmentId: string): Promise<any | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('location_logs')
    .select('*, workers(*), equipment(*)')
    .eq('equipment_id', equipmentId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return undefined;
  return toCamelCase(data);
}

export async function getLocationHistory(workerId: string, startDate: Date, endDate: Date): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('location_logs')
    .select('*, workers(*), equipment(*)')
    .eq('worker_id', workerId)
    .gte('logged_at', startDate.toISOString())
    .lte('logged_at', endDate.toISOString())
    .order('logged_at', { ascending: true }); // 시간순 정렬 (오래된 것부터)

  if (error) {
    console.error('[DB] getLocationHistory error:', error);
    return [];
  }
  return toCamelCaseArray(data || []);
}

/**
 * 위치 이력 분석 (이동 거리, 체류 시간 등)
 */
export async function analyzeLocationHistory(
  workerId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalDistance: number; // 총 이동 거리 (미터)
  averageSpeed: number; // 평균 속도 (km/h)
  maxSpeed: number; // 최대 속도 (km/h)
  totalTime: number; // 총 시간 (초)
  stayPoints: Array<{
    lat: number;
    lng: number;
    startTime: Date;
    endTime: Date;
    duration: number; // 체류 시간 (초)
    location: string; // 위치 정보 (선택사항)
  }>;
  path: Array<{
    lat: number;
    lng: number;
    timestamp: Date;
    accuracy?: number;
  }>;
}> {
  const history = await getLocationHistory(workerId, startDate, endDate);
  
  if (history.length === 0) {
    return {
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      totalTime: 0,
      stayPoints: [],
      path: [],
    };
  }

  // 경로 데이터 생성
  const path = history.map((loc: any) => ({
    lat: parseFloat(loc.latitude),
    lng: parseFloat(loc.longitude),
    timestamp: new Date(loc.loggedAt),
    accuracy: loc.accuracy ? parseFloat(loc.accuracy) : undefined,
  }));

  // 총 이동 거리 계산
  let totalDistance = 0;
  const speeds: number[] = [];
  
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistance += distance;
    
    // 속도 계산 (m/s)
    const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000; // 초
    if (timeDiff > 0) {
      const speedMs = distance / timeDiff; // m/s
      const speedKmh = speedMs * 3.6; // km/h
      speeds.push(speedKmh);
    }
  }

  // 체류 지점 분석 (같은 위치에 일정 시간 이상 머문 곳)
  const stayPoints: Array<{
    lat: number;
    lng: number;
    startTime: Date;
    endTime: Date;
    duration: number;
    location: string;
  }> = [];
  
  const STAY_THRESHOLD = 50; // 50미터 이내면 같은 위치로 간주
  const MIN_STAY_DURATION = 5 * 60; // 최소 5분 이상 머물러야 체류 지점으로 인정
  
  let currentStayStart: { lat: number; lng: number; time: Date } | null = null;
  
  for (let i = 0; i < path.length; i++) {
    const point = path[i];
    
    if (!currentStayStart) {
      currentStayStart = { lat: point.lat, lng: point.lng, time: point.timestamp };
    } else {
      const distance = calculateDistance(
        currentStayStart.lat,
        currentStayStart.lng,
        point.lat,
        point.lng
      );
      
      if (distance > STAY_THRESHOLD) {
        // 체류 지점 종료
        const duration = (point.timestamp.getTime() - currentStayStart.time.getTime()) / 1000;
        if (duration >= MIN_STAY_DURATION) {
          stayPoints.push({
            lat: currentStayStart.lat,
            lng: currentStayStart.lng,
            startTime: currentStayStart.time,
            endTime: point.timestamp,
            duration: Math.round(duration),
            location: '', // 나중에 역지오코딩으로 추가 가능
          });
        }
        currentStayStart = { lat: point.lat, lng: point.lng, time: point.timestamp };
      }
    }
  }
  
  // 마지막 체류 지점 처리
  if (currentStayStart && path.length > 0) {
    const lastPoint = path[path.length - 1];
    const duration = (lastPoint.timestamp.getTime() - currentStayStart.time.getTime()) / 1000;
    if (duration >= MIN_STAY_DURATION) {
      stayPoints.push({
        lat: currentStayStart.lat,
        lng: currentStayStart.lng,
        startTime: currentStayStart.time,
        endTime: lastPoint.timestamp,
        duration: Math.round(duration),
        location: '',
      });
    }
  }

  // 총 시간 계산
  const totalTime = path.length > 1
    ? (path[path.length - 1].timestamp.getTime() - path[0].timestamp.getTime()) / 1000
    : 0;

  // 평균 속도 계산
  const averageSpeed = speeds.length > 0
    ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
    : 0;

  // 최대 속도 계산
  const maxSpeed = speeds.length > 0
    ? Math.max(...speeds)
    : 0;

  return {
    totalDistance: Math.round(totalDistance),
    averageSpeed: Math.round(averageSpeed * 10) / 10,
    maxSpeed: Math.round(maxSpeed * 10) / 10,
    totalTime: Math.round(totalTime),
    stayPoints,
    path,
  };
}

// ============================================================
// Emergency Alerts (긴급 상황)
// ============================================================

export async function createEmergencyAlert(alert: any): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const { error } = await supabase
    .from('emergency_alerts')
    .insert({
      id: alert.id,
      worker_id: alert.workerId,
      equipment_id: alert.equipmentId,
      alert_type: alert.alertType,
      latitude: alert.latitude,
      longitude: alert.longitude,
      description: alert.description,
      status: alert.status || 'active',
      created_at: new Date()
    });

  if (error) throw error;
}

export async function getEmergencyAlerts(status?: string): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('emergency_alerts')
    .select(`
      *,
      workers:worker_id (id, name, phone),
      equipment:equipment_id (id, reg_num)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) return [];
  return data || [];
}

export async function resolveEmergencyAlert(id: string, resolvedBy: string, resolutionNote?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const { error } = await supabase
    .from('emergency_alerts')
    .update({
      status: 'resolved',
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolution_note: resolutionNote,
    })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// 투입 관리 (Deployments)
// ============================================================

export async function createDeployment(data: InsertDeployment) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('deployments')
    .insert(toSnakeCase(data));

  if (error) throw error;
}

export async function getDeployments(filters?: {
  ownerId?: string;
  bpCompanyId?: string;
  epCompanyId?: string;
  workerId?: string;
  status?: string;
}): Promise<Deployment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('deployments')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.ownerId) query = query.eq('owner_id', filters.ownerId);
  if (filters?.bpCompanyId) query = query.eq('bp_company_id', filters.bpCompanyId);
  if (filters?.epCompanyId) query = query.eq('ep_company_id', filters.epCompanyId);
  if (filters?.workerId) query = query.eq('worker_id', filters.workerId);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;

  if (error) {
    console.error("[Database] Error getting deployments:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as Deployment[];
}

export async function getDeploymentById(id: string): Promise<Deployment | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("[Database] Error getting deployment:", error);
    return undefined;
  }

  return toCamelCase(data) as Deployment;
}

export async function getDeploymentByWorkerId(workerId: string): Promise<Deployment | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  console.log("[Database] getDeploymentByWorkerId called with workerId:", workerId);

  const { data, error } = await supabase
    .from('deployments')
    .select(`
      *,
      bp_company:companies!deployments_bp_company_id_fkey(id, name, company_type),
      ep_company:companies!deployments_ep_company_id_fkey(id, name, company_type)
    `)
    .eq('worker_id', workerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Database] Error getting deployment for worker:", workerId, error);
    return undefined;
  }

  if (!data) {
    console.log("[Database] No active deployment found for worker:", workerId);
    // 디버깅: 모든 deployment 확인
    const { data: allDeployments } = await supabase
      .from('deployments')
      .select('id, worker_id, status')
      .eq('worker_id', workerId);
    console.log("[Database] All deployments for this worker:", allDeployments);
    return undefined;
  }

  console.log("[Database] Found deployment:", data.id, "for worker:", workerId);
  return toCamelCase(data) as Deployment;
}

/**
 * User ID로 투입 목록 조회 (Worker 로그인용)
 * users.id -> workers.user_id -> deployments.worker_id
 */
export async function getDeploymentsByUserId(userId: string, filters?: {
  status?: string;
}): Promise<Deployment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // 1. user_id로 worker 레코드 찾기
  console.log('[getDeploymentsByUserId] 🔍 Searching worker for user_id:', userId);

  const { data: workerData, error: workerError } = await supabase
    .from('workers')
    .select('id, name, user_id')
    .eq('user_id', userId)
    .single();

  if (workerError || !workerData) {
    console.log("[getDeploymentsByUserId] ❌ No worker found for user_id:", userId);
    console.log("[getDeploymentsByUserId] Error:", workerError);

    // 전체 workers 확인 (디버깅용)
    const { data: allWorkers } = await supabase
      .from('workers')
      .select('id, name, user_id')
      .limit(10);
    console.log("[getDeploymentsByUserId] 📋 Sample workers (first 10):", allWorkers);

    return [];
  }

  console.log('[getDeploymentsByUserId] ✅ Found worker:', workerData);

  // 2. worker_id로 deployments 조회 (join 포함)
  let query = supabase
    .from('deployments')
    .select(`
      *,
      equipment:equipment!deployments_equipment_id_fkey(
        id,
        reg_num,
        specification,
        equip_type:equip_types!equipment_equip_type_id_fkey(id, name, description)
      ),
      worker:workers!deployments_worker_id_fkey(id, name, license_num),
      bp_company:companies!deployments_bp_company_id_fkey(id, name, company_type),
      ep_company:companies!deployments_ep_company_id_fkey(id, name, company_type)
    `)
    .eq('worker_id', workerData.id)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Database] Error getting deployments by user:", error);
    return [];
  }

  return toCamelCaseArray(data || []) as Deployment[];
}

export async function updateDeployment(id: string, data: Partial<InsertDeployment>) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('deployments')
    .update({
      ...toSnakeCase(data),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function extendDeployment(
  deploymentId: string,
  newEndDate: Date,
  reason: string,
  extendedBy: string
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const deployment = await getDeploymentById(deploymentId);
  if (!deployment) throw new Error("Deployment not found");

  await updateDeployment(deploymentId, {
    plannedEndDate: newEndDate,
    status: 'extended',
  });

  const { error } = await supabase
    .from('deployment_extensions')
    .insert({
      id: nanoid(),
      deployment_id: deploymentId,
      old_end_date: deployment.plannedEndDate,
      new_end_date: newEndDate,
      extension_reason: reason,
      extended_by: extendedBy,
    });

  if (error) throw error;
}

export async function changeDeploymentWorker(
  deploymentId: string,
  newWorkerId: string,
  reason: string,
  changedBy: string
) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const deployment = await getDeploymentById(deploymentId);
  if (!deployment) throw new Error("Deployment not found");

  await updateDeployment(deploymentId, {
    workerId: newWorkerId,
  });

  const { error } = await supabase
    .from('deployment_worker_changes')
    .insert({
      id: nanoid(),
      deployment_id: deploymentId,
      old_worker_id: deployment.workerId,
      new_worker_id: newWorkerId,
      change_reason: reason,
      changed_by: changedBy,
    });

  if (error) throw error;
}

export async function completeDeployment(deploymentId: string, actualEndDate?: Date) {
  await updateDeployment(deploymentId, {
    status: 'completed',
    actualEndDate: actualEndDate || new Date(),
  });
}

// ============================================================
// 운전자 점검표 시스템 (Driver Inspection System)
// ============================================================

/**
 * 운전자 점검표 템플릿 생성
 */
export async function createDriverInspectionTemplate(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_templates')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검표 템플릿 목록 조회
 */
export async function getDriverInspectionTemplates(filters?: {
  equipTypeId?: string;
  isActive?: boolean;
}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('driver_inspection_templates').select('*');

  if (filters?.equipTypeId) {
    query = query.eq('equip_type_id', filters.equipTypeId);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('[Database] Error getting driver inspection templates:', error);
    return [];
  }

  return toCamelCaseArray(data || []);
}

/**
 * 운전자 점검표 템플릿 상세 조회 (항목 포함)
 */
export async function getDriverInspectionTemplateById(templateId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // 템플릿 조회
  const { data: template, error: templateError } = await supabase
    .from('driver_inspection_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    console.error('[Database] Error getting driver inspection template:', templateError);
    return null;
  }

  // 템플릿 항목 조회
  const { data: items, error: itemsError } = await supabase
    .from('driver_inspection_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order', { ascending: true });

  if (itemsError) {
    console.error('[Database] Error getting driver inspection template items:', itemsError);
  }

  return {
    ...toCamelCase(template),
    items: toCamelCaseArray(items || []),
  };
}

/**
 * 운전자 점검표 템플릿 수정
 */
export async function updateDriverInspectionTemplate(templateId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_templates')
    .update({
      ...toSnakeCase(data),
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검표 템플릿 삭제 (비활성화)
 */
export async function deleteDriverInspectionTemplate(templateId: string) {
  return await updateDriverInspectionTemplate(templateId, { isActive: false });
}

/**
 * 운전자 점검표 템플릿 항목 생성
 */
export async function createDriverInspectionTemplateItem(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_template_items')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검표 템플릿 항목 수정
 */
export async function updateDriverInspectionTemplateItem(itemId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_template_items')
    .update(toSnakeCase(data))
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검표 템플릿 항목 삭제
 */
export async function deleteDriverInspectionTemplateItem(itemId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('driver_inspection_template_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
  return { success: true };
}

/**
 * 운전자 점검 기록 생성
 */
export async function createDriverInspectionRecord(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_records')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검 기록 항목 생성
 */
export async function createDriverInspectionRecordItem(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_record_items')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검 기록 목록 조회 (장비별)
 */
export async function getDriverInspectionRecordsByEquipment(equipmentId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('driver_inspection_records')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('inspection_date', { ascending: false });

  if (error) {
    console.error('[Database] Error getting driver inspection records:', error);
    return [];
  }

  return toCamelCaseArray(data || []);
}

/**
 * 운전자 점검 기록 상세 조회 (항목 포함)
 */
export async function getDriverInspectionRecordById(recordId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // 기록 조회
  const { data: record, error: recordError } = await supabase
    .from('driver_inspection_records')
    .select('*')
    .eq('id', recordId)
    .single();

  if (recordError || !record) {
    console.error('[Database] Error getting driver inspection record:', recordError);
    return null;
  }

  // 항목별 결과 조회
  const { data: items, error: itemsError } = await supabase
    .from('driver_inspection_record_items')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });

  if (itemsError) {
    console.error('[Database] Error getting driver inspection record items:', itemsError);
  }

  return {
    ...toCamelCase(record),
    items: toCamelCaseArray(items || []),
  };
}

/**
 * 운전자 점검 기록 수정
 */
export async function updateDriverInspectionRecord(recordId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('driver_inspection_records')
    .update({
      ...toSnakeCase(data),
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 운전자 점검 기록 삭제
 */
export async function deleteDriverInspectionRecord(recordId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  // 관련 항목들도 함께 삭제 (CASCADE)
  const { error } = await supabase
    .from('driver_inspection_records')
    .delete()
    .eq('id', recordId);

  if (error) throw error;
  return { success: true };
}

// ============================================================
// 안전점검 시스템 (Safety Inspection System)
// ============================================================

/**
 * 안전점검 템플릿 생성
 */
export async function createSafetyInspectionTemplate(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspection_templates')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 안전점검 템플릿 목록 조회
 */
export async function getSafetyInspectionTemplates(filters?: {
  equipTypeId?: string;
  inspectorType?: string;
  isActive?: boolean;
}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('safety_inspection_templates').select('*');

  if (filters?.equipTypeId) {
    query = query.eq('equip_type_id', filters.equipTypeId);
  }
  if (filters?.inspectorType) {
    query = query.eq('inspector_type', filters.inspectorType);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error('[Database] Error getting safety inspection templates:', error);
    return [];
  }

  return toCamelCaseArray(data || []);
}

/**
 * 안전점검 템플릿 상세 조회 (체크 항목 포함)
 */
export async function getSafetyInspectionTemplateById(templateId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: template, error: templateError } = await supabase
    .from('safety_inspection_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !template) return null;

  const { data: items, error: itemsError } = await supabase
    .from('safety_inspection_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order', { ascending: true });

  if (itemsError) {
    console.error('[Database] Error getting template items:', itemsError);
  }

  return {
    ...toCamelCase(template),
    items: toCamelCaseArray(items || []),
  };
}

/**
 * 안전점검 템플릿 수정
 */
export async function updateSafetyInspectionTemplate(templateId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspection_templates')
    .update(toSnakeCase({ ...data, updatedAt: new Date() }))
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 장비에 적용 가능한 템플릿 찾기
 * 우선순위: 1. 장비 타입 전용 템플릿, 2. 범용 템플릿
 */
export async function getApplicableTemplatesForEquipment(
  equipmentId: string,
  inspectorType: 'inspector' | 'driver' = 'inspector'
) {
  const supabase = getSupabase();
  if (!supabase) return [];

  // 장비 정보 조회
  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select('equip_type_id')
    .eq('id', equipmentId)
    .single();

  if (equipError || !equipment) {
    console.error('[Database] Error getting equipment:', equipError);
    return [];
  }

  const equipTypeId = equipment.equip_type_id;

  // 적용 가능한 템플릿 조회
  // 1. 해당 장비 타입 전용 템플릿
  // 2. 범용 템플릿 (equip_type_id = null)
  const { data: templates, error } = await supabase
    .from('safety_inspection_templates')
    .select('*')
    .eq('inspector_type', inspectorType)
    .eq('is_active', true)
    .or(`equip_type_id.eq.${equipTypeId},equip_type_id.is.null`)
    .order('equip_type_id', { ascending: false }); // 전용 템플릿 우선

  if (error) {
    console.error('[Database] Error getting applicable templates:', error);
    return [];
  }

  // 장비 타입 정보 별도로 조회 (필요한 경우)
  if (templates && templates.length > 0) {
    const templateIds = templates.map((t: any) => t.id);
    const equipTypeIds = templates.map((t: any) => t.equip_type_id).filter((id: any) => id);

    if (equipTypeIds.length > 0) {
      const { data: equipTypes } = await supabase
        .from('equip_types')
        .select('*')
        .in('id', equipTypeIds);

      // 템플릿에 장비 타입 정보 매핑
      const equipTypeMap = new Map(equipTypes?.map((et: any) => [et.id, et]) || []);
      templates.forEach((template: any) => {
        if (template.equip_type_id) {
          template.equip_type = equipTypeMap.get(template.equip_type_id);
        }
      });
    }
  }

  return toCamelCaseArray(templates || []);
}

/**
 * 안전점검 템플릿 삭제 (비활성화)
 */
export async function deleteSafetyInspectionTemplate(templateId: string) {
  return updateSafetyInspectionTemplate(templateId, { isActive: false });
}

/**
 * 안전점검 템플릿 항목 생성
 */
export async function createSafetyInspectionTemplateItem(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspection_template_items')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 안전점검 템플릿 항목 수정
 */
export async function updateSafetyInspectionTemplateItem(itemId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspection_template_items')
    .update(toSnakeCase(data))
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 안전점검 템플릿 항목 삭제
 */
export async function deleteSafetyInspectionTemplateItem(itemId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { error } = await supabase
    .from('safety_inspection_template_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * 안전점검 기록 생성
 */
export async function createSafetyInspection(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspections')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 안전점검 기록 목록 조회
 */
export async function getSafetyInspections(filters?: {
  equipmentId?: string;
  inspectorId?: string;
  inspectorType?: string;
  status?: string;
  checkFrequency?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('safety_inspections')
    .select('*')
    .order('inspection_date', { ascending: false });

  if (filters?.equipmentId) {
    query = query.eq('equipment_id', filters.equipmentId);
  }
  if (filters?.inspectorId) {
    query = query.eq('inspector_id', filters.inspectorId);
  }
  if (filters?.inspectorType) {
    query = query.eq('inspector_type', filters.inspectorType);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.checkFrequency) {
    query = query.eq('check_frequency', filters.checkFrequency);
  }
  if (filters?.startDate) {
    query = query.gte('inspection_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('inspection_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Database] Error getting safety inspections:', error);
    return [];
  }

  return toCamelCaseArray(data || []);
}

/**
 * 안전점검 기록 상세 조회 (결과 포함)
 */
export async function getSafetyInspectionById(inspectionId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: inspection, error: inspectionError } = await supabase
    .from('safety_inspections')
    .select('*')
    .eq('id', inspectionId)
    .single();

  if (inspectionError || !inspection) return null;

  const { data: results, error: resultsError } = await supabase
    .from('safety_inspection_results')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: true });

  if (resultsError) {
    console.error('[Database] Error getting inspection results:', resultsError);
  }

  return {
    ...toCamelCase(inspection),
    results: toCamelCaseArray(results || []),
  };
}

/**
 * 안전점검 기록 수정
 */
export async function updateSafetyInspection(inspectionId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspections')
    .update(toSnakeCase({ ...data, updatedAt: new Date() }))
    .eq('id', inspectionId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 안전점검 제출 (전자서명 포함)
 */
export async function submitSafetyInspection(
  inspectionId: string,
  signatureData: string,
  inspectorName: string
) {
  return updateSafetyInspection(inspectionId, {
    status: 'submitted',
    inspectorSignature: signatureData,
    inspectorName,
    signedAt: new Date(),
    submittedAt: new Date(),
  });
}

/**
 * 안전점검 항목 결과 생성
 */
export async function createSafetyInspectionResult(data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspection_results')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * 안전점검 항목 결과 수정
 */
export async function updateSafetyInspectionResult(resultId: string, data: any) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not available");

  const { data: result, error } = await supabase
    .from('safety_inspection_results')
    .update(toSnakeCase(data))
    .eq('id', resultId)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(result);
}

/**
 * EP의 안전점검 확인
 */
export async function reviewSafetyInspection(
  inspectionId: string,
  reviewedBy: string,
  comments?: string
) {
  return updateSafetyInspection(inspectionId, {
    status: 'reviewed',
    reviewedBy,
    reviewedAt: new Date(),
    reviewComments: comments,
  });
}

/**
 * 차량번호로 장비 검색 (뒷번호 부분 매칭)
 */
export async function searchEquipmentByVehicleNumber(partialNumber: string) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('equipment')
    .select('*, equip_type:equip_types(*)')
    .ilike('reg_num', `%${partialNumber}%`)
    .limit(10);

  if (error) {
    console.error('[Database] Error searching equipment:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const equipments = toCamelCaseArray(data);
  const equipmentIds = equipments.map((item: any) => item.id).filter(Boolean);
  const ownerIds = equipments.map((item: any) => item.ownerId).filter((id: string | undefined) => !!id);

  let deploymentMap = new Map<string, any>();
  if (equipmentIds.length > 0) {
    const { data: deployments, error: deploymentError } = await supabase
      .from('deployments')
      .select(`
        *,
        worker:workers!deployments_worker_id_fkey(
          id,
          name,
          license_num,
          owner_id,
          phone
        ),
        bp_company:companies!deployments_bp_company_id_fkey(id, name, company_type),
        ep_company:companies!deployments_ep_company_id_fkey(id, name, company_type)
      `)
      .in('equipment_id', equipmentIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (deploymentError) {
      console.error('[Database] Error fetching deployments for equipment search:', deploymentError);
    } else if (deployments) {
      deployments.forEach((deployment: any) => {
        const equipmentId = deployment.equipment_id;
        if (!equipmentId || deploymentMap.has(equipmentId)) return;
        deploymentMap.set(equipmentId, toCamelCase(deployment));
      });
    }
  }

  let ownerMap = new Map<string, any>();
  if (ownerIds.length > 0) {
    const { data: owners, error: ownerError } = await supabase
      .from('companies')
      .select('id, name, company_type')
      .in('id', ownerIds);
    if (ownerError) {
      console.error('[Database] Error fetching owner companies for equipment search:', ownerError);
    } else if (owners) {
      owners.forEach((owner) => {
        ownerMap.set(owner.id, toCamelCase(owner));
      });
    }
  }

  return equipments.map((equipment: any) => {
    const deployment = deploymentMap.get(equipment.id) || null;
    const ownerCompany = equipment.ownerId ? ownerMap.get(equipment.ownerId) || null : null;
    return {
      ...equipment,
      ownerCompany,
      activeDeployment: deployment,
    };
  });
}

export async function getActiveDeploymentByEquipmentId(equipmentId: string): Promise<Deployment | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from('deployments')
    .select(`
      *,
      worker:workers!deployments_worker_id_fkey(
        id,
        name,
        license_num,
        owner_id,
        phone
      ),
      bp_company:companies!deployments_bp_company_id_fkey(id, name, company_type),
      ep_company:companies!deployments_ep_company_id_fkey(id, name, company_type)
    `)
    .eq('equipment_id', equipmentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Database] Error getting active deployment by equipment:", equipmentId, error);
    return undefined;
  }

  return data ? (toCamelCase(data) as Deployment) : undefined;
}

export async function getEquipmentInspectionContext(equipmentId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('equipment')
    .select(`
      *,
      equip_type:equip_types(*)
    `)
    .eq('id', equipmentId)
    .maybeSingle();

  if (error || !data) {
    console.error("[Database] Error getting equipment inspection context:", equipmentId, error);
    return null;
  }

  const equipment = toCamelCase(data) as any;
  if (equipment.ownerId) {
    const ownerData = await getCompanyById(equipment.ownerId);
    equipment.ownerCompany = ownerData ? toCamelCase(ownerData) : null;
  } else {
    equipment.ownerCompany = null;
  }

  const activeDeployment = await getActiveDeploymentByEquipmentId(equipmentId);

  const equipmentDocs = await getDocsComplianceByTarget("equipment", equipmentId);
  const workerDocs =
    activeDeployment?.workerId ? await getDocsComplianceByTarget("worker", activeDeployment.workerId) : [];

  return {
    equipment,
    activeDeployment: activeDeployment || null,
    docs: {
      equipment: equipmentDocs,
      worker: workerDocs,
    },
  };
}

export async function getEquipmentInspectionContextByNfcTag(nfcTagId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('equipment')
    .select('id')
    .eq('nfc_tag_id', nfcTagId)
    .maybeSingle();

  if (error) {
    console.error("[Database] Error finding equipment by NFC tag:", nfcTagId, error);
    return null;
  }

  if (!data?.id) {
    return null;
  }

  return await getEquipmentInspectionContext(data.id);
}

/**
 * 모든 활성 위치 조회 (최근 10분 이내, 권한별 필터링 포함)
 */
export async function getAllActiveLocations(filters?: {
  ownerCompanyId?: string;
  bpCompanyId?: string;
  epCompanyId?: string;
  equipmentId?: string;
  vehicleNumber?: string;
  userRole?: string;
  userCompanyId?: string;
}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  // 최근 10분 이내의 위치만 조회
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  console.log('[getAllActiveLocations] ===== 시작 =====');
  console.log('[getAllActiveLocations] 조회 시간 범위:', {
    now: new Date().toISOString(),
    tenMinutesAgo: tenMinutesAgo.toISOString(),
  });
  console.log('[getAllActiveLocations] 필터:', JSON.stringify(filters, null, 2));

  // 각 worker별 최신 위치만 가져오기 위해 서브쿼리 사용
  // Supabase 관계 에러 방지를 위해 join 없이 단순 조회
  let query = supabase
    .from('location_logs')
    .select('*')
    .gte('logged_at', tenMinutesAgo.toISOString())
    .order('logged_at', { ascending: false });

  // 권한별 기본 필터링
  if (filters?.userRole) {
    const role = filters.userRole.toLowerCase();
    
    if (role === 'owner') {
      // Owner: 자신의 회사 장비/인력만
      // Owner의 경우 userCompanyId는 company ID입니다 (check-in-router.ts 참고)
      // equipment의 owner_company_id로 필터링해야 하므로, 
      // 먼저 모든 location_logs를 가져온 후 equipment 정보로 필터링합니다
      console.log('[getAllActiveLocations] Owner 필터링 시작 - userCompanyId:', filters.userCompanyId);
      // 필터링은 equipment 정보 조회 후 클라이언트 사이드에서 처리
    } else if (role === 'ep') {
      // EP: 본인 회사에 투입된 장비만 (deployment에서 확인)
      if (filters.userCompanyId) {
        console.log('[getAllActiveLocations] EP 필터링 시작 - userCompanyId:', filters.userCompanyId);
        
        // 먼저 활성 deployment 조회
        const { data: deployments, error: deploymentError } = await supabase
          .from('deployments')
          .select('equipment_id, worker_id')
          .eq('ep_company_id', filters.userCompanyId)
          .eq('status', 'active');
        
        console.log('[getAllActiveLocations] EP deployment 조회 결과:', {
          count: deployments?.length || 0,
          error: deploymentError,
          deployments: deployments?.slice(0, 5), // 처음 5개만 로그
        });
        
        if (deploymentError) {
          console.error('[getAllActiveLocations] EP deployment 조회 에러:', deploymentError);
        }
        
        if (deployments && deployments.length > 0) {
          const equipmentIds = deployments.map((d: any) => d.equipment_id).filter(Boolean);
          const workerIds = deployments.map((d: any) => d.worker_id).filter(Boolean);
          
          console.log('[getAllActiveLocations] EP 필터링 - equipmentIds:', equipmentIds.length, 'workerIds:', workerIds.length);
          
          if (equipmentIds.length > 0 || workerIds.length > 0) {
            // Supabase PostgREST의 .or() 구문 사용
            // 형식: "column1.in.(value1,value2),column2.in.(value3,value4)"
            const conditions: string[] = [];
            if (equipmentIds.length > 0) {
              conditions.push(`equipment_id.in.(${equipmentIds.join(',')})`);
            }
            if (workerIds.length > 0) {
              conditions.push(`worker_id.in.(${workerIds.join(',')})`);
            }
            
            // .or() 사용 (PostgREST 구문: 조건을 쉼표로 구분)
            if (conditions.length > 0) {
              query = query.or(conditions.join(','));
            }
            
            console.log('[getAllActiveLocations] EP 필터링 조건 적용:', conditions);
          } else {
            // 투입된 장비가 없으면 빈 결과 반환
            console.log('[getAllActiveLocations] EP - 투입된 장비/인력이 없음');
            return [];
          }
        } else {
          // 활성 deployment가 없으면 빈 결과 반환
          console.log('[getAllActiveLocations] EP - 활성 deployment가 없음');
          return [];
        }
      } else {
        console.log('[getAllActiveLocations] EP - userCompanyId가 없음');
      }
    }
    // BP와 Admin은 추가 필터 파라미터로 제어
  }

  // 추가 필터 적용
  if (filters?.ownerCompanyId) {
    query = query.or(`workers.owner_company_id.eq.${filters.ownerCompanyId},equipment.owner_company_id.eq.${filters.ownerCompanyId}`);
  }

  if (filters?.bpCompanyId) {
    // BP 회사에 투입된 장비만 조회 (deployment에서 확인)
    const { data: deployments } = await supabase
      .from('deployments')
      .select('equipment_id, worker_id')
      .eq('bp_company_id', filters.bpCompanyId)
      .eq('status', 'active');
    
    if (deployments && deployments.length > 0) {
      const equipmentIds = deployments.map(d => d.equipment_id).filter(Boolean);
      const workerIds = deployments.map(d => d.worker_id).filter(Boolean);
      
      if (equipmentIds.length > 0 || workerIds.length > 0) {
        const conditions: string[] = [];
        if (equipmentIds.length > 0) {
          conditions.push(`equipment_id.in.(${equipmentIds.join(',')})`);
        }
        if (workerIds.length > 0) {
          conditions.push(`worker_id.in.(${workerIds.join(',')})`);
        }
        query = query.or(conditions.join(','));
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  if (filters?.epCompanyId) {
    const { data: deployments } = await supabase
      .from('deployments')
      .select('equipment_id, worker_id')
      .eq('ep_company_id', filters.epCompanyId)
      .eq('status', 'active');
    
    if (deployments && deployments.length > 0) {
      const equipmentIds = deployments.map(d => d.equipment_id).filter(Boolean);
      const workerIds = deployments.map(d => d.worker_id).filter(Boolean);
      
      if (equipmentIds.length > 0 || workerIds.length > 0) {
        const conditions: string[] = [];
        if (equipmentIds.length > 0) {
          conditions.push(`equipment_id.in.(${equipmentIds.join(',')})`);
        }
        if (workerIds.length > 0) {
          conditions.push(`worker_id.in.(${workerIds.join(',')})`);
        }
        query = query.or(conditions.join(','));
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  if (filters?.equipmentId) {
    query = query.eq('equipment_id', filters.equipmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Database] Error getting all active locations:', error);
    return [];
  }

  console.log('[getAllActiveLocations] ===== 위치 로그 조회 결과 =====');
  console.log('[getAllActiveLocations] 총 개수:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('[getAllActiveLocations] 샘플 데이터 (처음 3개):', data.slice(0, 3).map((loc: any) => ({
      workerId: loc.worker_id,
      equipmentId: loc.equipment_id,
      loggedAt: loc.logged_at,
      latitude: loc.latitude,
      longitude: loc.longitude,
    })));
  } else {
    console.log('[getAllActiveLocations] ⚠️ 위치 로그가 없습니다.');
  }

  if (!data || data.length === 0) {
    console.log('[getAllActiveLocations] 위치 로그가 없어 빈 배열 반환');
    return [];
  }

  // worker 정보 별도 조회 (Supabase 관계 에러 방지)
  const workerIds = [...new Set(data.map((loc: any) => loc.worker_id).filter(Boolean))];
  const workerMap = new Map();
  
  if (workerIds.length > 0) {
    const { data: workers } = await supabase
      .from('workers')
      .select('id, name, phone, owner_company_id')
      .in('id', workerIds);
    
    if (workers) {
      workers.forEach((w: any) => {
        workerMap.set(w.id, toCamelCase(w));
      });
    }
  }

  // equipment 정보 별도 조회
  const equipmentIds = [...new Set(data.map((loc: any) => loc.equipment_id).filter(Boolean))];
  const equipmentMap = new Map();
  
  if (equipmentIds.length > 0) {
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, reg_num, equip_type_id, owner_company_id')
      .in('id', equipmentIds);
    
    if (equipment) {
      // equip_types 정보 별도 조회
      const equipTypeIds = [...new Set(equipment.map((e: any) => e.equip_type_id).filter(Boolean))];
      const equipTypeMap = new Map();
      
      if (equipTypeIds.length > 0) {
        const { data: equipTypes } = await supabase
          .from('equip_types')
          .select('id, name')
          .in('id', equipTypeIds);
        
        if (equipTypes) {
          equipTypes.forEach((et: any) => {
            equipTypeMap.set(et.id, toCamelCase(et));
          });
        }
      }
      
      equipment.forEach((e: any) => {
        const equipData = toCamelCase(e);
        if (e.equip_type_id && equipTypeMap.has(e.equip_type_id)) {
          equipData.equipTypes = equipTypeMap.get(e.equip_type_id);
        }
        equipmentMap.set(e.id, equipData);
      });
    }
  }

  // 클라이언트 사이드 필터링 (차량번호, 차종, 운전자)
  let filteredData = data || [];
  
  if (filters?.vehicleNumber) {
    filteredData = filteredData.filter((loc: any) => {
      const regNum = loc.equipment?.reg_num || '';
      return regNum.toLowerCase().includes(filters.vehicleNumber!.toLowerCase());
    });
  }

  if (filters?.equipmentTypeId) {
    filteredData = filteredData.filter((loc: any) => {
      return loc.equipment?.equip_type_id === filters.equipmentTypeId;
    });
  }

  if (filters?.workerId) {
    filteredData = filteredData.filter((loc: any) => {
      return loc.worker_id === filters.workerId;
    });
  }

  // 각 worker별 최신 위치만 반환 (중복 제거)
  const latestByWorker = new Map<string, any>();
  filteredData.forEach((loc: any) => {
    if (loc.worker_id) {
      const existing = latestByWorker.get(loc.worker_id);
      if (!existing || new Date(loc.logged_at) > new Date(existing.logged_at)) {
        latestByWorker.set(loc.worker_id, loc);
      }
    }
  });

  // worker와 equipment 정보를 location 객체에 매핑
  let result = Array.from(latestByWorker.values()).map((loc: any) => {
    const mappedLoc = { ...loc };
    
    // worker 정보 매핑
    if (loc.worker_id && workerMap.has(loc.worker_id)) {
      mappedLoc.workers = workerMap.get(loc.worker_id);
    }
    
    // equipment 정보 매핑
    if (loc.equipment_id && equipmentMap.has(loc.equipment_id)) {
      mappedLoc.equipment = equipmentMap.get(loc.equipment_id);
    }
    
    return mappedLoc;
  });
  
  // Owner 권한 필터링은 deployment 정보가 매핑된 후에 수행 (출근 현황과 동일한 로직)
  // 여기서는 일단 deployment 정보를 가져온 후 필터링하도록 주석 처리
  // 실제 필터링은 deployment 매핑 후에 수행
  
  const resultEquipmentIds = result.map((loc: any) => loc.equipment_id).filter(Boolean);
  const resultWorkerIds = result.map((loc: any) => loc.worker_id).filter(Boolean);
  
  // 각 worker의 현재 작업 세션 상태 조회
  const workSessionMap = new Map<string, any>();
  if (resultWorkerIds.length > 0) {
    const { data: workSessions } = await supabase
      .from('work_sessions')
      .select('worker_id, status')
      .in('worker_id', resultWorkerIds)
      .is('end_time', null) // 진행 중인 세션만
      .order('start_time', { ascending: false });
    
    if (workSessions) {
      // 각 worker별 최신 세션만 저장
      workSessions.forEach((ws: any) => {
        if (!workSessionMap.has(ws.worker_id)) {
          workSessionMap.set(ws.worker_id, toCamelCase(ws));
        }
      });
    }
  }
  
  // 각 location에 작업 세션 상태 추가
  result.forEach((loc: any) => {
    if (loc.worker_id && workSessionMap.has(loc.worker_id)) {
      loc.workSession = workSessionMap.get(loc.worker_id);
    }
  });
  
  if (resultEquipmentIds.length > 0) {
    // 모든 활성 deployment 조회 (worker_id, owner_id도 함께 조회)
    const { data: deployments } = await supabase
      .from('deployments')
      .select('id, equipment_id, worker_id, bp_company_id, ep_company_id, owner_id')
      .in('equipment_id', resultEquipmentIds)
      .eq('status', 'active');

    if (deployments && deployments.length > 0) {
      // BP, EP 회사 ID 수집
      const bpCompanyIds = new Set<string>();
      const epCompanyIds = new Set<string>();
      deployments.forEach((dep: any) => {
        if (dep.bp_company_id) bpCompanyIds.add(dep.bp_company_id);
        if (dep.ep_company_id) epCompanyIds.add(dep.ep_company_id);
      });

      // BP, EP 회사 정보 일괄 조회
      const bpCompaniesMap = new Map<string, any>();
      const epCompaniesMap = new Map<string, any>();

      if (bpCompanyIds.size > 0) {
        const { data: bpCompanies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', Array.from(bpCompanyIds));
        if (bpCompanies) {
          bpCompanies.forEach((company: any) => {
            bpCompaniesMap.set(company.id, company);
          });
        }
      }

      if (epCompanyIds.size > 0) {
        const { data: epCompanies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', Array.from(epCompanyIds));
        if (epCompanies) {
          epCompanies.forEach((company: any) => {
            epCompaniesMap.set(company.id, company);
          });
        }
      }

      // 장비별 deployment 매핑
      const deploymentMap = new Map<string, any>();
      deployments.forEach((dep: any) => {
        if (dep.equipment_id && !deploymentMap.has(dep.equipment_id)) {
          deploymentMap.set(dep.equipment_id, {
            ...dep,
            bpCompanies: dep.bp_company_id ? bpCompaniesMap.get(dep.bp_company_id) : null,
            epCompanies: dep.ep_company_id ? epCompaniesMap.get(dep.ep_company_id) : null,
          });
        }
      });

      // 오너사 정보 일괄 조회
      const ownerCompanyIds = new Set<string>();
      result.forEach((loc: any) => {
        if (loc.equipment?.owner_company_id) {
          ownerCompanyIds.add(loc.equipment.owner_company_id);
        }
      });

      const ownerCompaniesMap = new Map<string, any>();
      if (ownerCompanyIds.size > 0) {
        const { data: ownerCompanies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', Array.from(ownerCompanyIds));
        
        if (ownerCompanies) {
          ownerCompanies.forEach((company: any) => {
            ownerCompaniesMap.set(company.id, company);
          });
        }
      }

      // 각 location에 deployment 정보 추가
      result.forEach((loc: any) => {
        if (loc.equipment_id && deploymentMap.has(loc.equipment_id)) {
          const dep = deploymentMap.get(loc.equipment_id);
          
          // deployment의 worker_id로 worker 정보 확인 및 매핑
          if (dep.worker_id && workerMap.has(dep.worker_id)) {
            dep.worker = workerMap.get(dep.worker_id);
          }
          
          // equipment 정보가 있으면 deployment에 포함
          if (loc.equipment) {
            dep.equipment = {
              ...loc.equipment,
            };
            
            // 오너사 정보 추가
            if (loc.equipment.owner_company_id && ownerCompaniesMap.has(loc.equipment.owner_company_id)) {
              dep.equipment.ownerCompanies = ownerCompaniesMap.get(loc.equipment.owner_company_id);
            }
          }
          
          loc.deployment = toCamelCase(dep);
        }
      });
      
      // Owner 권한 필터링 (deployment 정보가 매핑된 후, 출근 현황과 동일한 로직)
      if (filters?.userRole?.toLowerCase() === 'owner' && filters.userCompanyId) {
        // 모든 deployment의 owner_id 수집
        const ownerIds = [...new Set(result.map((loc: any) => loc.deployment?.ownerId || loc.deployment?.owner_id).filter(Boolean))];
        
        if (ownerIds.length > 0) {
          // 한 번에 owner 정보 조회
          const { data: owners } = await supabase
            .from('users')
            .select('id, company_id')
            .in('id', ownerIds);
          
          // owner의 company_id가 필터와 일치하는 owner_id만 수집
          const validOwnerIds = new Set(
            owners?.filter((o: any) => o.company_id === filters.userCompanyId).map((o: any) => o.id) || []
          );
          
          // 해당 owner_id를 가진 deployment의 location만 필터링
          result = result.filter((loc: any) => {
            const ownerId = loc.deployment?.ownerId || loc.deployment?.owner_id;
            const matches = ownerId && validOwnerIds.has(ownerId);
            if (!matches && ownerId) {
              console.log('[getAllActiveLocations] Owner 필터링 - 불일치:', {
                locationId: loc.id,
                deploymentOwnerId: ownerId,
                userCompanyId: filters.userCompanyId,
              });
            }
            return matches;
          });
          
          console.log('[getAllActiveLocations] Owner 필터링 후 개수:', result.length);
        } else {
          // owner_id가 없으면 빈 결과
          console.log('[getAllActiveLocations] Owner 필터링 - owner_id 없음');
          result = [];
        }
      }
    }
  }

  console.log('[getAllActiveLocations] ===== 최종 결과 =====');
  console.log('[getAllActiveLocations] 최종 개수:', result.length);
  if (result.length > 0) {
    console.log('[getAllActiveLocations] 최종 샘플 (처음 3개):', result.slice(0, 3).map((loc: any) => ({
      workerId: loc.worker_id || loc.workerId,
      workerName: loc.workers?.name || loc.worker?.name || 'N/A',
      equipmentId: loc.equipment_id || loc.equipmentId,
      equipmentRegNum: loc.equipment?.reg_num || loc.equipment?.regNum || 'N/A',
      equipmentTypeName: loc.equipment?.equip_types?.name || loc.equipment?.equipTypes?.name || 'N/A',
      workStatus: loc.workSession?.status || 'N/A',
      loggedAt: loc.logged_at || loc.loggedAt,
      hasDeployment: !!loc.deployment,
      deploymentWorkerName: loc.deployment?.worker?.name || 'N/A',
      deploymentEquipmentRegNum: loc.deployment?.equipment?.reg_num || loc.deployment?.equipment?.regNum || 'N/A',
      deploymentEpCompanyId: loc.deployment?.ep_company_id || loc.deployment?.epCompanyId,
    })));
  }
  
  return toCamelCaseArray(result);
}

/**
 * 위치 추적용 출근 대상 수 계산 (출근 현황과 동일한 로직)
 */
export async function getExpectedWorkersForLocationTracking(filters?: {
  userRole?: string;
  userCompanyId?: string;
  userId?: string;
}): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const userRole = filters?.userRole?.toLowerCase();
  
  // 권한별 필터링
  let deploymentQuery = supabase
    .from("deployments")
    .select("worker_id, ep_company_id, bp_company_id, owner_id")
    .eq("status", "active");

  // EP인 경우 자신의 회사 deployment만
  if (userRole === "ep" && filters?.userCompanyId) {
    deploymentQuery = deploymentQuery.eq("ep_company_id", filters.userCompanyId);
  }
  // BP인 경우 자신의 회사 deployment만
  else if (userRole === "bp" && filters?.userCompanyId) {
    deploymentQuery = deploymentQuery.eq("bp_company_id", filters.userCompanyId);
  }
  // Owner인 경우 자신의 회사 deployment만 (deployment의 owner_id로 필터링)
  else if (userRole === "owner" && filters?.userId) {
    deploymentQuery = deploymentQuery.eq("owner_id", filters.userId);
  }
  // Admin은 전체 조회

  const { data: activeDeploymentsRaw, error: deploymentsError } = await deploymentQuery;

  console.log('[getExpectedWorkersForLocationTracking] ===== Deployment 조회 =====');
  console.log('[getExpectedWorkersForLocationTracking] User role:', userRole);
  console.log('[getExpectedWorkersForLocationTracking] User company ID:', filters?.userCompanyId);
  console.log('[getExpectedWorkersForLocationTracking] User ID:', filters?.userId);
  console.log('[getExpectedWorkersForLocationTracking] Active deployments count:', activeDeploymentsRaw?.length || 0);

  if (deploymentsError) {
    console.error('[getExpectedWorkersForLocationTracking] ❌ Deployment query error:', deploymentsError);
    return 0;
  }

  if (!activeDeploymentsRaw || activeDeploymentsRaw.length === 0) {
    console.log('[getExpectedWorkersForLocationTracking] ❌ 활성 deployment가 없음');
    return 0;
  }

  // Supabase는 snake_case를 반환하므로 camelCase로 변환
  const activeDeployments = toCamelCaseArray(activeDeploymentsRaw);
  
  // 각 deployment의 ep_company_id에 해당하는 활성 work_zone이 있는지 확인
  const epCompanyIds = [...new Set(
    activeDeployments.map((d: any) => d.epCompanyId || d.ep_company_id).filter(Boolean)
  )];
  
  console.log('[getExpectedWorkersForLocationTracking] EP Company IDs:', epCompanyIds);
  
  if (epCompanyIds.length === 0) {
    console.log('[getExpectedWorkersForLocationTracking] ❌ EP Company ID가 없음');
    return 0;
  }
  
  const { data: workZonesRaw, error: workZonesError } = await supabase
    .from("work_zones")
    .select("company_id, id, name, is_active")
    .eq("is_active", true)
    .in("company_id", epCompanyIds);

  console.log('[getExpectedWorkersForLocationTracking] Work zones query result:', {
    workZones: workZonesRaw?.length || 0,
    error: workZonesError,
  });

  if (workZonesError) {
    console.error('[getExpectedWorkersForLocationTracking] ❌ Work zones 조회 오류:', workZonesError);
  }

  const workZones = workZonesRaw ? toCamelCaseArray(workZonesRaw) : [];
  
  const validEpCompanyIds = new Set(
    workZones.map((wz: any) => wz.companyId || wz.company_id).filter(Boolean)
  );
  
  console.log('[getExpectedWorkersForLocationTracking] Valid EP Company IDs (work_zone이 있는):', Array.from(validEpCompanyIds));
  
  // work_zone이 있는 deployment만 출근 대상으로 계산
  const validDeployments = activeDeployments.filter((d: any) => {
    const epCompanyId = d.epCompanyId || d.ep_company_id;
    return epCompanyId && validEpCompanyIds.has(epCompanyId);
  });

  console.log('[getExpectedWorkersForLocationTracking] ===== 최종 결과 =====');
  console.log('[getExpectedWorkersForLocationTracking] Total deployments:', activeDeployments.length);
  console.log('[getExpectedWorkersForLocationTracking] Valid deployments (with work zones):', validDeployments.length);
  console.log('[getExpectedWorkersForLocationTracking] Expected workers:', validDeployments.length);

  return validDeployments.length;
}

// ============================================================
// 작업 구역 (Work Zones) - GPS 기반 출근 체크
// ============================================================

/**
 * GPS 거리 계산 (Haversine 공식)
 * 두 GPS 좌표 사이의 거리를 미터 단위로 계산
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터
}

/**
 * 작업 구역 생성
 */
export async function createWorkZone(data: InsertWorkZone): Promise<WorkZone> {
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from('work_zones')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) {
    console.error('[DB] createWorkZone error:', error);
    throw new Error(`Failed to create work zone: ${error.message}`);
  }

  return toCamelCase(result);
}

/**
 * 작업 구역 목록 조회
 */
export async function getWorkZones(filters?: {
  companyId?: string;
  isActive?: boolean;
}): Promise<WorkZone[]> {
  const supabase = getSupabase();
  let query = supabase.from('work_zones').select('*');

  if (filters?.companyId) {
    query = query.eq('company_id', filters.companyId);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[DB] getWorkZones error:', error);
    throw new Error(`Failed to get work zones: ${error.message}`);
  }

  return toCamelCaseArray(data || []);
}

/**
 * 작업 구역 단건 조회
 */
export async function getWorkZoneById(id: string): Promise<WorkZone | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('work_zones')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[DB] getWorkZoneById error:', error);
    throw new Error(`Failed to get work zone: ${error.message}`);
  }

  return toCamelCase(data);
}

/**
 * 작업 구역 수정
 */
export async function updateWorkZone(
  id: string,
  data: Partial<InsertWorkZone>
): Promise<WorkZone> {
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from('work_zones')
    .update({ ...toSnakeCase(data), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[DB] updateWorkZone error:', error);
    throw new Error(`Failed to update work zone: ${error.message}`);
  }

  return toCamelCase(result);
}

/**
 * 작업 구역 삭제 (소프트 삭제)
 */
export async function deleteWorkZone(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('work_zones')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[DB] deleteWorkZone error:', error);
    throw new Error(`Failed to delete work zone: ${error.message}`);
  }
}

/**
 * GPS 좌표가 작업 구역 내에 있는지 확인
 * 원형 구역: 중심점과 반경으로 계산
 * 다각형 구역: Ray casting 알고리즘으로 내부 여부 확인
 */
export async function isWithinWorkZone(
  workZoneId: string,
  lat: number,
  lng: number
): Promise<{ isWithin: boolean; distance: number }> {
  const workZone = await getWorkZoneById(workZoneId);
  if (!workZone) {
    throw new Error('Work zone not found');
  }

  const zoneType = workZone.zoneType || 'circle';

  console.log(`[isWithinWorkZone] Checking zone ${workZoneId}:`, {
    zoneType,
    centerLat: workZone.centerLat,
    centerLng: workZone.centerLng,
    radiusMeters: workZone.radiusMeters,
    checkLat: lat,
    checkLng: lng,
  });

  if (zoneType === 'polygon') {
    // 다각형 구역 처리
    if (!workZone.polygonCoordinates) {
      throw new Error('Polygon coordinates not found');
    }

    let polygonPoints: Array<{ lat: number; lng: number }>;
    try {
      polygonPoints = JSON.parse(workZone.polygonCoordinates);
    } catch (e) {
      throw new Error('Invalid polygon coordinates format');
    }

    if (polygonPoints.length < 3) {
      throw new Error('Polygon must have at least 3 points');
    }

    // Ray casting 알고리즘으로 점이 다각형 내부에 있는지 확인
    // 수정: lat/lng 순서 확인 필요
    let isInside = false;
    for (let i = 0, j = polygonPoints.length - 1; i < polygonPoints.length; j = i++) {
      const xi = polygonPoints[i].lng;
      const yi = polygonPoints[i].lat;
      const xj = polygonPoints[j].lng;
      const yj = polygonPoints[j].lat;

      // Ray casting: 수평선(lat 기준)과 교차하는지 확인
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) isInside = !isInside;
    }

    // 다각형의 중심점까지의 거리 계산 (표시용)
    const centerLat = polygonPoints.reduce((sum, p) => sum + p.lat, 0) / polygonPoints.length;
    const centerLng = polygonPoints.reduce((sum, p) => sum + p.lng, 0) / polygonPoints.length;
    const distance = calculateDistance(centerLat, centerLng, lat, lng);

    console.log(`[isWithinWorkZone] Polygon result:`, {
      isInside,
      distance: Math.round(distance),
      centerLat,
      centerLng,
    });

    return {
      isWithin: isInside,
      distance: Math.round(distance),
    };
  } else {
    // 원형 구역 처리
    if (!workZone.centerLat || !workZone.centerLng) {
      throw new Error('Circle zone must have center coordinates');
    }

    // 문자열로 저장된 좌표를 숫자로 변환
    const centerLat = Number(workZone.centerLat);
    const centerLng = Number(workZone.centerLng);
    const radiusMeters = Number(workZone.radiusMeters) || 100;

    console.log(`[isWithinWorkZone] Circle calculation:`, {
      centerLat,
      centerLng,
      radiusMeters,
      checkLat: lat,
      checkLng: lng,
    });

    const distance = calculateDistance(centerLat, centerLng, lat, lng);
    // GPS 정확도 허용 오차 추가 (약 10% 또는 최소 50m)
    // 실내/건물 내에서 GPS 오차가 발생할 수 있으므로 여유를 둠
    const tolerance = Math.max(radiusMeters * 0.1, 50);
    const isWithin = distance <= (radiusMeters + tolerance);

    console.log(`[isWithinWorkZone] Circle result:`, {
      distance: Math.round(distance),
      radiusMeters,
      isWithin,
    });

    return {
      isWithin,
      distance: Math.round(distance),
    };
  }
}

// ============================================================
// 출근 기록 (Check-Ins)
// ============================================================

/**
 * 출근 기록 생성
 */
export async function createCheckIn(data: InsertCheckIn): Promise<CheckIn> {
  const supabase = getSupabase();
  const { data: result, error } = await supabase
    .from('check_ins')
    .insert(toSnakeCase(data))
    .select()
    .single();

  if (error) {
    console.error('[DB] createCheckIn error:', error);
    throw new Error(`Failed to create check-in: ${error.message}`);
  }

  return toCamelCase(result);
}

/**
 * 출근 기록 조회
 */
export async function getCheckIns(filters?: {
  workerId?: string;
  userId?: string;
  workZoneId?: string;
  bpCompanyId?: string;
  ownerCompanyId?: string;
  epCompanyId?: string;
  workerTypeId?: string;
  workerName?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CheckIn[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  // 기본 쿼리 - join 없이 단순 조회 (Supabase 관계 에러 방지)
  let query = supabase.from('check_ins').select('*');

  if (filters?.workerId) {
    query = query.eq('worker_id', filters.workerId);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.workZoneId) {
    query = query.eq('work_zone_id', filters.workZoneId);
  }
  if (filters?.startDate) {
    query = query.gte('check_in_time', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('check_in_time', filters.endDate);
  }

  query = query.order('check_in_time', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[DB] getCheckIns error:', error);
    throw new Error(`Failed to get check-ins: ${error.message}`);
  }

  let checkIns = toCamelCaseArray(data || []);

  // worker 정보 별도 조회 (Supabase 관계 에러 방지)
  const workerIds = [...new Set(checkIns.map((ci: any) => ci.workerId).filter(Boolean))];
  const workerMap = new Map();
  
  if (workerIds.length > 0) {
    const { data: workers } = await supabase
      .from('workers')
      .select('id, user_id, name, worker_type_id')
      .in('id', workerIds);
    
    if (workers) {
      workers.forEach((w: any) => {
        workerMap.set(w.id, toCamelCase(w));
      });
    }
  }

  // work_zone 정보 별도 조회
  const workZoneIds = [...new Set(checkIns.map((ci: any) => ci.workZoneId).filter(Boolean))];
  const workZoneMap = new Map();
  
  if (workZoneIds.length > 0) {
    const { data: workZones } = await supabase
      .from('work_zones')
      .select('id, name')
      .in('id', workZoneIds);
    
    if (workZones) {
      workZones.forEach((wz: any) => {
        workZoneMap.set(wz.id, toCamelCase(wz));
      });
    }
  }

  // deployment 정보 별도 조회 (nested join 제한으로 인해)
  const deploymentIds = [...new Set(checkIns.map((ci: any) => ci.deploymentId).filter(Boolean))];
  const deploymentMap = new Map();
  
  if (deploymentIds.length > 0) {
    const { data: deployments } = await supabase
      .from('deployments')
      .select('id, bp_company_id, ep_company_id, owner_id')
      .in('id', deploymentIds);
    
    if (deployments) {
      deployments.forEach((dep: any) => {
        deploymentMap.set(dep.id, toCamelCase(dep));
      });
    }
  }

  console.log('[getCheckIns] Deployment mapping:', {
    deploymentIds: deploymentIds.length,
    deploymentMapSize: deploymentMap.size,
    deployments: Array.from(deploymentMap.entries()).map(([id, dep]: [string, any]) => ({
      id,
      epCompanyId: dep.epCompanyId || dep.ep_company_id,
      bpCompanyId: dep.bpCompanyId || dep.bp_company_id,
    })),
  });

  // company 정보 별도 조회
  const companyIds = new Set<string>();
  deploymentMap.forEach((dep: any) => {
    if (dep.bpCompanyId) companyIds.add(dep.bpCompanyId);
    if (dep.epCompanyId) companyIds.add(dep.epCompanyId);
  });
  
  const companyMap = new Map();
  if (companyIds.size > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, company_type')
      .in('id', Array.from(companyIds));
    
    if (companies) {
      companies.forEach((comp: any) => {
        companyMap.set(comp.id, toCamelCase(comp));
      });
    }
  }

  // worker_type 정보 별도 조회
  const workerTypeIds = [...new Set(
    Array.from(workerMap.values()).map((w: any) => w.workerTypeId).filter(Boolean)
  )];
  const workerTypeMap = new Map();
  
  if (workerTypeIds.length > 0) {
    const { data: workerTypes } = await supabase
      .from('worker_types')
      .select('id, name')
      .in('id', workerTypeIds);
    
    if (workerTypes) {
      workerTypes.forEach((wt: any) => {
        workerTypeMap.set(wt.id, toCamelCase(wt));
      });
    }
  }

  // user 정보 별도 조회
  const userIds = [...new Set(checkIns.map((ci: any) => ci.userId).filter(Boolean))];
  const userMap = new Map();
  
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('id', userIds);
    
    if (users) {
      users.forEach((user: any) => {
        userMap.set(user.id, toCamelCase(user));
      });
    }
  }

  // 모든 정보 조합
  checkIns = checkIns.map((ci: any) => {
    const worker = workerMap.get(ci.workerId);
    const workZone = workZoneMap.get(ci.workZoneId);
    const deployment = deploymentMap.get(ci.deploymentId);
    const bpCompany = deployment?.bpCompanyId ? companyMap.get(deployment.bpCompanyId) : null;
    const epCompany = deployment?.epCompanyId ? companyMap.get(deployment.epCompanyId) : null;
    const workerType = worker?.workerTypeId ? workerTypeMap.get(worker.workerTypeId) : null;

    return {
      ...ci,
      user: userMap.get(ci.userId) || null,
      worker: worker ? {
        ...worker,
        workerType: workerType ? { id: workerType.id, name: workerType.name } : null,
      } : null,
      workZone: workZone ? { id: workZone.id, name: workZone.name } : null,
      deployment: deployment ? {
        ...deployment,
        bpCompany: bpCompany ? { id: bpCompany.id, name: bpCompany.name } : null,
        epCompany: epCompany ? { id: epCompany.id, name: epCompany.name } : null,
      } : null,
    };
  });

  // 추가 필터링 (deployment 정보 기반)
  if (filters?.bpCompanyId) {
    const beforeCount = checkIns.length;
    checkIns = checkIns.filter((ci: any) => {
      const matches = ci.deployment?.bpCompanyId === filters.bpCompanyId;
      if (!matches) {
        console.log(`[getCheckIns] Filtered out by bpCompanyId:`, {
          checkInId: ci.id,
          deploymentBpCompanyId: ci.deployment?.bpCompanyId,
          filterBpCompanyId: filters.bpCompanyId,
        });
      }
      return matches;
    });
    console.log(`[getCheckIns] bpCompanyId filter: ${beforeCount} -> ${checkIns.length}`);
  }

  if (filters?.epCompanyId) {
    const beforeCount = checkIns.length;
    checkIns = checkIns.filter((ci: any) => {
      const deploymentEpCompanyId = ci.deployment?.epCompanyId || ci.deployment?.ep_company_id;
      const matches = deploymentEpCompanyId === filters.epCompanyId;
      if (!matches) {
        console.log(`[getCheckIns] Filtered out by epCompanyId:`, {
          checkInId: ci.id,
          deploymentEpCompanyId,
          filterEpCompanyId: filters.epCompanyId,
          hasDeployment: !!ci.deployment,
        });
      }
      return matches;
    });
    console.log(`[getCheckIns] epCompanyId filter: ${beforeCount} -> ${checkIns.length}`);
  }

  if (filters?.ownerCompanyId) {
    // Owner 필터링: deployment의 owner_id를 통해 owner의 company_id 확인
    // 모든 deployment의 owner_id 수집
    const ownerIds = [...new Set(checkIns.map((ci: any) => ci.deployment?.ownerId).filter(Boolean))];
    
    if (ownerIds.length > 0) {
      // 한 번에 owner 정보 조회
      const { data: owners } = await supabase
        .from('users')
        .select('id, company_id')
        .in('id', ownerIds);
      
      // owner의 company_id가 필터와 일치하는 owner_id만 수집
      const validOwnerIds = new Set(
        owners?.filter((o: any) => o.company_id === filters.ownerCompanyId).map((o: any) => o.id) || []
      );
      
      // 해당 owner_id를 가진 deployment의 check-in만 필터링
      checkIns = checkIns.filter((ci: any) => 
        ci.deployment?.ownerId && validOwnerIds.has(ci.deployment.ownerId)
      );
    } else {
      // owner_id가 없으면 빈 결과
      checkIns = [];
    }
  }

  if (filters?.workerTypeId) {
    checkIns = checkIns.filter((ci: any) => 
      ci.worker?.workerTypeId === filters.workerTypeId
    );
  }

  if (filters?.workerName) {
    const nameLower = filters.workerName.toLowerCase();
    checkIns = checkIns.filter((ci: any) => 
      ci.worker?.name?.toLowerCase().includes(nameLower) ||
      ci.user?.name?.toLowerCase().includes(nameLower)
    );
  }

  return checkIns;
}

/**
 * 오늘 출근 기록 조회
 */
export async function getTodayCheckIn(userId: string): Promise<CheckIn | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .gte('check_in_time', today.toISOString())
    .lt('check_in_time', tomorrow.toISOString())
    .order('check_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[DB] getTodayCheckIn error:', error);
    throw new Error(`Failed to get today check-in: ${error.message}`);
  }

  return data ? toCamelCase(data) : null;
}

// ============================================================
// System Settings (시스템 설정)
// ============================================================

/**
 * 시스템 설정 조회
 */
export async function getSystemSetting(key: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('[DB] getSystemSetting error:', error);
    return null;
  }

  return data?.value || null;
}

/**
 * 시스템 설정 저장/업데이트
 */
export async function setSystemSetting(
  key: string,
  value: string,
  description?: string,
  updatedBy?: string
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase not available");
  }

  const id = `setting-${nanoid()}`;
  const now = new Date();

  // 기존 설정 확인
  const { data: existing } = await supabase
    .from('system_settings')
    .select('id')
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    // 업데이트
    const { error } = await supabase
      .from('system_settings')
      .update({
        value,
        description: description || null,
        updated_by: updatedBy || null,
        updated_at: now,
      })
      .eq('key', key);

    if (error) throw error;
  } else {
    // 새로 생성
    const { error } = await supabase
      .from('system_settings')
      .insert({
        id,
        key,
        value,
        description: description || null,
        updated_by: updatedBy || null,
        updated_at: now,
        created_at: now,
      });

    if (error) throw error;
  }
}

/**
 * GPS 전송 간격 조회 (기본값: 5분)
 */
export async function getGpsTrackingInterval(): Promise<number> {
  const value = await getSystemSetting('gps_tracking_interval_minutes');
  if (value) {
    const interval = parseInt(value, 10);
    if (!isNaN(interval) && interval > 0) {
      return interval;
    }
  }
  // 기본값: 5분
  return 5;
}

