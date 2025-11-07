import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { nanoid } from "nanoid";

/**
 * Location 라우터
 * 운전자/장비 위치 추적
 */
export const locationRouter = router({
  /**
   * 위치 기록 (Worker 앱에서 호출)
   */
  log: publicProcedure
    .input(
      z.object({
        workerId: z.string(),
        equipmentId: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = `location-${nanoid()}`;

      await db.createLocationLog({
        id,
        workerId: input.workerId,
        equipmentId: input.equipmentId,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        accuracy: input.accuracy?.toString(),
        loggedAt: new Date(),
      });

      console.log(`[Location] Logged: Worker ${input.workerId} at (${input.latitude}, ${input.longitude})`);

      return { success: true };
    }),

  /**
   * 최신 위치 조회 (Worker ID)
   */
  getLatest: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await db.getLatestLocationByWorker(input.workerId);
    }),

  /**
   * 최신 위치 조회 (Equipment ID)
   */
  getLatestByEquipment: protectedProcedure
    .input(
      z.object({
        equipmentId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await db.getLatestLocationByEquipment(input.equipmentId);
    }),

  /**
   * 위치 이력 조회
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await db.getLocationHistory(
        input.workerId,
        input.startDate,
        input.endDate
      );
    }),

  /**
   * 모든 활성 위치 조회 (실시간 지도용)
   * 권한별 필터링 지원
   */
  getAllActive: protectedProcedure
    .input(
      z.object({
        ownerCompanyId: z.string().optional(),
        bpCompanyId: z.string().optional(),
        epCompanyId: z.string().optional(),
        equipmentId: z.string().optional(),
        vehicleNumber: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // 사용자 정보에서 role과 companyId 가져오기
      const userRole = ctx.user?.role?.toLowerCase();
      const userCompanyId = ctx.user?.companyId ?? undefined;

      return await db.getAllActiveLocations({
        ...input,
        userRole,
        userCompanyId,
      });
    }),
});
