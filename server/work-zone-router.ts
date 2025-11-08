import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";

/**
 * 작업 구역 관리 API
 * EP/Admin이 Google Maps로 작업 구역을 설정
 * Worker 출근 시 GPS로 구역 내 여부 확인
 */
export const workZoneRouter = router({
  /**
   * 작업 구역 생성 (Admin/EP만 가능)
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "구역 이름을 입력하세요"),
        description: z.string().optional(),
        centerLat: z.number().min(-90).max(90, "위도는 -90 ~ 90 사이여야 합니다"),
        centerLng: z.number().min(-180).max(180, "경도는 -180 ~ 180 사이여야 합니다"),
        radiusMeters: z.number().min(10).max(10000, "반경은 10 ~ 10000m 사이여야 합니다").default(100),
        companyId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 권한 체크: admin, ep만 가능
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "admin" && userRole !== "ep") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "작업 구역 생성 권한이 없습니다. (Admin/EP만 가능)",
        });
      }

      const id = nanoid();
      const workZone = await db.createWorkZone({
        id,
        name: input.name,
        description: input.description,
        centerLat: input.centerLat.toString(),
        centerLng: input.centerLng.toString(),
        radiusMeters: input.radiusMeters,
        companyId: input.companyId || ctx.user.companyId,
        createdBy: ctx.user.id,
        isActive: true,
      });

      console.log(`[WorkZone] Created: ${workZone.id} - ${workZone.name}`);
      return workZone;
    }),

  /**
   * 작업 구역 목록 조회
   */
  list: protectedProcedure
    .input(
      z.object({
        companyId: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();

      // BP/Owner는 자신의 회사 작업 구역만 조회
      let filters = input || {};
      if (userRole === "bp" || userRole === "owner") {
        filters = {
          ...filters,
          companyId: ctx.user.companyId || undefined,
        };
      }

      const workZones = await db.getWorkZones(filters);
      return workZones;
    }),

  /**
   * 작업 구역 단건 조회
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const workZone = await db.getWorkZoneById(input.id);
      if (!workZone) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "작업 구역을 찾을 수 없습니다.",
        });
      }
      return workZone;
    }),

  /**
   * 작업 구역 수정
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        zoneType: z.enum(["circle", "polygon"]).optional(),
        // 원형 구역용
        centerLat: z.number().min(-90).max(90).optional(),
        centerLng: z.number().min(-180).max(180).optional(),
        radiusMeters: z.number().min(10).max(10000).optional(),
        // 폴리곤 구역용
        polygonCoordinates: z.string().optional(), // JSON 문자열
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 권한 체크: admin, ep만 가능
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "admin" && userRole !== "ep") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "작업 구역 수정 권한이 없습니다. (Admin/EP만 가능)",
        });
      }

      const { id, ...updateData } = input;

      // 위도/경도는 문자열로 변환
      const dataToUpdate: any = { ...updateData };
      if (updateData.centerLat !== undefined) {
        dataToUpdate.centerLat = updateData.centerLat.toString();
      }
      if (updateData.centerLng !== undefined) {
        dataToUpdate.centerLng = updateData.centerLng.toString();
      }

      // 폴리곤 좌표 검증
      if (updateData.polygonCoordinates !== undefined) {
        try {
          const coords = JSON.parse(updateData.polygonCoordinates);
          if (!Array.isArray(coords) || coords.length < 3) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "폴리곤은 최소 3개 이상의 점이 필요합니다",
            });
          }
        } catch (e) {
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "폴리곤 좌표 형식이 올바르지 않습니다",
          });
        }
      }

      const workZone = await db.updateWorkZone(id, dataToUpdate);
      console.log(`[WorkZone] Updated: ${workZone.id}`);
      return workZone;
    }),

  /**
   * 작업 구역 삭제 (소프트 삭제)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 권한 체크: admin, ep만 가능
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "admin" && userRole !== "ep") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "작업 구역 삭제 권한이 없습니다. (Admin/EP만 가능)",
        });
      }

      await db.deleteWorkZone(input.id);
      console.log(`[WorkZone] Deleted: ${input.id}`);
      return { success: true };
    }),

  /**
   * GPS 좌표가 작업 구역 내에 있는지 확인
   */
  checkLocation: protectedProcedure
    .input(
      z.object({
        workZoneId: z.string(),
        lat: z.number(),
        lng: z.number(),
      })
    )
    .query(async ({ input }) => {
      const result = await db.isWithinWorkZone(
        input.workZoneId,
        input.lat,
        input.lng
      );
      return result;
    }),
});
