import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { toCamelCase, toCamelCaseArray } from "./db-utils";
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
        const { data: activeWorkZones, error: workZonesError } = await supabase
          .from("work_zones")
          .select("*")
          .eq("is_active", true)
          .eq("company_id", activeDeployment.ep_company_id); // EP 회사 ID와 일치하는 구역만

        console.log("[CheckIn] Found active work zones for EP company:", {
          count: activeWorkZones?.length || 0,
          epCompanyId: activeDeployment.ep_company_id,
          workZones: activeWorkZones,
          error: workZonesError,
        });

        if (workZonesError) {
          console.error("[CheckIn] Error fetching work zones:", workZonesError);
        }

        if (activeWorkZones && activeWorkZones.length > 0) {
          // 각 작업 구역까지의 거리 계산 및 구역 내 여부 확인
          let nearestZone = null;
          let minDistance = Infinity;
          let nearestWithinZone = null;
          let minDistanceWithin = Infinity;

          for (const zone of activeWorkZones) {
            try {
            const result = await db.isWithinWorkZone(zone.id, input.lat, input.lng);
              console.log(`[CheckIn] Zone "${zone.name}" (${zone.id}): distance=${result.distance}m, within=${result.isWithin}, zoneType=${zone.zone_type || 'circle'}`);

              // 가장 가까운 구역 추적
            if (result.distance < minDistance) {
              minDistance = result.distance;
              nearestZone = zone;
              }

              // 구역 내에 있는 가장 가까운 구역 추적 (우선순위)
              if (result.isWithin && result.distance < minDistanceWithin) {
                minDistanceWithin = result.distance;
                nearestWithinZone = zone;
                isWithinZone = true;
              distanceFromZone = result.distance;
              }
            } catch (error) {
              console.error(`[CheckIn] Error checking zone ${zone.id}:`, error);
            }
          }

          // 구역 내에 있는 구역이 있으면 그것을 선택, 없으면 가장 가까운 구역 선택
          if (nearestWithinZone) {
            workZoneId = nearestWithinZone.id;
            console.log(`[CheckIn] ✅ Selected work zone (within): "${nearestWithinZone.name}" (${workZoneId}), distance=${distanceFromZone}m, within=${isWithinZone}`);
          } else if (nearestZone) {
            workZoneId = nearestZone.id;
            // 가장 가까운 구역까지의 거리 재계산
            const result = await db.isWithinWorkZone(nearestZone.id, input.lat, input.lng);
            isWithinZone = result.isWithin;
            distanceFromZone = result.distance;
            console.log(`[CheckIn] ⚠️ Selected nearest work zone (outside): "${nearestZone.name}" (${workZoneId}), distance=${distanceFromZone}m, within=${isWithinZone}`);
          }
        } else {
          console.warn(`[CheckIn] ❌ No active work zones found for EP company: ${activeDeployment.ep_company_id}`);
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
        // 출근 시간 저장 (서버 시간 사용, DB에서 타임존 처리)
        // 참고: PostgreSQL/Supabase는 타임존을 자동으로 처리하므로 new Date()를 그대로 사용
        // 단, 표시 시에는 클라이언트에서 한국 시간으로 변환
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

      // 권한별 필터링
      const filters: any = {
        workerId: input?.workerId,
        workZoneId: input?.workZoneId,
        workerTypeId: input?.workerTypeId,
        workerName: input?.workerName,
        startDate: input?.startDate,
        endDate: input?.endDate,
      };

      // BP인 경우 자신의 회사 deployment의 출근 기록만
      if (userRole === "bp" && ctx.user.companyId) {
        filters.bpCompanyId = ctx.user.companyId;
      }
      // Owner인 경우 자신의 회사 deployment의 출근 기록만
      else if (userRole === "owner" && ctx.user.companyId) {
        filters.ownerCompanyId = ctx.user.companyId;
      }
      // EP인 경우 자신의 회사 deployment의 출근 기록만
      else if (userRole === "ep" && ctx.user.companyId) {
        filters.epCompanyId = ctx.user.companyId;
      }
      // Admin은 전체 조회 (필터 없음)
      // 수동 필터는 그대로 전달
      if (input?.bpCompanyId) filters.bpCompanyId = input.bpCompanyId;
      if (input?.ownerCompanyId) filters.ownerCompanyId = input.ownerCompanyId;

      const checkIns = await db.getCheckIns(filters);

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

    // 권한별 출근 기록 필터링
    const checkInFilters: any = {
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    };

    // EP인 경우 자신의 회사 deployment의 출근 기록만
    if (userRole === "ep" && ctx.user.companyId) {
      checkInFilters.epCompanyId = ctx.user.companyId;
    }
    // BP인 경우 자신의 회사 deployment의 출근 기록만
    else if (userRole === "bp" && ctx.user.companyId) {
      checkInFilters.bpCompanyId = ctx.user.companyId;
    }
    // Owner인 경우 자신의 회사 deployment의 출근 기록만
    else if (userRole === "owner" && ctx.user.companyId) {
      checkInFilters.ownerCompanyId = ctx.user.companyId;
    }

    const todayCheckIns = await db.getCheckIns(checkInFilters);

    console.log('[getTodayStats] Today check-ins:', {
      count: todayCheckIns.length,
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
      userRole,
      filters: checkInFilters,
      checkIns: todayCheckIns.map((ci: any) => ({
        id: ci.id,
        workerId: ci.workerId,
        workerName: ci.worker?.name,
        isWithinZone: ci.isWithinZone,
        deploymentId: ci.deploymentId,
        deploymentEpCompanyId: ci.deployment?.epCompanyId,
      })),
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
      .select("worker_id, ep_company_id, bp_company_id, owner_id")
      .eq("status", "active");

    // EP인 경우 자신의 회사 deployment만
    if (userRole === "ep" && ctx.user.companyId) {
      deploymentQuery = deploymentQuery.eq("ep_company_id", ctx.user.companyId);
    }
    // BP인 경우 자신의 회사 deployment만
    else if (userRole === "bp" && ctx.user.companyId) {
      deploymentQuery = deploymentQuery.eq("bp_company_id", ctx.user.companyId);
    }
    // Owner인 경우 자신의 회사 deployment만 (deployment의 owner_id로 필터링)
    else if (userRole === "owner" && ctx.user.id) {
      deploymentQuery = deploymentQuery.eq("owner_id", ctx.user.id);
    }
    // Admin은 전체 조회

    const { data: activeDeploymentsRaw, error: deploymentsError } = await deploymentQuery;

    console.log('[getTodayStats] ===== Deployment 조회 결과 =====');
    console.log('[getTodayStats] User role:', userRole);
    console.log('[getTodayStats] User company ID:', ctx.user.companyId);
    console.log('[getTodayStats] User ID:', ctx.user.id);
    console.log('[getTodayStats] Active deployments count (raw):', activeDeploymentsRaw?.length || 0);
    console.log('[getTodayStats] Active deployments data (raw):', JSON.stringify(activeDeploymentsRaw, null, 2));
    console.log('[getTodayStats] Deployment query error:', deploymentsError);

    if (deploymentsError) {
      console.error('[getTodayStats] ❌ Deployment query error:', deploymentsError);
    }

    // Supabase는 snake_case를 반환하므로 camelCase로 변환
    const activeDeployments = activeDeploymentsRaw ? toCamelCaseArray(activeDeploymentsRaw) : [];
    
    console.log('[getTodayStats] Active deployments (converted):', JSON.stringify(activeDeployments, null, 2));

    // work_zone이 있는 deployment만 출근 대상으로 계산
    const expectedWorkers = await (async () => {
      console.log('[getTodayStats] ===== 출근 대상 계산 시작 =====');
      console.log('[getTodayStats] Active deployments:', JSON.stringify(activeDeployments, null, 2));
      
      if (!activeDeployments || activeDeployments.length === 0) {
        console.log('[getTodayStats] ❌ 활성 deployment가 없음');
        return 0;
      }
      
      // 각 deployment의 ep_company_id에 해당하는 활성 work_zone이 있는지 확인
      // camelCase 변환 후 epCompanyId 사용
      const epCompanyIds = [...new Set(
        activeDeployments.map((d: any) => d.epCompanyId || d.ep_company_id).filter(Boolean)
      )];
      console.log('[getTodayStats] EP Company IDs:', epCompanyIds);
      
      if (epCompanyIds.length === 0) {
        console.log('[getTodayStats] ❌ EP Company ID가 없음');
        return 0;
      }
      
      const { data: workZonesRaw, error: workZonesError } = await supabase
        .from("work_zones")
        .select("company_id, id, name, is_active")
        .eq("is_active", true)
        .in("company_id", epCompanyIds);

      console.log('[getTodayStats] Work zones query result (raw):', {
        workZones: workZonesRaw,
        error: workZonesError,
        epCompanyIds: epCompanyIds,
      });

      if (workZonesError) {
        console.error('[getTodayStats] ❌ Work zones 조회 오류:', workZonesError);
      }

      // Supabase는 snake_case를 반환하므로 camelCase로 변환
      const workZones = workZonesRaw ? toCamelCaseArray(workZonesRaw) : [];
      
      console.log('[getTodayStats] Work zones (converted):', JSON.stringify(workZones, null, 2));

      // company_id는 snake_case이므로 그대로 사용 (또는 companyId로 변환된 경우 확인)
      const validEpCompanyIds = new Set(
        workZones.map((wz: any) => wz.companyId || wz.company_id).filter(Boolean)
      );
      console.log('[getTodayStats] Valid EP Company IDs (work_zone이 있는):', Array.from(validEpCompanyIds));
      
      // work_zone이 있는 deployment만 출근 대상으로 계산
      // ep_company_id는 snake_case이거나 camelCase일 수 있으므로 둘 다 확인
      const validDeployments = activeDeployments.filter((d: any) => {
        const epCompanyId = d.epCompanyId || d.ep_company_id;
        const isValid = epCompanyId && validEpCompanyIds.has(epCompanyId);
        console.log(`[getTodayStats] Deployment ${d.workerId || d.worker_id}: epCompanyId=${epCompanyId}, valid=${isValid}`);
        return isValid;
      });

      console.log('[getTodayStats] ===== 출근 대상 계산 결과 =====');
      console.log('[getTodayStats] Total deployments:', activeDeployments.length);
      console.log('[getTodayStats] Valid deployments (with work zones):', validDeployments.length);
      console.log('[getTodayStats] EP Company IDs found:', epCompanyIds.length);
      console.log('[getTodayStats] Work zones found:', workZones?.length || 0);
      console.log('[getTodayStats] Expected workers:', validDeployments.length);

      return validDeployments.length;
    })();

    // 출근 대상 worker 목록 조회
    const expectedWorkersList = await (async () => {
      if (!activeDeployments || activeDeployments.length === 0) return [];
      
      const epCompanyIds = [...new Set(
        activeDeployments.map((d: any) => d.epCompanyId || d.ep_company_id).filter(Boolean)
      )];
      
      if (epCompanyIds.length === 0) return [];
      
      const { data: workZonesRaw } = await supabase
        .from("work_zones")
        .select("company_id, id, name, is_active")
        .eq("is_active", true)
        .in("company_id", epCompanyIds);

      const workZones = workZonesRaw ? toCamelCaseArray(workZonesRaw) : [];
      const validEpCompanyIds = new Set(
        workZones.map((wz: any) => wz.companyId || wz.company_id).filter(Boolean)
      );
      
      const validDeployments = activeDeployments.filter((d: any) => {
        const epCompanyId = d.epCompanyId || d.ep_company_id;
        return epCompanyId && validEpCompanyIds.has(epCompanyId);
      });

      // worker_id 목록 수집
      const workerIds = [...new Set(validDeployments.map((d: any) => d.workerId || d.worker_id).filter(Boolean))];
      
      if (workerIds.length === 0) return [];

      // worker 정보 조회
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name, user_id, worker_type_id')
        .in('id', workerIds);

      if (!workers) return [];

      // worker_type 정보 조회
      const workerTypeIds = [...new Set(workers.map((w: any) => w.worker_type_id).filter(Boolean))];
      const workerTypeMap = new Map();
      
      if (workerTypeIds.length > 0) {
        const { data: workerTypes } = await supabase
          .from('worker_types')
          .select('id, name')
          .in('id', workerTypeIds);
        
        if (workerTypes) {
          workerTypes.forEach((wt: any) => {
            workerTypeMap.set(wt.id, toCamelCase(wt));
          });
        }
      }

      // user 정보 조회
      const userIds = [...new Set(workers.map((w: any) => w.user_id).filter(Boolean))];
      const userMap = new Map();
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);
        
        if (users) {
          users.forEach((u: any) => {
            userMap.set(u.id, toCamelCase(u));
          });
        }
      }

      // company 정보 조회
      const allCompanyIds = new Set<string>();
      validDeployments.forEach((d: any) => {
        if (d.epCompanyId || d.ep_company_id) allCompanyIds.add(d.epCompanyId || d.ep_company_id);
        if (d.bpCompanyId || d.bp_company_id) allCompanyIds.add(d.bpCompanyId || d.bp_company_id);
      });
      
      const companyMap = new Map();
      if (allCompanyIds.size > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, company_type')
          .in('id', Array.from(allCompanyIds));
        
        if (companies) {
          companies.forEach((comp: any) => {
            companyMap.set(comp.id, toCamelCase(comp));
          });
        }
      }

      // deployment 정보 매핑
      const deploymentMap = new Map();
      validDeployments.forEach((d: any) => {
        const workerId = d.workerId || d.worker_id;
        if (workerId && !deploymentMap.has(workerId)) {
          const epCompanyId = d.epCompanyId || d.ep_company_id;
          const bpCompanyId = d.bpCompanyId || d.bp_company_id;
          const epCompany = epCompanyId ? companyMap.get(epCompanyId) : null;
          const bpCompany = bpCompanyId ? companyMap.get(bpCompanyId) : null;
          
          deploymentMap.set(workerId, {
            id: d.id || d.deploymentId,
            epCompanyId,
            bpCompanyId,
            ownerId: d.ownerId || d.owner_id,
            epCompany: epCompany ? { id: epCompany.id, name: epCompany.name } : null,
            bpCompany: bpCompany ? { id: bpCompany.id, name: bpCompany.name } : null,
          });
        }
      });

      // 오늘 출근한 worker_id 목록
      const checkedInWorkerIds = new Set(todayCheckIns.map((ci: any) => ci.workerId).filter(Boolean));

      // worker 정보 조합
      return toCamelCaseArray(workers).map((w: any) => {
        const workerType = w.workerTypeId ? workerTypeMap.get(w.workerTypeId) : null;
        const user = w.userId ? userMap.get(w.userId) : null;
        const deployment = deploymentMap.get(w.id);
        const hasCheckedIn = checkedInWorkerIds.has(w.id);

        return {
          workerId: w.id,
          workerName: w.name,
          userId: w.userId,
          userName: user?.name || null,
          userEmail: user?.email || null,
          workerType: workerType ? { id: workerType.id, name: workerType.name } : null,
          deployment: deployment || null,
          hasCheckedIn,
        };
      });
    })();

    // 중복 제거: 같은 worker_id의 오늘 출근 기록은 하나만 카운트
    const uniqueCheckIns = new Map();
    todayCheckIns.forEach((ci: any) => {
      const key = ci.workerId;
      if (!uniqueCheckIns.has(key)) {
        uniqueCheckIns.set(key, ci);
      } else {
        // 같은 worker의 여러 출근 기록이 있으면 가장 최근 것만 사용
        const existing = uniqueCheckIns.get(key);
        const existingTime = new Date(existing.checkInTime).getTime();
        const currentTime = new Date(ci.checkInTime).getTime();
        if (currentTime > existingTime) {
          uniqueCheckIns.set(key, ci);
        }
      }
    });

    const uniqueCheckInsArray = Array.from(uniqueCheckIns.values());

    // 통계 계산
    const total = uniqueCheckInsArray.length;
    const withinZone = uniqueCheckInsArray.filter(c => c.isWithinZone === true).length;
    const outsideZone = uniqueCheckInsArray.filter(c => c.isWithinZone === false).length;
    const withWebauthn = uniqueCheckInsArray.filter(c => c.webauthnVerified === true).length;

    console.log('[getTodayStats] ===== 통계 계산 결과 =====');
    console.log('[getTodayStats] Original check-ins count:', todayCheckIns.length);
    console.log('[getTodayStats] Unique check-ins count:', total);
    console.log('[getTodayStats] Within zone:', withinZone);
    console.log('[getTodayStats] Outside zone:', outsideZone);
    console.log('[getTodayStats] Check-ins details:', uniqueCheckInsArray.map((c: any) => ({
      id: c.id,
      workerId: c.workerId,
      workerName: c.worker?.name,
      isWithinZone: c.isWithinZone,
      distanceFromZone: c.distanceFromZone,
    })));

    // 시간대별 분포 (오전/오후)
    const morning = uniqueCheckInsArray.filter(c => {
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
      checkIns: uniqueCheckInsArray,
      expectedWorkersList, // 출근 대상 목록 추가
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

  /**
   * 출근 기록 삭제 (테스트용)
   */
  delete: protectedProcedure
    .input(
      z.object({
        checkInId: z.string().optional(), // 특정 기록 삭제
        userId: z.string().optional(), // 특정 사용자의 오늘 출근 기록 삭제
        deleteToday: z.boolean().default(false), // 오늘 출근 기록만 삭제
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = db.getSupabase();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "데이터베이스 연결 실패",
        });
      }

      let query = supabase.from('check_ins').delete();

      // Worker는 본인 것만 삭제 가능
      if (ctx.user.role?.toLowerCase() === "worker") {
        query = query.eq('user_id', ctx.user.id);
      } else if (input.userId) {
        // Admin/EP/BP/Owner는 지정된 사용자의 기록 삭제 가능
        query = query.eq('user_id', input.userId);
      } else if (input.checkInId) {
        // 특정 기록 삭제
        query = query.eq('id', input.checkInId);
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "삭제할 기록을 지정해주세요.",
        });
      }

      // 오늘 출근 기록만 삭제
      if (input.deleteToday) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString();
        
        query = query
          .gte('check_in_time', todayStr)
          .lt('check_in_time', tomorrowStr);
      }

      const { error } = await query;

      if (error) {
        console.error('[CheckIn] Delete error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `출근 기록 삭제 실패: ${error.message}`,
        });
      }

      return { success: true };
    }),
});
