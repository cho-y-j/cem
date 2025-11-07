/**
 * 개선된 반입 요청 라우터
 * - 장비/인력 다중 선택 지원
 * - 서류 자동 검증
 * - 3단계 승인 워크플로우 (BP → Owner → EP)
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { validateEntryRequest } from "./document-validation";

export const entryRequestsRouter = router({
  // ============================================================
  // 조회
  // ============================================================
  
  /**
   * 반입 요청 목록 조회 (상세 정보 포함)
   */
  list: protectedProcedure.query(async () => {
    const requests = await db.getAllEntryRequests();
    
    // 각 요청에 대해 아이템 개수 및 BP 정보 추가
    const requestsWithDetails = await Promise.all(
      requests.map(async (request: any) => {
        const items = await db.getEntryRequestItems(request.id);
        const bpUser = request.bp_user_id ? await db.getUserById(request.bp_user_id) : null;
        
        const equipmentCount = items.filter((i: any) => i.item_type === 'equipment').length;
        const workerCount = items.filter((i: any) => i.item_type === 'worker').length;
        
        return {
          ...request,
          equipmentCount,
          workerCount,
          bpCompanyName: bpUser?.company_name || null,
          bpUserName: bpUser?.name || null,
        };
      })
    );
    
    return requestsWithDetails;
  }),

  /**
   * 반입 요청 상세 조회 (아이템 포함)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const request = await db.getEntryRequestById(input.id);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }
      
      const items = await db.getEntryRequestItems(input.id);
      
      return {
        ...request,
        items,
      };
    }),

  // ============================================================
  // 서류 검증
  // ============================================================
  
  /**
   * 반입 요청 전 서류 검증
   */
  validateDocuments: protectedProcedure
    .input(
      z.object({
        equipmentIds: z.array(z.string()).optional().default([]),
        workerIds: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ input }) => {
      if (input.equipmentIds.length === 0 && input.workerIds.length === 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "장비 또는 인력을 최소 1개 이상 선택해야 합니다." 
        });
      }
      
      const validationResult = await validateEntryRequest(
        input.equipmentIds,
        input.workerIds
      );
      
      return validationResult;
    }),

  // ============================================================
  // 반입 요청 생성 (BP)
  // ============================================================
  
  /**
   * 반입 요청 생성 (다중 장비/인력 지원)
   */
  create: protectedProcedure
    .input(
      z.object({
        equipmentIds: z.array(z.string()).optional().default([]),
        workerIds: z.array(z.string()).optional().default([]),
        equipmentWorkerPairs: z.record(z.string()).optional().default({}), // equipmentId -> workerId
        purpose: z.string().optional(),
        requestedStartDate: z.string().optional(),
        requestedEndDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 권한 확인 (대소문자 무시)
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "bp" && userRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "협력사 권한이 필요합니다." });
      }
      
      // 최소 1개 이상 선택 확인
      if (input.equipmentIds.length === 0 && input.workerIds.length === 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "장비 또는 인력을 최소 1개 이상 선택해야 합니다." 
        });
      }
      
      // 서류 검증
      const validationResult = await validateEntryRequest(
        input.equipmentIds,
        input.workerIds
      );
      
      // 서류 검증 실패 시 에러
      if (!validationResult.isValid) {
        const issues = validationResult.items
          .flatMap(item => item.issues)
          .join(', ');
        
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `서류 검증 실패: ${issues}` 
        });
      }
      
      // 반입 요청 생성
      const id = nanoid();
      const requestNumber = `REQ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${nanoid(6)}`;
      
      await db.createEntryRequest({
        id,
        requestNumber,
        bpCompanyId: ctx.user.companyId || "",
        bpUserId: ctx.user.id,
        purpose: input.purpose,
        requestedStartDate: input.requestedStartDate ? new Date(input.requestedStartDate) : undefined,
        requestedEndDate: input.requestedEndDate ? new Date(input.requestedEndDate) : undefined,
        status: "bp_requested",
        documentsVerifiedAt: new Date(),
        documentsVerificationResult: validationResult,
      });
      
      // 반입 요청 아이템 생성
      const items = [
        ...input.equipmentIds.map(equipmentId => {
          const itemValidation = validationResult.items.find(
            item => item.itemId === equipmentId && item.itemType === 'equipment'
          );
          
          // 페어링된 운전자 ID 가져오기
          const pairedWorkerId = input.equipmentWorkerPairs?.[equipmentId] || null;
          
          return {
            id: nanoid(),
            entryRequestId: id,
            itemType: 'equipment' as const,
            itemId: equipmentId,
            pairedWorkerId, // 페어링 정보 추가
            documentStatus: itemValidation?.overallStatus || 'pending' as const,
            documentIssues: itemValidation ? {
              documents: itemValidation.documents,
              issues: itemValidation.issues,
            } : null,
          };
        }),
        ...input.workerIds.map(workerId => {
          const itemValidation = validationResult.items.find(
            item => item.itemId === workerId && item.itemType === 'worker'
          );
          
          return {
            id: nanoid(),
            entryRequestId: id,
            itemType: 'worker' as const,
            itemId: workerId,
            documentStatus: itemValidation?.overallStatus || 'pending' as const,
            documentIssues: itemValidation ? {
              documents: itemValidation.documents,
              issues: itemValidation.issues,
            } : null,
          };
        }),
      ];
      
      await db.createEntryRequestItems(items);
      
      return { 
        id, 
        requestNumber,
        validationResult 
      };
    }),

  // ============================================================
  // 임시 저장 (BP)
  // ============================================================
  
  /**
   * 반입 요청 임시 저장 (서류 검증 없이 저장)
   */
  saveDraft: protectedProcedure
    .input(
      z.object({
        equipmentIds: z.array(z.string()).optional().default([]),
        workerIds: z.array(z.string()).optional().default([]),
        purpose: z.string().optional(),
        requestedStartDate: z.string().optional(),
        requestedEndDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 권한 확인 (대소문자 무시)
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "bp" && userRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "협력사 권한이 필요합니다." });
      }
      
      const id = nanoid();
      const requestNumber = `DRAFT-${Date.now()}`;
      
      await db.createEntryRequest({
        id,
        requestNumber,
        bpCompanyId: ctx.user.companyId || "",
        bpUserId: ctx.user.id,
        purpose: input.purpose,
        requestedStartDate: input.requestedStartDate ? new Date(input.requestedStartDate) : undefined,
        requestedEndDate: input.requestedEndDate ? new Date(input.requestedEndDate) : undefined,
        status: "bp_draft",
      });
      
      // 아이템 저장
      if (input.equipmentIds.length > 0 || input.workerIds.length > 0) {
        const items = [
          ...input.equipmentIds.map(equipmentId => ({
            id: nanoid(),
            entryRequestId: id,
            itemType: 'equipment' as const,
            itemId: equipmentId,
            documentStatus: 'pending' as const,
          })),
          ...input.workerIds.map(workerId => ({
            id: nanoid(),
            entryRequestId: id,
            itemType: 'worker' as const,
            itemId: workerId,
            documentStatus: 'pending' as const,
          })),
        ];
        
        await db.createEntryRequestItems(items);
      }
      
      return { id, requestNumber };
    }),

  // ============================================================
  // Owner 승인
  // ============================================================
  
  /**
   * Owner 승인 (작업계획서 첨부)
   */
  ownerApprove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        workPlanFileUrl: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 권한 확인 (대소문자 무시)
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "owner" && userRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "장비 운영사 권한이 필요합니다." });
      }
      
      // 반입 요청 조회
      const request = await db.getEntryRequestById(input.id);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }
      
      // 상태 확인
      if (request.status !== "bp_requested") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "승인할 수 없는 상태입니다." 
        });
      }
      
      // 승인 처리
      await db.updateEntryRequest(input.id, {
        status: "owner_approved",
        ownerApprovedAt: new Date(),
        ownerApprovedBy: ctx.user.id,
        ownerComment: input.comment,
        workPlanFileUrl: input.workPlanFileUrl,
      });
      
      return { success: true };
    }),

  // ============================================================
  // EP 최종 승인
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
      // 권한 확인 (대소문자 무시)
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "ep" && userRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "시행사 권한이 필요합니다." });
      }
      
      // 반입 요청 조회
      const request = await db.getEntryRequestById(input.id);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }
      
      // 상태 확인
      if (request.status !== "owner_approved") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "승인할 수 없는 상태입니다." 
        });
      }
      
      // 최종 승인 처리
      await db.updateEntryRequest(input.id, {
        status: "ep_approved",
        epApprovedAt: new Date(),
        epApprovedBy: ctx.user.id,
        epComment: input.comment,
      });
      
      // 차량-인력 자동 매칭
      const items = await db.getEntryRequestItems(input.id);
      
      // paired_worker_id가 있는 장비 항목 처리
      for (const item of items) {
        if (item.itemType === 'equipment' && item.pairedWorkerId) {
          // 장비에 운전자 배정
          await db.updateEquipment(item.itemId, {
            assignedWorkerId: item.pairedWorkerId,
          });
          console.log(`[EntryRequest] 장비 ${item.itemId}에 운전자 ${item.pairedWorkerId} 배정`);
        }
      }
      
      return { success: true };
    }),

  // ============================================================
  // 반려
  // ============================================================
  
  /**
   * 반입 요청 반려
   */
  reject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 반입 요청 조회
      const request = await db.getEntryRequestById(input.id);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "반입 요청을 찾을 수 없습니다." });
      }
      
      // 반려 처리
      await db.updateEntryRequest(input.id, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: ctx.user.id,
        rejectReason: input.reason,
      });
      
      return { success: true };
    }),
});

