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
      console.log('[EntryRequestsV2] Filtering by target_bp_company_id:', user.companyId);
      query = query.eq('target_bp_company_id', user.companyId);
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

        // BP 회사명
        let bpCompanyName = '-';
        if (request.target_bp_company_id) {
          const { data: bpCompany } = await supabase
            .from('companies')
            .select('name')
            .eq('id', request.target_bp_company_id)
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
      const supabase = db.getSupabase();
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
            const { data: equip } = await supabase
              .from('equipment')
              .select('id, reg_num, equip_type_id, specification, model, manufacturer')
              .eq('id', item.item_id)
              .single();

            if (equip) {
              // 장비 타입 정보
              const { data: equipType } = await supabase
                .from('equip_types')
                .select('name, description')
                .eq('id', equip.equip_type_id)
                .single();

              itemDetails = {
                itemType: 'equipment',
                itemId: equip.id,
                itemName: equip.reg_num,
                equipmentRegNum: equip.reg_num,
                equipTypeName: equipType?.name || '-',
                equipTypeDescription: equipType?.description || '',
                specification: equip.specification || '',
                model: equip.model || '',
                manufacturer: equip.manufacturer || '',
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
            }
          } else if (item.item_type === 'worker' && item.item_id) {
            // 인력 정보
            const { data: worker } = await supabase
              .from('workers')
              .select('id, name, worker_type_id, license_num, phone, email')
              .eq('id', item.item_id)
              .single();

            if (worker) {
              // 인력 타입 정보
              const { data: workerType } = await supabase
                .from('worker_types')
                .select('name, description')
                .eq('id', worker.worker_type_id)
                .single();

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

      return {
        ...request,
        items: enrichedItems,
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
      const initialStatus = isBpRequest ? 'bp_requested' : 'owner_requested';

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

      if (request.status !== 'bp_approved') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "승인할 수 없는 상태입니다.",
        });
      }

      // EP 최종 승인
      const { error } = await supabase
        .from('entry_requests')
        .update({
          status: 'ep_approved',
          ep_approved_user_id: ctx.user.id,
          ep_approved_at: new Date().toISOString(),
          ep_comment: input.comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (error) {
        console.error('[EntryRequests] EP approve error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[EntryRequests] EP approved: ${input.id} by ${ctx.user.name}`);

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
});

