import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

/**
 * Emergency 라우터
 * 긴급 상황 알림 및 관리
 */
export const emergencyRouter = router({
  /**
   * 긴급 알림 생성 (Worker 앱에서 호출)
   */
  create: publicProcedure
    .input(
      z.object({
        workerId: z.string(),
        equipmentId: z.string().optional(),
        alertType: z.string().default("emergency"),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = `emergency-${nanoid()}`;

      await db.createEmergencyAlert({
        id,
        workerId: input.workerId,
        equipmentId: input.equipmentId,
        alertType: input.alertType,
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
        description: input.description,
        status: "active",
      });

      console.log(`[Emergency] ALERT: Worker ${input.workerId} - ${input.alertType}`);

      // TODO: 실시간 알림 전송 (WebSocket, Push Notification 등)

      return { id, success: true };
    }),

  /**
   * 긴급 알림 목록 조회
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "resolved", "false_alarm"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await db.getEmergencyAlerts(input?.status);
    }),

  /**
   * 긴급 알림 해결
   */
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resolutionNote: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.resolveEmergencyAlert(
        input.id,
        ctx.user.id,
        input.resolutionNote
      );

      console.log(`[Emergency] Resolved: ${input.id} by ${ctx.user.name}`);

      return { success: true };
    }),

  /**
   * 긴급 알림 상세 조회
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const alerts = await db.getEmergencyAlerts();
      const alert = alerts.find((a: any) => a.id === input.id);

      if (!alert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "긴급 알림을 찾을 수 없습니다.",
        });
      }

      return alert;
    }),
});

