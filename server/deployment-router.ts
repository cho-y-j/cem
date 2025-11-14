import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";

/**
 * 투입 관리 API
 * Owner가 장비+운전자를 현장에 투입하고 관리
 */
export const deploymentRouter = router({
  /**
   * 투입 목록 조회
   */
  list: protectedProcedure
    .input(
      z.object({
        ownerId: z.string().optional(),
        bpCompanyId: z.string().optional(),
        epCompanyId: z.string().optional(),
        equipmentId: z.string().optional(),
        workerId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const role = ctx.user.role?.toLowerCase();
      const filters: any = { ...input };

      // 역할별 자동 필터링
      if (role === "bp" && ctx.user.companyId) {
        filters.bpCompanyId = filters.bpCompanyId || ctx.user.companyId;
      } else if (role === "ep" && ctx.user.companyId) {
        filters.epCompanyId = filters.epCompanyId || ctx.user.companyId;
      } else if (role === "owner") {
        filters.ownerId = filters.ownerId || ctx.user.id;
      }

      const deployments = await db.getDeployments(filters);
      return deployments;
    }),

  /**
   * Worker 자신의 active 투입 목록 조회 (작업확인서용)
   * users.id -> workers.user_id -> deployments.worker_id
   */
  myActiveDeployments: protectedProcedure.query(async ({ ctx }) => {
    const deployments = await db.getDeploymentsByUserId(ctx.user.id, {
      status: "active",
    });
    return deployments;
  }),

  /**
   * 투입 상세 조회
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const deployment = await db.getDeploymentById(input.id);
      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "투입 정보를 찾을 수 없습니다.",
        });
      }
      return deployment;
    }),

  /**
   * 투입 생성 (Owner)
   */
  create: protectedProcedure
    .input(
      z.object({
        entryRequestId: z.string(), // 필수로 유지 (DB 제약 조건)
        equipmentId: z.string(),
        workerId: z.string(),
        bpCompanyId: z.string(),
        epCompanyId: z.string().optional(),
        workZoneId: z.string().optional(), // 작업 구역 ID (현장명 + GPS 구역)
        startDate: z.date(),
        plannedEndDate: z.date(),
        // 작업확인서용 추가 정보
        siteName: z.string().optional(),
        workType: z.enum(["daily", "monthly"]).optional(),
        dailyRate: z.number().optional(),
        monthlyRate: z.number().optional(),
        otRate: z.number().optional(),
        nightRate: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log('[Deployment] Creating deployment:', {
        entryRequestId: input.entryRequestId,
        equipmentId: input.equipmentId,
        workerId: input.workerId,
        bpCompanyId: input.bpCompanyId,
        ownerId: ctx.user.id,
      });

      // Entry Request에서 EP 회사 ID 가져오기
      const entryRequest = await db.getEntryRequestById(input.entryRequestId);
      if (!entryRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "반입 요청을 찾을 수 없습니다.",
        });
      }

      // epCompanyId가 없으면 entry_request에서 가져오기
      const epCompanyId = input.epCompanyId || entryRequest.targetEpCompanyId || undefined;

      const id = nanoid();

      await db.createDeployment({
        id,
        entryRequestId: input.entryRequestId,
        equipmentId: input.equipmentId,
        workerId: input.workerId,
        ownerId: ctx.user.id,
        bpCompanyId: input.bpCompanyId,
        epCompanyId: epCompanyId,
        workZoneId: input.workZoneId, // 작업 구역 추가
        startDate: input.startDate,
        plannedEndDate: input.plannedEndDate,
        status: "pending_bp", // BP 승인 대기 (pending에서 pending_bp로 변경)
        // 작업확인서용 추가 정보
        siteName: input.siteName,
        workType: input.workType,
        dailyRate: input.dailyRate,
        monthlyRate: input.monthlyRate,
        otRate: input.otRate,
        nightRate: input.nightRate,
      });

      console.log('[Deployment] Deployment created with status pending_bp:', id);
      return { id };
    }),

  /**
   * 투입 기간 연장
   */
  extend: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        newEndDate: z.date(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.extendDeployment(
        input.deploymentId,
        input.newEndDate,
        input.reason,
        ctx.user.id
      );

      return { success: true };
    }),

  /**
   * 운전자 교체
   */
  changeWorker: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        newWorkerId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.changeDeploymentWorker(
        input.deploymentId,
        input.newWorkerId,
        input.reason,
        ctx.user.id
      );

      return { success: true };
    }),

  /**
   * 투입 종료
   */
  complete: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        actualEndDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.completeDeployment(input.deploymentId, input.actualEndDate);

      return { success: true };
    }),

  /**
   * Worker의 현재 투입 정보 조회
   */
  getMyDeployment: protectedProcedure.query(async ({ ctx }) => {
    const deployments = await db.getDeploymentsByUserId(ctx.user.id, {
      status: "active",
    });
    return deployments.length > 0 ? deployments[0] : undefined;
  }),

  /**
   * 유도원 추가/교체 (BP 전용)
   */
  addGuideWorker: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        guideWorkerId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // BP 권한 확인
      if (ctx.user.role !== 'bp' && ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "유도원 추가 권한이 없습니다.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Deployment 확인
      const { data: deployment } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', input.deploymentId)
        .single();

      if (!deployment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // BP 권한 확인 (자신의 회사 deployment만)
      if (ctx.user.role === 'bp' && deployment.bp_company_id !== ctx.user.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "해당 투입에 유도원을 추가할 권한이 없습니다.",
        });
      }

      // 유도원 추가/교체
      const { error } = await supabase
        .from('deployments')
        .update({
          guide_worker_id: input.guideWorkerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.deploymentId);

      if (error) {
        console.error('[Deployment] Add guide worker error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[Deployment] Guide worker added: ${input.guideWorkerId} to deployment ${input.deploymentId}`);
      return { success: true };
    }),

  /**
   * BP 투입 승인 (pending_bp → active)
   * BP가 단가 확인 후 유도원 추가와 함께 승인
   */
  approvePending: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        guideWorkerId: z.string().optional(), // 유도원 추가 (선택)
        workZoneId: z.string().optional(), // 작업 구역 ID (현장명 + GPS 구역)
        // 단가 정보 (BP가 확인/수정 가능)
        workType: z.enum(["daily", "monthly"]).optional(),
        dailyRate: z.number().optional(),
        monthlyRate: z.number().optional(),
        otRate: z.number().optional(),
        nightRate: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // BP 권한 확인
      if (ctx.user.role !== 'bp' && ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "투입 승인 권한이 없습니다.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Deployment 확인
      const { data: deployment } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', input.deploymentId)
        .single();

      if (!deployment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "투입 정보를 찾을 수 없습니다." });
      }

      // 이미 승인된 경우 에러
      if (deployment.status !== 'pending_bp') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `이미 승인되었거나 승인 대기 상태가 아닙니다. (현재 상태: ${deployment.status})`,
        });
      }

      // BP 권한 확인 (자신의 회사 deployment만)
      if (ctx.user.role === 'bp' && deployment.bp_company_id !== ctx.user.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "해당 투입을 승인할 권한이 없습니다.",
        });
      }

      // 투입 승인 (상태를 active로 변경, 유도원/작업구역/단가 추가 가능)
      const updateData: any = {
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      if (input.guideWorkerId) {
        updateData.guide_worker_id = input.guideWorkerId;
      }

      if (input.workZoneId) {
        updateData.work_zone_id = input.workZoneId;
      }

      // 단가 정보 업데이트 (BP가 확인/수정)
      if (input.workType) updateData.work_type = input.workType;
      if (input.dailyRate !== undefined) updateData.daily_rate = input.dailyRate;
      if (input.monthlyRate !== undefined) updateData.monthly_rate = input.monthlyRate;
      if (input.otRate !== undefined) updateData.ot_rate = input.otRate;
      if (input.nightRate !== undefined) updateData.night_rate = input.nightRate;

      const { error } = await supabase
        .from('deployments')
        .update(updateData)
        .eq('id', input.deploymentId);

      if (error) {
        console.error('[Deployment] Approve pending error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // BP 승인 시 차량 배정 완료: 장비에 운전자 배정
      if (deployment.equipment_id && deployment.worker_id) {
        const { error: assignError } = await supabase
          .from('equipment')
          .update({
            assigned_worker_id: deployment.worker_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deployment.equipment_id);

        if (assignError) {
          console.error('[Deployment] Assign driver error:', assignError);
          // 차량 배정 실패해도 투입 승인은 완료 (경고만)
          console.warn(`[Deployment] ⚠️ 차량 배정 실패했지만 투입 승인은 완료: ${deployment.equipment_id} -> ${deployment.worker_id}`);
        } else {
          console.log(`[Deployment] ✅ 차량 배정 완료: 장비 ${deployment.equipment_id}에 운전자 ${deployment.worker_id} 배정`);
        }
      }

      console.log(`[Deployment] Deployment approved: ${input.deploymentId} by BP ${ctx.user.id}`);
      return { success: true };
    }),

  /**
   * 안전점검원 지정 (EP 전용)
   */
  assignInspector: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        inspectorId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // EP 권한 확인
      if (ctx.user.role !== 'ep' && ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "안전점검원 지정 권한이 없습니다.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Deployment 확인
      const { data: deployment } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', input.deploymentId)
        .single();

      if (!deployment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // EP 권한 확인 (자신의 회사 deployment만)
      if (ctx.user.role === 'ep' && deployment.ep_company_id !== ctx.user.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "해당 투입에 안전점검원을 지정할 권한이 없습니다.",
        });
      }

      // 안전점검원 지정
      const { error } = await supabase
        .from('deployments')
        .update({
          inspector_id: input.inspectorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.deploymentId);

      if (error) {
        console.error('[Deployment] Assign inspector error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[Deployment] Inspector assigned: ${input.inspectorId} to deployment ${input.deploymentId}`);
      return { success: true };
    }),

  /**
   * EP가 고용한 Inspector 목록 조회
   */
  listInspectors: protectedProcedure.query(async ({ ctx }) => {
    // EP 권한 확인
    if (ctx.user.role !== 'ep' && ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Inspector 목록 조회 권한이 없습니다.",
      });
    }

    const supabase = db.getSupabase();
    if (!supabase) return [];

    // Inspector 인력 유형 찾기
    const { data: inspectorType } = await supabase
      .from('worker_types')
      .select('id')
      .eq('name', '안전점검원')
      .single();

    if (!inspectorType) {
      return [];
    }

    // EP가 고용한 Inspector 목록 조회
    let userIds: string[] | null = null;

    // EP 역할인 경우 자신의 회사 Inspector만 필터링
    if (ctx.user.role === 'ep' && ctx.user.companyId) {
      // 1. EP 회사의 users 조회
      const { data: epUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', ctx.user.companyId);

      if (usersError) {
        console.error('[Deployment] Error getting EP users:', usersError);
        return [];
      }

      if (!epUsers || epUsers.length === 0) {
        return [];
      }

      userIds = epUsers.map((u: any) => u.id);
    }

    // 2. Inspector 인력 조회
    let query = supabase
      .from('workers')
      .select(`
        *,
        worker_type:worker_types!workers_worker_type_id_fkey(id, name)
      `)
      .eq('worker_type_id', inspectorType.id);

    // EP 역할인 경우 해당 회사의 user_id만 필터링
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Deployment] List inspectors error:', error);
      return [];
    }

    return data || [];
  }),

  /**
   * BP 승인 대기 중인 투입 목록 조회 (status = 'pending_bp')
   */
  getPendingApprovals: protectedProcedure.query(async ({ ctx }) => {
    // BP 권한 확인
    if (ctx.user.role !== 'bp' && ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "승인 대기 목록 조회 권한이 없습니다.",
      });
    }

    const filters: any = {
      status: 'pending_bp',
    };

    // BP인 경우 자신의 회사 deployment만
    if (ctx.user.role === 'bp' && ctx.user.companyId) {
      filters.bpCompanyId = ctx.user.companyId;
    }

    const deployments = await db.getDeployments(filters);
    return deployments;
  }),

  /**
   * BP 투입 거부 (pending_bp → rejected)
   */
  rejectPending: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
        reason: z.string().optional(), // 거부 사유
      })
    )
    .mutation(async ({ input, ctx }) => {
      // BP 권한 확인
      if (ctx.user.role !== 'bp' && ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "투입 거부 권한이 없습니다.",
        });
      }

      const supabase = db.getSupabase();
      if (!supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Deployment 확인
      const { data: deployment } = await supabase
        .from('deployments')
        .select('*')
        .eq('id', input.deploymentId)
        .single();

      if (!deployment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "투입 정보를 찾을 수 없습니다." });
      }

      // 거부 가능한 상태 확인
      if (deployment.status !== 'pending_bp') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `거부할 수 없는 상태입니다. (현재 상태: ${deployment.status})`,
        });
      }

      // BP 권한 확인 (자신의 회사 deployment만)
      if (ctx.user.role === 'bp' && deployment.bp_company_id !== ctx.user.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "해당 투입을 거부할 권한이 없습니다.",
        });
      }

      // 상태를 completed로 변경 (거부된 투입은 종료 처리)
      // 또는 별도의 'rejected' 상태가 필요하면 enum에 추가 필요
      const { error } = await supabase
        .from('deployments')
        .update({
          status: 'completed',
          actual_end_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.deploymentId);

      if (error) {
        console.error('[Deployment] Reject pending error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[Deployment] Deployment rejected: ${input.deploymentId} by BP ${ctx.user.id}${input.reason ? `, reason: ${input.reason}` : ''}`);
      return { success: true };
    }),
});
