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
      try {
        // 좌표 유효성 검사
        if (
          isNaN(input.latitude) ||
          isNaN(input.longitude) ||
          input.latitude < -90 ||
          input.latitude > 90 ||
          input.longitude < -180 ||
          input.longitude > 180
        ) {
          throw new Error("유효하지 않은 GPS 좌표입니다.");
        }

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
      } catch (error: any) {
        console.error('[Location] 위치 기록 실패:', error);
        throw error;
      }
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
   * 위치 이력 분석 (이동 거리, 체류 시간 등)
   */
  analyzeHistory: protectedProcedure
    .input(
      z.object({
        workerId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      // 권한 확인: 본인 또는 Admin/EP/BP/Owner만 조회 가능
      const userRole = ctx.user?.role?.toLowerCase();
      const isAdmin = userRole === 'admin';
      const isEp = userRole === 'ep';
      const isBp = userRole === 'bp';
      const isOwner = userRole === 'owner';
      
      // Worker는 본인 것만 조회 가능
      if (userRole === 'worker' && ctx.user.id !== input.workerId) {
        throw new Error('본인의 위치 이력만 조회할 수 있습니다.');
      }

      return await db.analyzeLocationHistory(
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
        equipmentTypeId: z.string().optional(),
        workerId: z.string().optional(),
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
