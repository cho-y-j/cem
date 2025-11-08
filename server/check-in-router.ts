import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
// xlsx는 CommonJS 모듈이므로 동적 import 사용 (ESM 호환성)

/**
 * 출근 체크 API
 * GPS 기반 작업 구역 확인 + 생체 인증
 */
export const checkInRouter = router({
  /**
   * 출근하기
   * GPS 위치를 받아서 작업 구역 내에 있는지 확인 후 출근 기록
   */
  create: protectedProcedure
    .input(
      z.object({
        workZoneId: z.string().optional(),
        lat: z.number(),
        lng: z.number(),
        authMethod: z.enum(["pin", "password", "webauthn"]).default("pin"),
        webauthnCredentialId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();

      // Worker만 출근 가능
      if (userRole !== "worker") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "출근 체크는 Worker만 가능합니다.",
        });
      }

      // 이미 오늘 출근했는지 확인
      const todayCheckIn = await db.getTodayCheckIn(ctx.user.id);
      if (todayCheckIn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `이미 오늘 출근하셨습니다. (${new Date(todayCheckIn.checkInTime).toLocaleTimeString("ko-KR")})`,
        });
      }

      // Worker 정보 조회
      const supabase = db.getSupabase();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "데이터베이스 연결에 실패했습니다.",
        });
      }

      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .select("id, deployment_id:deployments!worker_id(id, work_zone_id)")
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (workerError) {
        console.error("[CheckIn] Error fetching worker:", workerError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Worker 정보 조회 중 오류가 발생했습니다.",
        });
      }

      if (!worker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Worker 정보를 찾을 수 없습니다.",
        });
      }

      // 작업 구역 ID 결정 (입력값 우선, 없으면 deployment에서)
      let workZoneId = input.workZoneId;
      let deploymentId: string | undefined;

      if (!workZoneId) {
        // deployment에서 work_zone_id 찾기
        const { data: deployments } = await supabase
          .from("deployments")
          .select("id, work_zone_id")
          .eq("worker_id", worker.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);

        if (deployments && deployments.length > 0) {
          workZoneId = deployments[0].work_zone_id;
          deploymentId = deployments[0].id;
        }
      }

      let isWithinZone = false;
      let distanceFromZone: number | undefined;

      // 작업 구역이 있으면 GPS 검증
      if (workZoneId) {
        const result = await db.isWithinWorkZone(workZoneId, input.lat, input.lng);
        isWithinZone = result.isWithin;
        distanceFromZone = result.distance;

        // 작업 구역 밖이면 경고 (하지만 출근은 허용 - 관리자가 나중에 확인)
        if (!isWithinZone) {
          console.warn(`[CheckIn] Worker ${ctx.user.id} checked in outside work zone (${distanceFromZone}m away)`);
        }
      }

      // 출근 기록 생성
      const id = nanoid();
      const checkIn = await db.createCheckIn({
        id,
        workerId: worker.id,
        userId: ctx.user.id,
        deploymentId,
        workZoneId: workZoneId || undefined,
        checkInTime: new Date(),
        checkInLat: input.lat.toString(),
        checkInLng: input.lng.toString(),
        distanceFromZone,
        isWithinZone,
        authMethod: input.authMethod,
        webauthnVerified: input.authMethod === "webauthn",
        webauthnCredentialId: input.webauthnCredentialId,
        deviceInfo: ctx.req.headers["user-agent"] || undefined,
        notes: input.notes,
      });

      console.log(`[CheckIn] Worker ${ctx.user.name} checked in at ${new Date().toISOString()}`);

      return {
        ...checkIn,
        isWithinZone,
        distanceFromZone,
      };
    }),

  /**
   * 오늘 출근 여부 확인
   */
  getTodayStatus: protectedProcedure.query(async ({ ctx }) => {
    const checkIn = await db.getTodayCheckIn(ctx.user.id);
    return {
      hasCheckedIn: !!checkIn,
      checkIn: checkIn || null,
    };
  }),

  /**
   * 내 출근 기록 조회
   */
  myList: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(30),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const filters: any = {
        userId: ctx.user.id,
      };

      if (input?.startDate) {
        filters.startDate = input.startDate;
      }
      if (input?.endDate) {
        filters.endDate = input.endDate;
      }

      const checkIns = await db.getCheckIns(filters);
      return checkIns.slice(0, input?.limit || 30);
    }),

  /**
   * 전체 출근 기록 조회 (Admin/EP/Owner)
   */
  list: protectedProcedure
    .input(
      z.object({
        workerId: z.string().optional(),
        workZoneId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();

      // Worker는 본인 것만 조회
      if (userRole === "worker") {
        return await db.getCheckIns({
          userId: ctx.user.id,
          startDate: input?.startDate,
          endDate: input?.endDate,
        });
      }

      // Admin/EP/Owner는 전체 조회
      const checkIns = await db.getCheckIns({
        workerId: input?.workerId,
        workZoneId: input?.workZoneId,
        startDate: input?.startDate,
        endDate: input?.endDate,
      });

      return checkIns.slice(0, input?.limit || 50);
    }),

  /**
   * 오늘 출근 현황 통계 (Admin/EP/Owner)
   */
  getTodayStats: protectedProcedure.query(async ({ ctx }) => {
    const userRole = ctx.user.role?.toLowerCase();

    if (userRole === "worker") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "권한이 없습니다.",
      });
    }

    // 오늘 날짜
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCheckIns = await db.getCheckIns({
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    // 통계 계산
    const total = todayCheckIns.length;
    const withinZone = todayCheckIns.filter(c => c.isWithinZone).length;
    const outsideZone = total - withinZone;
    const withWebauthn = todayCheckIns.filter(c => c.webauthnVerified).length;

    // 시간대별 분포 (오전/오후)
    const morning = todayCheckIns.filter(c => {
      const hour = new Date(c.checkInTime).getHours();
      return hour < 12;
    }).length;
    const afternoon = total - morning;

    return {
      total,
      withinZone,
      outsideZone,
      withWebauthn,
      morning,
      afternoon,
      checkIns: todayCheckIns,
    };
  }),

  /**
   * 특정 Worker의 출근 기록 조회 (Admin/EP/Owner)
   */
  getByWorkerId: protectedProcedure
    .input(z.object({
      workerId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();

      if (userRole === "worker") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "권한이 없습니다.",
        });
      }

      return await db.getCheckIns({
        workerId: input.workerId,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }),

  /**
   * 출근 기록 엑셀 다운로드 (Admin/EP/Owner)
   */
  exportToExcel: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();

      if (userRole === "worker") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "권한이 없습니다.",
        });
      }

      // 출근 기록 조회
      const checkIns = await db.getCheckIns({
        startDate: input.startDate,
        endDate: input.endDate,
      });

      // xlsx 모듈 동적 import (ESM 호환성)
      const XLSX = await import("xlsx");

      // 엑셀 데이터 변환
      const excelData = checkIns.map((checkIn: any) => ({
        '출근일시': new Date(checkIn.checkInTime).toLocaleString('ko-KR'),
        '작업자': checkIn.user?.name || checkIn.userId,
        '이메일': checkIn.user?.email || '-',
        '작업구역': checkIn.workZone?.name || '-',
        '구역내출근': checkIn.isWithinZone ? 'O' : 'X',
        '거리(m)': checkIn.distanceFromZone || '-',
        '인증방법': checkIn.authMethod || '-',
        '생체인증': checkIn.webauthnVerified ? 'O' : 'X',
        '위도': checkIn.checkInLat || '-',
        '경도': checkIn.checkInLng || '-',
      }));

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "출근기록");

      // 엑셀 파일을 버퍼로 변환
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Base64로 인코딩하여 반환
      return {
        data: excelBuffer.toString('base64'),
        filename: `출근기록_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    }),
});
