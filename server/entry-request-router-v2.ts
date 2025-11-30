/**
 * 반입 요청 라우터 V2
 * 올바른 프로세스: Owner → BP → EP
 * 
 * 1. Owner: 장비/인력 선택 → BP 회사 선택 → 반입 요청 생성
 * 2. BP: 요청 확인 → 작업계획서 업로드 → EP 회사 선택 → 승인
 * 3. EP: 작업계획서 확인 → 최종 승인
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { storagePut } from "./storage";
import { sendFcmNotifications, sendFcmNotification } from "./_core/fcm";

// 상태 정의
// owner_requested: Owner가 BP에게 요청
// bp_reviewing: BP가 검토 중
// bp_approved: BP가 승인하고 EP에게 전달
// ep_reviewing: EP가 검토 중
// ep_approved: EP가 최종 승인 (반입 완료)
// rejected: 반려됨

export const entryRequestsRouterV2 = router({
  // ============================================================
  // 조회
  // ============================================================

  /**
   * 반입 요청 목록 조회 (역할별 필터링)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const supabase = db.getSupabase();
    if (!supabase) return [];

    const user = ctx.user;
    console.log('[EntryRequestsV2] List query by user:', user.email, 'role:', user.role, 'companyId:', user.companyId);

    // 기본 요청 데이터 조회
    let query = supabase
      .from('entry_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // 역할별 필터링
    if (user.role === 'owner') {
      console.log('[EntryRequestsV2] Filtering by owner_user_id:', user.id);
      query = query.eq('owner_user_id', user.id);
    } else if (user.role === 'bp') {
      console.log('[EntryRequestsV2] Filtering BP requests - bp_company_id:', user.companyId, 'bp_user_id:', user.id);
      // BP는 자신의 회사에 대한 요청 또는 자신이 생성한 요청 모두 조회
      // target_bp_company_id (Owner가 BP에게 보낸 요청) 또는 bp_company_id + bp_user_id (BP가 직접 생성한 요청)
      // Supabase의 .or()는 복잡한 조건을 지원하지 않으므로 두 번 조회 후 합치기
      const { data: targetBpRequests } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('target_bp_company_id', user.companyId);
      
      const { data: bpCreatedRequests } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('bp_company_id', user.companyId)
        .eq('bp_user_id', user.id);
      
      // 두 결과를 합치고 중복 제거
      const allRequests = [...(targetBpRequests || []), ...(bpCreatedRequests || [])];
      const uniqueRequests = Array.from(new Map(allRequests.map((r: any) => [r.id, r])).values());
      
      // 이후 로직을 위해 data를 설정하고 error는 null로
      const { error } = { error: null };
      const data = uniqueRequests;
      
      if (error) {
        console.error('[EntryRequestsV2] List error:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('[EntryRequestsV2] ⚠️ No requests found for BP user:', user.role);
        return [];
      }
      
      console.log(`[EntryRequestsV2] Found ${data.length} requests for BP`);
      
      // 각 요청에 대한 추가 정보 조회 (기존 로직 재사용)
      const enrichedData = await Promise.all(
        data.map(async (request: any) => {
          // 요청자 정보
          let ownerName = 'Unknown';
          if (request.owner_user_id) {
            const { data: ownerUser } = await supabase
              .from('users')
              .select('name, email')
              .eq('id', request.owner_user_id)
              .single();
            ownerName = ownerUser?.name || ownerUser?.email || 'Unknown';
          }

          // BP 회사명 (target_bp_company_id 또는 bp_company_id에서 조회)
          let bpCompanyName = '-';
          const bpCompanyId = request.target_bp_company_id || request.bp_company_id;
          if (bpCompanyId) {
            const { data: bpCompany } = await supabase
              .from('companies')
              .select('name')
              .eq('id', bpCompanyId)
              .single();
            bpCompanyName = bpCompany?.name || '-';
          }

          // 아이템 전체 조회
          const { data: items } = await supabase
            .from('entry_request_items')
            .select('item_type, item_id')
            .eq('entry_request_id', request.id);

          const equipmentCount = items?.filter((i: any) => i.item_type === 'equipment').length || 0;
          const workerCount = items?.filter((i: any) => i.item_type === 'worker').length || 0;

          return {
            ...request,
            ownerName,
            bpCompanyName,
            equipmentCount,
            workerCount,
            items: items || [],
          };
        })
      );

      console.log('[EntryRequestsV2] Enriched data ready for BP');
      return enrichedData;
    } else if (user.role === 'ep') {
      console.log('[EntryRequestsV2] 🔍 EP User:', user.name);
      console.log('[EntryRequestsV2] 🔍 EP companyId:', user.companyId);
      console.log('[EntryRequestsV2] 🔍 Filtering by target_ep_company_id:', user.companyId);
      query = query.eq('target_ep_company_id', user.companyId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[EntryRequestsV2] List error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[EntryRequestsV2] ⚠️ No requests found for user:', user.role);
      if (user.role === 'ep') {
        console.log('[EntryRequestsV2] ⚠️ EP companyId is:', user.companyId);
        // 전체 요청 중 EP에 보낸 것이 있는지 확인
        const { data: allRequests } = await supabase
          .from('entry_requests')
          .select('id, status, target_ep_company_id')
          .eq('status', 'bp_approved');
        console.log('[EntryRequestsV2] 📊 All bp_approved requests:', allRequests);
      }
      return [];
    }

    console.log(`[EntryRequestsV2] Found ${data.length} requests`);
    if (user.role === 'ep') {
      console.log('[EntryRequestsV2] 📋 EP requests:', data.map((r: any) => ({ id: r.id, status: r.status, target_ep: r.target_ep_company_id })));
    }

    // 각 요청에 대한 추가 정보 조회
    const enrichedData = await Promise.all(
      data.map(async (request: any) => {
        // 요청자 정보
        let ownerName = 'Unknown';
        if (request.owner_user_id) {
          const { data: ownerUser } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', request.owner_user_id)
            .single();
          ownerName = ownerUser?.name || ownerUser?.email || 'Unknown';
        }

          // BP 회사명 (target_bp_company_id 또는 bp_company_id에서 조회)
          let bpCompanyName = '-';
          const bpCompanyId = request.target_bp_company_id || request.bp_company_id;
          if (bpCompanyId) {
            const { data: bpCompany } = await supabase
              .from('companies')
              .select('name')
              .eq('id', bpCompanyId)
              .single();
            bpCompanyName = bpCompany?.name || '-';
          }

        // 아이템 전체 조회 (투입 관리에서 item_id가 필요함)
        const { data: items } = await supabase
          .from('entry_request_items')
          .select('item_type, item_id')
          .eq('entry_request_id', request.id);

        const equipmentCount = items?.filter((i: any) => i.item_type === 'equipment').length || 0;
        const workerCount = items?.filter((i: any) => i.item_type === 'worker').length || 0;

        return {
          ...request,
          ownerName,
          bpCompanyName,
          equipmentCount,
          workerCount,
          items: items || [], // items 배열 포함
        };
      })
    );

    console.log('[EntryRequestsV2] Enriched data ready');
    return enrichedData;
  }),

  /**
   * 반입 요청 상세 조회 (아이템 포함)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Admin 클라이언트 사용 (RLS 우회)
      const supabase = db.getSupabaseAdmin() || db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      console.log('[EntryRequestsV2] getById:', input.id);

      // 요청 정보 조회 (JOIN 없이)
      const { data: request, error: requestError } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('id', input.id)
        .single();

      if (requestError || !request) {
        console.error('[EntryRequestsV2] Request not found:', requestError);
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }

      // 아이템 조회
      const { data: items } = await supabase
        .from('entry_request_items')
        .select('*')
        .eq('entry_request_id', input.id);

      console.log(`[EntryRequestsV2] Found ${items?.length || 0} items`);

      // 각 아이템에 대한 상세 정보 및 서류 조회
      const enrichedItems = await Promise.all(
        (items || []).map(async (item: any) => {
          let itemDetails: any = {};
          let documents: any[] = [];

          if (item.item_type === 'equipment' && item.item_id) {
            // 장비 정보
            console.log(`[EntryRequestsV2] Querying equipment: ${item.item_id}`);
            const { data: equip, error: equipError } = await supabase
              .from('equipment')
              .select('id, reg_num, equip_type_id, specification')
              .eq('id', item.item_id)
              .maybeSingle();

            if (equipError) {
              console.error(`[EntryRequestsV2] Equipment query error for ${item.item_id}:`, equipError);
            }
            console.log(`[EntryRequestsV2] Equipment data for ${item.item_id}:`, equip);

            if (equip) {
              // 장비 타입 정보
              let equipType = null;
              if (equip.equip_type_id) {
                const { data } = await supabase
                  .from('equip_types')
                  .select('name, description')
                  .eq('id', equip.equip_type_id)
                  .maybeSingle();
                equipType = data;
              }

              itemDetails = {
                itemType: 'equipment',
                itemId: equip.id,
                itemName: equip.reg_num,
                equipmentRegNum: equip.reg_num,
                equipTypeName: equipType?.name || '-',
                equipTypeDescription: equipType?.description || '',
                specification: equip.specification || '',
              };

              // 장비 서류 조회
              const { data: docs } = await supabase
                .from('docs_compliance')
                .select('*')
                .eq('target_type', 'equipment')
                .eq('target_id', item.item_id);

              documents = (docs || []).map((d: any) => ({
                docName: d.doc_type,
                fileUrl: d.file_url,
                expiryDate: d.expiry_date,
                status: 'approved', // 임시: 자동 승인
              }));
            } else {
              // 장비 정보를 찾을 수 없는 경우에도 기본 정보 제공
              console.warn(`[EntryRequestsV2] Equipment not found: ${item.item_id}`);
              itemDetails = {
                itemType: 'equipment',
                itemId: item.item_id,
                itemName: '알 수 없는 장비',
                equipmentRegNum: '정보 없음',
                equipTypeName: '장비 정보를 찾을 수 없습니다',
                equipTypeDescription: '',
                specification: '',
              };
            }
          } else if (item.item_type === 'worker' && item.item_id) {
            // 인력 정보
            const { data: worker } = await supabase
              .from('workers')
              .select('id, name, worker_type_id, license_num, phone, email')
              .eq('id', item.item_id)
              .maybeSingle();

            if (worker) {
              // 인력 타입 정보
              let workerType = null;
              if (worker.worker_type_id) {
                const { data } = await supabase
                  .from('worker_types')
                  .select('name, description')
                  .eq('id', worker.worker_type_id)
                  .maybeSingle();
                workerType = data;
              }

              itemDetails = {
                itemType: 'worker',
                itemId: worker.id,
                itemName: worker.name,
                workerName: worker.name,
                workerTypeName: workerType?.name || '-',
                workerTypeDescription: workerType?.description || '',
                licenseNum: worker.license_num || '',
                phone: worker.phone || '',
                email: worker.email || '',
              };

              // 인력 서류 조회
              const { data: docs } = await supabase
                .from('docs_compliance')
                .select('*')
                .eq('target_type', 'worker')
                .eq('target_id', item.item_id);

              documents = (docs || []).map((d: any) => ({
                docName: d.doc_type,
                fileUrl: d.file_url,
                expiryDate: d.expiry_date,
                status: 'approved', // 임시: 자동 승인
              }));
            } else {
              // 인력 정보를 찾을 수 없는 경우에도 기본 정보 제공
              console.warn(`[EntryRequestsV2] Worker not found: ${item.item_id}`);
              itemDetails = {
                itemType: 'worker',
                itemId: item.item_id,
                itemName: '알 수 없는 인력',
                workerName: '정보 없음',
                workerTypeName: '인력 정보를 찾을 수 없습니다',
                workerTypeDescription: '',
                licenseNum: '',
                phone: '',
                email: '',
              };
            }
          }

          return {
            ...item,
            ...itemDetails,
            documents,
          };
        })
      );

      console.log('[EntryRequestsV2] Enriched items ready with documents');
      if (enrichedItems.length > 0) {
        console.log('[EntryRequestsV2] Sample enriched item (before camelCase):', enrichedItems[0]);
      }

      // BP 회사명 조회
      let bpCompanyName = '-';
      const bpCompanyId = request.target_bp_company_id || request.bp_company_id;
      if (bpCompanyId) {
        const { data: bpCompany } = await supabase
          .from('companies')
          .select('name')
          .eq('id', bpCompanyId)
          .single();
        bpCompanyName = bpCompany?.name || '-';
      }

      // 요청자 정보 조회 (Owner 또는 BP)
      let bpUserName = '-';
      let ownerName = '-';
      if (request.owner_user_id) {
        const { data: ownerUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', request.owner_user_id)
          .single();
        ownerName = ownerUser?.name || ownerUser?.email || '-';
      }
      if (request.bp_user_id) {
        const { data: bpUser } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', request.bp_user_id)
          .single();
        bpUserName = bpUser?.name || bpUser?.email || '-';
      }

      // toCamelCase 적용하여 반환
      const { toCamelCase } = await import('./db-utils');

      // enrichedItems의 각 항목에도 toCamelCase 적용 (단, 이미 camelCase로 설정한 필드는 유지)
      const camelCaseItems = enrichedItems.map((item: any) => {
        const baseCamelCase = toCamelCase(item);
        // itemDetails에서 설정한 필드들은 이미 camelCase이므로 그대로 유지
        return {
          ...baseCamelCase,
          // 명시적으로 설정된 필드들 유지
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          equipmentRegNum: item.equipmentRegNum,
          equipTypeName: item.equipTypeName,
          equipTypeDescription: item.equipTypeDescription,
          workerName: item.workerName,
          workerTypeName: item.workerTypeName,
          workerTypeDescription: item.workerTypeDescription,
          documents: item.documents,
        };
      });

      if (camelCaseItems.length > 0) {
        console.log('[EntryRequestsV2] Sample camelCase item (after conversion):', camelCaseItems[0]);
      }

      return {
        ...toCamelCase(request),
        bpCompanyName,
        bpUserName,
        ownerName,
        items: camelCaseItems,
      };
    }),

  // ============================================================
  // Owner: 반입 요청 생성
  // ============================================================

  /**
   * 반입 요청 생성 (Owner 또는 BP)
   * - Owner: Owner → BP → EP 워크플로우
   * - BP: BP → EP 워크플로우 (유도원만 요청 가능)
   */
  create: protectedProcedure
    .input(
      z.object({
        targetBpCompanyId: z.string().optional(), // BP가 요청할 때는 선택사항
        targetEpCompanyId: z.string().optional(), // BP가 요청할 때 EP 회사 선택
        purpose: z.string().min(1, "반입 목적을 입력해주세요."),
        requestedStartDate: z.string(),
        requestedEndDate: z.string(),
        items: z.array(
          z.object({
            requestType: z.enum(['equipment_with_worker', 'equipment_only', 'worker_only']),
            equipmentId: z.string().optional(),
            workerId: z.string().optional(),
          })
        ).min(1, "최소 1개 이상의 장비 또는 인력을 선택해주세요."),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();
      
      // Owner 또는 BP 권한 확인
      if (userRole !== 'owner' && userRole !== 'bp' && userRole !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "반입 요청 생성 권한이 없습니다.",
        });
      }

      // BP가 요청할 때는 targetBpCompanyId가 없어도 됨 (자신의 회사)
      // Owner가 요청할 때는 targetBpCompanyId 필수
      if (userRole === 'owner' && !input.targetBpCompanyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BP 회사를 선택해주세요.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const requestId = `request-${nanoid()}`;
      const requestNumber = `REQ-${Date.now()}`;

      // 워크플로우 결정
      const isBpRequest = userRole === 'bp';
      const bpCompanyId = isBpRequest ? ctx.user.companyId : input.targetBpCompanyId;
      // BP가 직접 올린 요청은 EP가 바로 승인할 수 있도록 bp_approved 상태로 시작
      // (BP가 이미 검토 완료하고 EP에 전달하는 것으로 간주)
      const initialStatus = isBpRequest ? 'bp_approved' : 'owner_requested';

      // 반입 요청 생성
      const requestData: any = {
        id: requestId,
        request_number: requestNumber,
        bp_company_id: bpCompanyId,
        bp_user_id: ctx.user.id,
        purpose: input.purpose,
        requested_start_date: input.requestedStartDate,
        requested_end_date: input.requestedEndDate,
        status: initialStatus,
        created_at: new Date().toISOString(),
      };

      // Owner가 요청한 경우
      if (!isBpRequest) {
        requestData.owner_company_id = ctx.user.companyId;
        requestData.owner_user_id = ctx.user.id;
        requestData.owner_requested_at = new Date().toISOString();
        requestData.target_bp_company_id = input.targetBpCompanyId;
      } else {
        // BP가 요청한 경우 EP 회사 선택
        if (input.targetEpCompanyId) {
          requestData.target_ep_company_id = input.targetEpCompanyId;
        }
      }

      const { error: requestError } = await supabase
        .from('entry_requests')
        .insert(requestData);

      if (requestError) {
        console.error('[EntryRequests] Create error:', requestError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "반입 요청 생성에 실패했습니다.",
        });
      }

      // 아이템 추가
      for (const item of input.items) {
        // equipment_with_worker 타입의 경우: 장비와 인력을 별도 아이템으로 생성
        if (item.requestType === 'equipment_with_worker') {
          // 장비 아이템
          if (item.equipmentId) {
            const equipmentItemId = `item-${nanoid()}`;
            const { error: equipmentError } = await supabase
              .from('entry_request_items')
              .insert({
                id: equipmentItemId,
                entry_request_id: requestId,
                item_type: 'equipment',
                item_id: item.equipmentId,
                paired_equipment_id: item.equipmentId,
                paired_worker_id: item.workerId, // 페어링된 인력 ID
              });

            if (equipmentError) {
              console.error('[EntryRequests] Equipment item create error:', equipmentError);
            }
          }

          // 인력 아이템
          if (item.workerId) {
            const workerItemId = `item-${nanoid()}`;
            const { error: workerError } = await supabase
              .from('entry_request_items')
              .insert({
                id: workerItemId,
                entry_request_id: requestId,
                item_type: 'worker',
                item_id: item.workerId,
                paired_equipment_id: item.equipmentId, // 페어링된 장비 ID
                paired_worker_id: item.workerId,
              });

            if (workerError) {
              console.error('[EntryRequests] Worker item create error:', workerError);
            }
          }
        }
        // equipment_only 또는 worker_only
        else {
          const itemId = `item-${nanoid()}`;
          const itemType = item.requestType === 'equipment_only' ? 'equipment' : 'worker';
          const itemIdValue = itemType === 'equipment' ? item.equipmentId : item.workerId;

          const { error: itemError } = await supabase
            .from('entry_request_items')
            .insert({
              id: itemId,
              entry_request_id: requestId,
              item_type: itemType,
              item_id: itemIdValue!,
              paired_equipment_id: item.equipmentId,
              paired_worker_id: item.workerId,
            });

          if (itemError) {
            console.error('[EntryRequests] Item create error:', itemError);
          }
        }
      }

      console.log(`[EntryRequests] Created: ${requestNumber} by ${ctx.user.name}`);

      // FCM 푸시 알림 발송
      try {
        if (!isBpRequest && bpCompanyId) {
          // Owner가 요청한 경우 → BP 담당자들에게 푸시
          const bpUsers = await db.getUsersFcmTokensByRoles(["bp"]);
          // 해당 BP 회사 소속만 필터링 (나중에 회사 ID 기반 필터링 추가 가능)

          if (bpUsers.length > 0) {
            await sendFcmNotifications(
              bpUsers.map((u) => ({ userId: u.userId, fcmToken: u.fcmToken })),
              {
                title: "📋 새 반입 요청",
                body: `${ctx.user.name}님이 새로운 반입 요청을 등록했습니다.\n${input.purpose}`,
                data: {
                  type: "entry_request",
                  requestId: requestId,
                  action: "new",
                },
              }
            );
            console.log(`[EntryRequests] FCM 푸시 발송: BP에게 새 요청 알림`);
          }
        } else if (isBpRequest && input.targetEpCompanyId) {
          // BP가 요청한 경우 → EP 담당자들에게 푸시
          const epUsers = await db.getUsersFcmTokensByRoles(["ep"]);

          if (epUsers.length > 0) {
            await sendFcmNotifications(
              epUsers.map((u) => ({ userId: u.userId, fcmToken: u.fcmToken })),
              {
                title: "📋 BP 반입 요청 승인 필요",
                body: `${ctx.user.name}님(BP)이 반입 요청을 등록했습니다.\n${input.purpose}`,
                data: {
                  type: "entry_request",
                  requestId: requestId,
                  action: "pending_ep",
                },
              }
            );
            console.log(`[EntryRequests] FCM 푸시 발송: EP에게 BP 요청 알림`);
          }
        }
      } catch (fcmError) {
        console.error("[EntryRequests] FCM 푸시 발송 실패:", fcmError);
      }

      return { id: requestId, requestNumber, success: true };
    }),

  // ============================================================
  // BP: 승인 및 작업계획서 업로드
  // ============================================================

  /**
   * BP 승인 및 EP에 전달
   */
  bpApprove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        targetEpCompanyId: z.string().min(1, "EP 회사를 선택해주세요."),
        workPlanUrl: z.string().optional(),
        workPlanFile: z.object({
          name: z.string(),
          type: z.string(),
          data: z.string(), // base64
        }).optional(),
        comment: z.string().optional(),
      }).refine((data) => data.workPlanUrl || data.workPlanFile, {
        message: "작업계획서 URL 또는 파일을 제공해주세요.",
      })
    )
    .mutation(async ({ input, ctx }) => {
      // BP 권한 확인
      if (ctx.user.role !== 'bp' && ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "BP 승인 권한이 없습니다.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 요청 상태 확인
      const { data: request } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('id', input.id)
        .single();

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }

      if (request.status !== 'owner_requested') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "승인할 수 없는 상태입니다.",
        });
      }

      // 작업계획서 파일 업로드 (파일이 있으면)
      let workPlanUrl = input.workPlanUrl;

      if (input.workPlanFile) {
        try {
          const { name, type, data } = input.workPlanFile;
          const buffer = Buffer.from(data, 'base64');
          const timestamp = Date.now();

          // 파일명 sanitize (한글 및 특수문자 처리)
          const ext = name.substring(name.lastIndexOf('.'));
          const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
          const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_') + ext;

          const filePath = `work-plans/${input.id}/${timestamp}-${sanitizedName}`;

          const { url } = await storagePut(filePath, buffer, type);
          workPlanUrl = url;

          console.log(`[EntryRequests] Work plan uploaded: ${filePath} (original: ${name})`);
        } catch (error) {
          console.error('[EntryRequests] Work plan upload error:', error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "작업계획서 업로드에 실패했습니다.",
          });
        }
      }

      console.log(`[EntryRequests] BP approving request: ${input.id}`);
      console.log(`[EntryRequests] Setting target_ep_company_id to: ${input.targetEpCompanyId}`);
      console.log(`[EntryRequests] BP user: ${ctx.user.name} (company: ${ctx.user.companyId})`);

      // BP 승인 처리
      const { error } = await supabase
        .from('entry_requests')
        .update({
          status: 'bp_approved',
          bp_approved_user_id: ctx.user.id,
          bp_approved_at: new Date().toISOString(),
          bp_work_plan_url: workPlanUrl,
          bp_comment: input.comment,
          target_ep_company_id: input.targetEpCompanyId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (error) {
        console.error('[EntryRequests] BP approve error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "승인 처리에 실패했습니다.",
        });
      }

      console.log(`[EntryRequests] ✅ BP approved: ${input.id} by ${ctx.user.name}`);
      console.log(`[EntryRequests] ✅ Status changed to: bp_approved`);
      console.log(`[EntryRequests] ✅ Target EP company: ${input.targetEpCompanyId}`);

      // FCM 푸시: EP에게 승인 요청 알림
      try {
        const epUsers = await db.getUsersFcmTokensByRoles(["ep"]);
        if (epUsers.length > 0) {
          await sendFcmNotifications(
            epUsers.map((u) => ({ userId: u.userId, fcmToken: u.fcmToken })),
            {
              title: "✅ 반입 요청 승인 필요",
              body: `BP(${ctx.user.name})가 반입 요청을 승인했습니다. EP 승인이 필요합니다.`,
              data: {
                type: "entry_request",
                requestId: input.id,
                action: "pending_ep",
              },
            }
          );
          console.log(`[EntryRequests] FCM 푸시 발송: EP에게 승인 요청 알림`);
        }
      } catch (fcmError) {
        console.error("[EntryRequests] FCM 푸시 발송 실패:", fcmError);
      }

      return { success: true };
    }),

  /**
   * BP 반려
   */
  bpReject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "반려 사유를 입력해주세요."),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'bp' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { error } = await supabase
        .from('entry_requests')
        .update({
          status: 'rejected',
          rejected_by: ctx.user.id,
          rejected_at: new Date().toISOString(),
          reject_reason: input.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      console.log(`[EntryRequests] BP rejected: ${input.id} by ${ctx.user.name}`);

      return { success: true };
    }),

  // ============================================================
  // EP: 최종 승인
  // ============================================================

  /**
   * EP 최종 승인
   */
  epApprove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        comment: z.string().optional(),
        entryInspectionCompleted: z.boolean().optional(),
        entryInspectionFile: z.string().optional(), // base64 encoded file
        safetyTrainingCompleted: z.boolean().optional(),
        safetyTrainingFile: z.string().optional(), // base64 encoded file
        healthCheckCompleted: z.boolean().optional(),
        healthCheckFile: z.string().optional(), // base64 encoded file
      })
    )
    .mutation(async ({ input, ctx }) => {
      // EP 권한 확인
      if (ctx.user.role !== 'ep' && ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "EP 승인 권한이 없습니다.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 요청 상태 확인
      const { data: request } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('id', input.id)
        .single();

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // BP가 직접 올린 요청(bp_approved) 또는 BP 승인 후 EP 검토 상태 모두 허용
      if (request.status !== 'bp_approved' && request.status !== 'bp_requested') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "승인할 수 없는 상태입니다.",
        });
      }

      // 파일 업로드 처리
      let entryInspectionFileUrl: string | undefined;
      let safetyTrainingFileUrl: string | undefined;
      let healthCheckFileUrl: string | undefined;

      if (input.entryInspectionFile) {
        try {
          const buffer = Buffer.from(input.entryInspectionFile, 'base64');
          const filePath = `entry-requests/${input.id}/entry-inspection-${Date.now()}.pdf`;
          const { url } = await storagePut(filePath, buffer, 'application/pdf');
          entryInspectionFileUrl = url;
          console.log(`[EntryRequests] Entry inspection file uploaded: ${filePath}`);
        } catch (error) {
          console.error('[EntryRequests] Entry inspection file upload error:', error);
          // 파일 업로드 실패해도 승인은 진행
        }
      }

      if (input.safetyTrainingFile) {
        try {
          const buffer = Buffer.from(input.safetyTrainingFile, 'base64');
          const filePath = `entry-requests/${input.id}/safety-training-${Date.now()}.pdf`;
          const { url } = await storagePut(filePath, buffer, 'application/pdf');
          safetyTrainingFileUrl = url;
          console.log(`[EntryRequests] Safety training file uploaded: ${filePath}`);
        } catch (error) {
          console.error('[EntryRequests] Safety training file upload error:', error);
          // 파일 업로드 실패해도 승인은 진행
        }
      }

      if (input.healthCheckFile) {
        try {
          const buffer = Buffer.from(input.healthCheckFile, 'base64');
          const filePath = `entry-requests/${input.id}/health-check-${Date.now()}.pdf`;
          const { url } = await storagePut(filePath, buffer, 'application/pdf');
          healthCheckFileUrl = url;
          console.log(`[EntryRequests] Health check file uploaded: ${filePath}`);
        } catch (error) {
          console.error('[EntryRequests] Health check file upload error:', error);
          // 파일 업로드 실패해도 승인은 진행
        }
      }

      // EP 최종 승인 (검사 및 교육 정보 포함)
      const updateData: any = {
        status: 'ep_approved',
        ep_approved_user_id: ctx.user.id,
        ep_approved_at: new Date().toISOString(),
        ep_comment: input.comment,
        updated_at: new Date().toISOString(),
      };

      // 반입 검사 정보
      if (input.entryInspectionCompleted) {
        updateData.entry_inspection_completed_at = new Date().toISOString();
        if (entryInspectionFileUrl) {
          updateData.entry_inspection_file_url = entryInspectionFileUrl;
        }
      }

      // 안전교육 정보
      if (input.safetyTrainingCompleted) {
        updateData.safety_training_completed_at = new Date().toISOString();
        if (safetyTrainingFileUrl) {
          updateData.safety_training_file_url = safetyTrainingFileUrl;
        }
      }

      // 건강검진 정보
      if (input.healthCheckCompleted) {
        updateData.health_check_completed_at = new Date().toISOString();
        if (healthCheckFileUrl) {
          updateData.health_check_file_url = healthCheckFileUrl;
        }
      }

      const { error } = await supabase
        .from('entry_requests')
        .update(updateData)
        .eq('id', input.id);

      if (error) {
        console.error('[EntryRequests] EP approve error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[EntryRequests] EP approved: ${input.id} by ${ctx.user.name}`);

      // FCM 푸시: Owner와 BP에게 최종 승인 알림
      try {
        const recipientUserIds: string[] = [];

        // Owner에게 알림
        if (request.owner_user_id) {
          recipientUserIds.push(request.owner_user_id);
        }
        // BP 승인자에게 알림
        if (request.bp_approved_user_id && request.bp_approved_user_id !== request.owner_user_id) {
          recipientUserIds.push(request.bp_approved_user_id);
        }

        for (const userId of recipientUserIds) {
          const fcmToken = await db.getUserFcmToken(userId);
          if (fcmToken) {
            await sendFcmNotification(fcmToken, {
              title: "🎉 반입 요청 최종 승인",
              body: `EP(${ctx.user.name})가 반입 요청을 최종 승인했습니다. 반입이 가능합니다.`,
              data: {
                type: "entry_request",
                requestId: input.id,
                action: "approved",
              },
            });
          }
        }
        console.log(`[EntryRequests] FCM 푸시 발송: Owner/BP에게 최종 승인 알림`);
      } catch (fcmError) {
        console.error("[EntryRequests] FCM 푸시 발송 실패:", fcmError);
      }

      return { success: true };
    }),

  /**
   * 반입 요청 취소 (Owner/BP만 가능, 자신이 생성한 요청만)
   */
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 요청 상태 확인
      const { data: request } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('id', input.id)
        .single();

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }

      console.log(`[EntryRequests] Cancel attempt - User: ${ctx.user.name} (${ctx.user.role}), Request status: ${request.status}, Owner: ${request.owner_user_id}, BP Company: ${request.target_bp_company_id}, User Company: ${ctx.user.companyId}`);

      // 권한 확인: Owner는 자신이 생성한 요청만, BP는 자신의 회사로 온 요청만
      if (ctx.user.role === 'owner') {
        if (request.owner_user_id !== ctx.user.id) {
          console.log(`[EntryRequests] Owner cancel forbidden - owner_user_id mismatch`);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "본인이 생성한 요청만 취소할 수 있습니다.",
          });
        }
        // Owner는 bp_approved 상태 이전에만 취소 가능 (BP 승인 전)
        if (request.status !== 'owner_requested' && request.status !== 'bp_reviewing') {
          console.log(`[EntryRequests] Owner cancel forbidden - invalid status: ${request.status}`);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `취소할 수 없는 상태입니다. (현재 상태: ${request.status})`,
          });
        }
      } else if (ctx.user.role === 'bp') {
        if (request.target_bp_company_id !== ctx.user.companyId) {
          console.log(`[EntryRequests] BP cancel forbidden - company mismatch`);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "본인 회사로 온 요청만 취소할 수 있습니다.",
          });
        }
        // BP는 ep_approved 상태 이전에만 취소 가능 (EP 승인 전)
        const bpCancelableStatuses = ['owner_requested', 'bp_reviewing', 'bp_approved'];
        if (!bpCancelableStatuses.includes(request.status)) {
          console.log(`[EntryRequests] BP cancel forbidden - invalid status: ${request.status}`);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `취소할 수 없는 상태입니다. (현재 상태: ${request.status})`,
          });
        }
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "취소 권한이 없습니다.",
        });
      }

      // 상태를 cancelled로 변경
      const { error } = await supabase
        .from('entry_requests')
        .update({
          status: 'cancelled',
          rejected_by: ctx.user.id,
          rejected_at: new Date().toISOString(),
          reject_reason: input.reason || '요청자에 의해 취소됨',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (error) {
        console.error('[EntryRequests] Cancel error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[EntryRequests] Cancelled: ${input.id} by ${ctx.user.name}`);

      return { success: true };
    }),

  /**
   * EP 반려
   */
  epReject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "반려 사유를 입력해주세요."),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'ep' && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { error } = await supabase
        .from('entry_requests')
        .update({
          status: 'rejected',
          rejected_by: ctx.user.id,
          rejected_at: new Date().toISOString(),
          reject_reason: input.reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      console.log(`[EntryRequests] EP rejected: ${input.id} by ${ctx.user.name}`);

      return { success: true };
    }),

  // ============================================================
  // 통계
  // ============================================================

  /**
   * 대시보드 통계
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const supabase = db.getSupabase();
    if (!supabase) return null;

    let query = supabase.from('entry_requests').select('status', { count: 'exact' });

    // 역할별 필터링
    if (ctx.user.role === 'owner') {
      query = query.eq('owner_user_id', ctx.user.id);
    } else if (ctx.user.role === 'bp') {
      query = query.eq('target_bp_company_id', ctx.user.companyId);
    } else if (ctx.user.role === 'ep') {
      query = query.eq('target_ep_company_id', ctx.user.companyId);
    }

    const { data, error } = await query;
    if (error) return null;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((r: any) => r.status === 'owner_requested').length || 0,
      bpApproved: data?.filter((r: any) => r.status === 'bp_approved').length || 0,
      epApproved: data?.filter((r: any) => r.status === 'ep_approved').length || 0,
      rejected: data?.filter((r: any) => r.status === 'rejected').length || 0,
    };

    return stats;
  }),

  /**
   * 서류 검증 (장비 종류별/인력 유형별 필수 서류 기반)
   */
  validateDocuments: protectedProcedure
    .input(
      z.object({
        equipmentIds: z.array(z.string()),
        workerIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ValidationV2] Starting validation...');
      console.log('[ValidationV2] Equipment IDs:', input.equipmentIds);
      console.log('[ValidationV2] Worker IDs:', input.workerIds);

      const supabase = db.getSupabase();
      if (!supabase) {
        console.error('[ValidationV2] Supabase client not available');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // 검증 결과 초기화
      const equipmentResults: any[] = [];
      const workerResults: any[] = [];
      let totalValid = 0;
      let totalInvalid = 0;

      // ============================================================
      // 장비 서류 검증
      // ============================================================
      if (input.equipmentIds.length > 0) {
        // 1. 장비 정보 조회 (equip_type_id 포함)
        const { data: equipmentList, error: equipError } = await supabase
          .from('equipment')
          .select('id, reg_num, equip_type_id')
          .in('id', input.equipmentIds);

        if (equipError) {
          console.error('[Validation] Failed to fetch equipment:', equipError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch equipment data",
          });
        }

        // 2. 각 장비 타입별 필수 서류 조회
        const equipTypeIds = [...new Set(equipmentList?.map((e: any) => e.equip_type_id).filter(Boolean))];
        const { data: requiredDocs, error: docsError } = await supabase
          .from('type_docs')
          .select('*')
          .in('equip_type_id', equipTypeIds);

        if (docsError) {
          console.error('[Validation] Failed to fetch type_docs:', docsError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch required documents",
          });
        }

        // 3. 실제 첨부된 서류 조회
        const { data: uploadedDocs, error: uploadError } = await supabase
          .from('docs_compliance')
          .select('*')
          .in('target_id', input.equipmentIds)
          .eq('target_type', 'equipment');

        if (uploadError) {
          console.error('[Validation] Failed to fetch docs_compliance:', uploadError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch uploaded documents",
          });
        }

        // 4. 각 장비별 검증
        for (const equipment of equipmentList || []) {
          const equipmentDocs = uploadedDocs?.filter(
            (d: any) => d.target_id === equipment.id
          ) || [];

          // 해당 장비 타입의 필수 서류 목록
          const requiredDocsForType = requiredDocs?.filter(
            (d: any) => d.equip_type_id === equipment.equip_type_id && d.is_mandatory
          ) || [];

          const result = {
            id: equipment.id,
            type: 'equipment' as const,
            name: equipment.reg_num || 'Unknown',
            documents: equipmentDocs.map((d: any) => {
              // 임시: 서류가 업로드되어 있으면 자동 승인으로 처리
              // TODO: 나중에 승인 워크플로우 구현 시 아래 로직 활성화
              // const isApproved = !!(d.ep_approved_at || d.bp_approved_at || d.admin_approved_at);
              const isApproved = true; // 서류 존재 = 승인으로 간주
              const isExpired = d.expiry_date && new Date(d.expiry_date) <= new Date();

              return {
                type: d.doc_type,
                status: 'approved', // 항상 승인됨으로 표시
                expiryDate: d.expiry_date,
                isValid: !isExpired, // 만료 여부만 체크
              };
            }),
            isValid: false,
            issues: [] as string[],
          };

          // 필수 서류 체크
          for (const reqDoc of requiredDocsForType) {
            const doc = result.documents.find((d: any) => d.type === reqDoc.doc_name);
            if (!doc) {
              result.issues.push(`${reqDoc.doc_name} 미등록`);
            } else if (!doc.isValid) {
              // 서류가 있으면 자동 승인이므로, 만료 여부만 체크
              if (doc.expiryDate && new Date(doc.expiryDate) <= new Date()) {
                result.issues.push(`${reqDoc.doc_name} 만료`);
              }
            }
          }

          result.isValid = result.issues.length === 0;
          if (result.isValid) totalValid++;
          else totalInvalid++;

          equipmentResults.push(result);
        }
      }

      // ============================================================
      // 인력 서류 검증
      // ============================================================
      if (input.workerIds.length > 0) {
        // 1. 인력 정보 조회 (worker_type_id 포함)
        const { data: workerList, error: workerError } = await supabase
          .from('workers')
          .select('id, name, worker_type_id')
          .in('id', input.workerIds);

        if (workerError) {
          console.error('[Validation] Failed to fetch workers:', workerError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch worker data",
          });
        }

        // 2. 각 인력 유형별 필수 서류 조회
        const workerTypeIds = [...new Set(workerList?.map((w: any) => w.worker_type_id).filter(Boolean))];
        const { data: requiredDocs, error: docsError } = await supabase
          .from('worker_docs')
          .select('*')
          .in('worker_type_id', workerTypeIds);

        if (docsError) {
          console.error('[Validation] Failed to fetch worker_docs:', docsError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch required documents",
          });
        }

        // 3. 실제 첨부된 서류 조회
        const { data: uploadedDocs, error: uploadError } = await supabase
          .from('docs_compliance')
          .select('*')
          .in('target_id', input.workerIds)
          .eq('target_type', 'worker');

        if (uploadError) {
          console.error('[Validation] Failed to fetch docs_compliance:', uploadError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch uploaded documents",
          });
        }

        // 4. 각 인력별 검증
        for (const worker of workerList || []) {
          const workerDocs = uploadedDocs?.filter(
            (d: any) => d.target_id === worker.id
          ) || [];

          // 해당 인력 유형의 필수 서류 목록
          const requiredDocsForType = requiredDocs?.filter(
            (d: any) => d.worker_type_id === worker.worker_type_id && d.is_mandatory
          ) || [];

          const result = {
            id: worker.id,
            type: 'worker' as const,
            name: worker.name || 'Unknown',
            documents: workerDocs.map((d: any) => {
              // 임시: 서류가 업로드되어 있으면 자동 승인으로 처리
              // TODO: 나중에 승인 워크플로우 구현 시 아래 로직 활성화
              // const isApproved = !!(d.ep_approved_at || d.bp_approved_at || d.admin_approved_at);
              const isApproved = true; // 서류 존재 = 승인으로 간주
              const isExpired = d.expiry_date && new Date(d.expiry_date) <= new Date();

              return {
                type: d.doc_type,
                status: 'approved', // 항상 승인됨으로 표시
                expiryDate: d.expiry_date,
                isValid: !isExpired, // 만료 여부만 체크
              };
            }),
            isValid: false,
            issues: [] as string[],
          };

          // 필수 서류 체크
          for (const reqDoc of requiredDocsForType) {
            const doc = result.documents.find((d: any) => d.type === reqDoc.doc_name);
            if (!doc) {
              result.issues.push(`${reqDoc.doc_name} 미등록`);
            } else if (!doc.isValid) {
              // 서류가 있으면 자동 승인이므로, 만료 여부만 체크
              if (doc.expiryDate && new Date(doc.expiryDate) <= new Date()) {
                result.issues.push(`${reqDoc.doc_name} 만료`);
              }
            }
          }

          result.isValid = result.issues.length === 0;
          if (result.isValid) totalValid++;
          else totalInvalid++;

          workerResults.push(result);
        }
      }

      // 프론트엔드 호환성을 위해 equipment와 workers를 items로 합침
      const allItems = [
        ...equipmentResults.map(item => ({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          isValid: item.isValid,
          issues: item.issues,
          documents: item.documents,
        })),
        ...workerResults.map(item => ({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          isValid: item.isValid,
          issues: item.issues,
          documents: item.documents,
        })),
      ];

      return {
        isValid: totalInvalid === 0,
        summary: {
          totalItems: totalValid + totalInvalid,
          validItems: totalValid,
          invalidItems: totalInvalid,
        },
        items: allItems,  // 프론트엔드가 기대하는 필드명
        equipment: equipmentResults,  // 하위 호환성 유지
        workers: workerResults,        // 하위 호환성 유지
      };
    }),

  /**
   * 장비의 승인된 작업계획서 조회 (안전점검원용)
   */
  getWorkPlanByEquipment: protectedProcedure
    .input(z.object({
      equipmentId: z.string(),
    }))
    .query(async ({ input }) => {
      const supabase = db.getSupabase();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // 이 장비가 포함된 entry_request_items 찾기
      const { data: items, error: itemsError } = await supabase
        .from('entry_request_items')
        .select('entry_request_id')
        .eq('item_id', input.equipmentId)
        .eq('item_type', 'equipment');

      if (itemsError || !items || items.length === 0) {
        return null;
      }

      const entryRequestIds = items.map((item: any) => item.entry_request_id);

      // 이 중 승인된(bp_approved 또는 ep_approved) 요청 찾기
      const { data: approvedRequests, error: requestsError } = await supabase
        .from('entry_requests')
        .select('id, bp_work_plan_url, status, request_number, created_at')
        .in('id', entryRequestIds)
        .in('status', ['bp_approved', 'ep_approved'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (requestsError || !approvedRequests || approvedRequests.length === 0) {
        return null;
      }

      const request = approvedRequests[0];

      return {
        id: request.id,
        requestNumber: request.request_number,
        status: request.status,
        workPlanUrl: request.bp_work_plan_url,
        hasWorkPlan: !!request.bp_work_plan_url,
      };
    }),

  /**
   * 반입 요청 삭제 (테스트 데이터 삭제용)
   * - Admin 또는 요청 생성자만 삭제 가능
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 요청 정보 조회
      const { data: request } = await supabase
        .from('entry_requests')
        .select('*')
        .eq('id', input.id)
        .single();

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }

      // 권한 확인: Admin 또는 요청 생성자만 삭제 가능
      const isAdmin = ctx.user.role?.toLowerCase() === 'admin';
      const isOwner = request.owner_user_id === ctx.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "삭제 권한이 없습니다.",
        });
      }

      console.log(`[EntryRequests] Delete attempt - User: ${ctx.user.name} (${ctx.user.role}), Request: ${input.id}, Status: ${request.status}`);

      // 관련된 entry_request_items 먼저 삭제
      const { error: itemsError } = await supabase
        .from('entry_request_items')
        .delete()
        .eq('entry_request_id', input.id);

      if (itemsError) {
        console.error('[EntryRequests] Delete items error:', itemsError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "항목 삭제 중 오류가 발생했습니다.",
        });
      }

      // 반입 요청 삭제
      const { error } = await supabase
        .from('entry_requests')
        .delete()
        .eq('id', input.id);

      if (error) {
        console.error('[EntryRequests] Delete error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "삭제 중 오류가 발생했습니다.",
        });
      }

      console.log(`[EntryRequests] Deleted: ${input.id} by ${ctx.user.name}`);

      return { success: true };
    }),
});

