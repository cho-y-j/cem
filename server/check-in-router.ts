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

      // Worker 정보 조회 및 투입 확인
      const supabase = db.getSupabase();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "데이터베이스 연결에 실패했습니다.",
        });
      }

      // 1. user_id로 worker 찾기
      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .select("id, name, user_id")
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

      // 2. 활성 투입(deployment) 확인 - 투입된 사람만 출근 가능
      console.log("[CheckIn] Checking deployment for worker:", worker.id);
      
      const { data: activeDeployment, error: deploymentError } = await supabase
        .from("deployments")
        .select("id, bp_company_id, ep_company_id, equipment_id, status")
        .eq("worker_id", worker.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deploymentError) {
        console.error("[CheckIn] Error fetching deployment:", {
          error: deploymentError,
          workerId: worker.id,
          errorCode: deploymentError.code,
          errorMessage: deploymentError.message,
          errorDetails: deploymentError.details,
          errorHint: deploymentError.hint,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `투입 정보 조회 중 오류가 발생했습니다: ${deploymentError.message || "알 수 없는 오류"}`,
        });
      }

      console.log("[CheckIn] Deployment query result:", {
        found: !!activeDeployment,
        deploymentId: activeDeployment?.id,
      });

      if (!activeDeployment) {
        // 디버깅: 모든 deployment 확인
        const { data: allDeployments, error: allDeploymentsError } = await supabase
          .from("deployments")
          .select("id, worker_id, status, created_at")
          .eq("worker_id", worker.id)
          .order("created_at", { ascending: false })
          .limit(5);
        
        console.log("[CheckIn] All deployments for worker:", {
          count: allDeployments?.length || 0,
          deployments: allDeployments,
          error: allDeploymentsError,
        });

        throw new TRPCError({
          code: "FORBIDDEN",
          message: "출근할 수 없습니다. 현재 활성화된 투입이 없습니다. 관리자에게 문의하세요.",
        });
      }

      // 3. 작업 구역 ID 결정 및 GPS 검증
      let workZoneId = input.workZoneId;
      const deploymentId = activeDeployment.id;
      let isWithinZone = false;
      let distanceFromZone: number | undefined;

      // workZoneId가 없으면 deployment의 ep_company_id와 일치하는 활성 작업 구역 찾기
      if (!workZoneId) {
        console.log("[CheckIn] Finding work zone for deployment:", deploymentId);
        console.log("[CheckIn] EP Company ID:", activeDeployment.ep_company_id);
        console.log("[CheckIn] Current GPS position:", input.lat, input.lng);

        // deployment의 ep_company_id와 일치하는 활성 작업 구역만 조회
        const { data: activeWorkZones } = await supabase
          .from("work_zones")
          .select("*")
          .eq("is_active", true)
          .eq("company_id", activeDeployment.ep_company_id) // EP 회사 ID와 일치하는 구역만
          .is("deleted_at", null);

        console.log("[CheckIn] Found active work zones for EP company:", activeWorkZones?.length || 0);

        if (activeWorkZones && activeWorkZones.length > 0) {
          // 각 작업 구역까지의 거리 계산
          let nearestZone = null;
          let minDistance = Infinity;

          for (const zone of activeWorkZones) {
            const result = await db.isWithinWorkZone(zone.id, input.lat, input.lng);
            console.log(`[CheckIn] Zone "${zone.name}" (${zone.id}): distance=${result.distance}m, within=${result.isWithin}`);

            if (result.distance < minDistance) {
              minDistance = result.distance;
              nearestZone = zone;
              isWithinZone = result.isWithin;
              distanceFromZone = result.distance;
            }
          }

          if (nearestZone) {
            workZoneId = nearestZone.id;
            console.log(`[CheckIn] Selected nearest work zone: "${nearestZone.name}" (${workZoneId}), distance=${distanceFromZone}m, within=${isWithinZone}`);
          }
        } else {
          console.warn(`[CheckIn] No active work zones found for EP company: ${activeDeployment.ep_company_id}`);
        }
      } else {
        // workZoneId가 명시적으로 제공된 경우
        // deployment의 ep_company_id와 일치하는지 확인
        const { data: workZone } = await supabase
          .from("work_zones")
          .select("id, company_id")
          .eq("id", workZoneId)
          .maybeSingle();

        if (workZone && workZone.company_id !== activeDeployment.ep_company_id) {
          console.warn(`[CheckIn] Work zone ${workZoneId} does not match deployment EP company ${activeDeployment.ep_company_id}`);
        }

        const result = await db.isWithinWorkZone(workZoneId, input.lat, input.lng);
        isWithinZone = result.isWithin;
        distanceFromZone = result.distance;
        console.log(`[CheckIn] Using provided work zone: ${workZoneId}, distance=${distanceFromZone}m, within=${isWithinZone}`);
      }

      // 작업 구역 밖이면 경고 (하지만 출근은 허용 - 관리자가 나중에 확인)
      if (!isWithinZone && workZoneId) {
        console.warn(`[CheckIn] Worker ${ctx.user.id} checked in outside work zone (${distanceFromZone}m away)`);
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
        bpCompanyId: z.string().optional(),
        ownerCompanyId: z.string().optional(),
        workerTypeId: z.string().optional(),
        workerName: z.string().optional(), // 이름 검색
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
        bpCompanyId: input?.bpCompanyId,
        ownerCompanyId: input?.ownerCompanyId,
        workerTypeId: input?.workerTypeId,
        workerName: input?.workerName,
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

    console.log('[getTodayStats] Today check-ins:', {
      count: todayCheckIns.length,
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    // 출근 대상: 활성 deployment의 worker 수 조회 (권한별 필터링 및 work_zone 연결)
    const supabase = db.getSupabase();
    if (!supabase) {
      console.error('[getTodayStats] Supabase client is null');
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "데이터베이스 연결에 실패했습니다.",
      });
    }

    // 권한별 필터링
    let deploymentQuery = supabase
      .from("deployments")
      .select("worker_id, ep_company_id")
      .eq("status", "active");

    // EP인 경우 자신의 회사 deployment만
    if (userRole === "ep" && ctx.user.companyId) {
      deploymentQuery = deploymentQuery.eq("ep_company_id", ctx.user.companyId);
    }
    // BP인 경우 자신의 회사 deployment만
    else if (userRole === "bp" && ctx.user.companyId) {
      deploymentQuery = deploymentQuery.eq("bp_company_id", ctx.user.companyId);
    }
    // Owner인 경우 자신의 회사 deployment만 (equipment의 owner_company_id 확인 필요하지만 일단 deployment만)
    // Admin은 전체 조회

    const { data: activeDeployments, error: deploymentsError } = await deploymentQuery;

    console.log('[getTodayStats] Active deployments query result:', {
      count: activeDeployments?.length || 0,
      error: deploymentsError,
      userRole,
      userCompanyId: ctx.user.companyId,
    });

    if (deploymentsError) {
      console.error('[getTodayStats] Deployment query error:', deploymentsError);
    }

    // work_zone이 있는 deployment만 출근 대상으로 계산
    const expectedWorkers = await (async () => {
      if (!activeDeployments || activeDeployments.length === 0) return 0;
      
      // 각 deployment의 ep_company_id에 해당하는 활성 work_zone이 있는지 확인
      const epCompanyIds = [...new Set(activeDeployments.map((d: any) => d.ep_company_id).filter(Boolean))];
      
      if (epCompanyIds.length === 0) return 0;
      
      const { data: workZones } = await supabase
        .from("work_zones")
        .select("company_id")
        .eq("is_active", true)
        .in("company_id", epCompanyIds)
        .is("deleted_at", null);

      const validEpCompanyIds = new Set(workZones?.map((wz: any) => wz.company_id) || []);
      
      // work_zone이 있는 deployment만 출근 대상으로 계산
      const validDeployments = activeDeployments.filter((d: any) => 
        d.ep_company_id && validEpCompanyIds.has(d.ep_company_id)
      );

      console.log('[getTodayStats] Valid deployments (with work zones):', {
        total: activeDeployments.length,
        valid: validDeployments.length,
        epCompanyIds: epCompanyIds.length,
        workZones: workZones?.length || 0,
      });

      return validDeployments.length;
    })();

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

    // 출근율 계산
    const attendanceRate = expectedWorkers > 0 ? (total / expectedWorkers) * 100 : 0;

    return {
      total,
      expectedWorkers,
      attendanceRate: Math.round(attendanceRate * 10) / 10, // 소수점 1자리
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
