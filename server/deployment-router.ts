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
        workerId: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const deployments = await db.getDeployments(input);
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

      const id = nanoid();

      await db.createDeployment({
        id,
        entryRequestId: input.entryRequestId,
        equipmentId: input.equipmentId,
        workerId: input.workerId,
        ownerId: ctx.user.id,
        bpCompanyId: input.bpCompanyId,
        epCompanyId: input.epCompanyId,
        startDate: input.startDate,
        plannedEndDate: input.plannedEndDate,
        status: "active",
        // 작업확인서용 추가 정보
        siteName: input.siteName,
        workType: input.workType,
        dailyRate: input.dailyRate,
        monthlyRate: input.monthlyRate,
        otRate: input.otRate,
        nightRate: input.nightRate,
      });

      console.log('[Deployment] Deployment created successfully:', id);
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
});
