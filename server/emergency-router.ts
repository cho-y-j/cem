import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { sendFcmNotifications } from "./_core/fcm";

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

      // FCM 푸시 알림 발송 (관리자, Owner, BP, EP에게)
      try {
        // Worker 정보 조회
        const worker = await db.getWorkerById(input.workerId);
        const workerName = worker?.name || "알 수 없음";

        // 긴급 알림 유형 한글화
        const alertTypeKorean: Record<string, string> = {
          emergency: "🚨 긴급 상황",
          accident: "⚠️ 사고 발생",
          injury: "🩹 부상 발생",
          equipment_failure: "🔧 장비 고장",
          weather: "🌧️ 기상 악화",
          other: "📢 기타 알림",
        };
        const alertTitle = alertTypeKorean[input.alertType] || "🚨 긴급 알림";

        // 관리자 역할들에게 FCM 토큰 조회
        const recipients = await db.getUsersFcmTokensByRoles(["admin", "owner", "bp", "ep"]);

        if (recipients.length > 0) {
          const result = await sendFcmNotifications(
            recipients.map((r) => ({ userId: r.userId, fcmToken: r.fcmToken })),
            {
              title: alertTitle,
              body: `${workerName}님이 긴급 상황을 신고했습니다.\n${input.description || "상세 내용 없음"}`,
              data: {
                type: "emergency",
                alertId: id,
                alertType: input.alertType,
                workerId: input.workerId,
              },
            }
          );
          console.log(`[Emergency] FCM 푸시 발송 완료: 성공 ${result.success}건, 실패 ${result.failed}건`);
        } else {
          console.log("[Emergency] FCM 토큰이 등록된 관리자가 없습니다.");
        }
      } catch (fcmError) {
        console.error("[Emergency] FCM 푸시 발송 실패:", fcmError);
        // 푸시 실패해도 긴급 알림 자체는 성공 처리
      }

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

