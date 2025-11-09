import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * GPS 전송 간격 조회
   */
  getGpsInterval: publicProcedure.query(async () => {
    const interval = await db.getGpsTrackingInterval();
    return { intervalMinutes: interval };
  }),

  /**
   * GPS 전송 간격 설정 (Admin/EP만 가능)
   */
  setGpsInterval: protectedProcedure
    .input(
      z.object({
        intervalMinutes: z.number().min(1).max(60), // 1분 ~ 60분
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userRole = ctx.user?.role?.toLowerCase();
      
      // Admin 또는 EP만 설정 가능
      if (userRole !== "admin" && userRole !== "ep") {
        throw new Error("GPS 전송 간격 설정은 관리자 또는 시행사만 가능합니다.");
      }

      await db.setSystemSetting(
        'gps_tracking_interval_minutes',
        input.intervalMinutes.toString(),
        'GPS 위치 추적 전송 간격 (분)',
        ctx.user.id
      );

      return { success: true };
    }),
});
