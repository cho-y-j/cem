/**
 * 모바일 앱 전용 API 라우터
 * - 장비 운전자 (Worker)
 * - 현장 안전점검원 (Inspector)
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";

/**
 * Context에서 Worker ID 가져오기 (헬퍼 함수)
 */
async function getWorkerIdFromContext(ctx: any): Promise<string> {
  const userPin = ctx.user.pin;
  const userEmail = ctx.user.email;

  let worker: any = null;

  // 먼저 PIN으로 찾기
  if (userPin) {
    worker = await db.getWorkerByPinCode(userPin);
  }

  // PIN으로 못 찾으면 Email로 찾기
  if (!worker && userEmail) {
    worker = await db.getWorkerByEmail(userEmail);
  }

  if (!worker) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Worker 정보를 찾을 수 없습니다. PIN 또는 Email을 확인하세요.",
    });
  }

  return worker.id;
}

export const mobileRouter = router({
  // ============================================================
  // 장비 운전자 (Worker) API
  // ============================================================

  worker: router({
    /**
     * 본인에게 배정된 장비 조회
     * 1. equipment.assigned_worker_id 확인
     * 2. deployment에서 현재 활성 투입의 equipment 확인
     */
    getMyAssignedEquipment: protectedProcedure.query(async ({ ctx }) => {
      console.log('[Mobile] getMyAssignedEquipment called for user:', ctx.user.id, ctx.user.name, ctx.user.email);

      // users 테이블의 Worker가 로그인한 경우
      // 1. PIN으로 workers 테이블의 레코드를 찾거나
      // 2. Email로 workers 테이블의 레코드를 찾아야 함
      const userPin = ctx.user.pin;
      const userEmail = ctx.user.email;

      let worker: any = null;

      // 먼저 PIN으로 찾기
      if (userPin) {
        console.log('[Mobile] Looking for worker with PIN:', userPin);
        worker = await db.getWorkerByPinCode(userPin);
        if (worker) {
          console.log('[Mobile] Found worker by PIN:', worker.id, worker.name);
        }
      }

      // PIN으로 못 찾으면 Email로 찾기
      if (!worker && userEmail) {
        console.log('[Mobile] PIN not found or no match, trying with email:', userEmail);
        worker = await db.getWorkerByEmail(userEmail);
        if (worker) {
          console.log('[Mobile] Found worker by email:', worker.id, worker.name);
        } else {
          console.log(`[Mobile] No worker found with email: ${userEmail}`);
        }
      }

      if (!worker) {
        console.log('[Mobile] No worker found with PIN or email');
        return null;
      }

      console.log('[Mobile] Final worker:', worker.id, worker.name);

      // 1. equipment.assigned_worker_id로 배정된 장비 조회
      let equipment = await db.getEquipmentByAssignedWorker(worker.id);
      console.log('[Mobile] Equipment from assigned_worker_id:', equipment ? equipment.id : 'null');
      
      // 2. assigned_worker_id가 없으면, deployment에서 확인
      if (!equipment) {
        console.log('[Mobile] No equipment assigned via assigned_worker_id, checking deployment...');
        const deployment = await db.getDeploymentByWorkerId(worker.id);
        console.log('[Mobile] Deployment found:', deployment ? deployment.id : 'null');
        
        if (deployment) {
          console.log('[Mobile] Deployment details:', {
            id: deployment.id,
            equipmentId: deployment.equipmentId,
            workerId: deployment.workerId,
          });
          
          if (deployment.equipmentId) {
            console.log('[Mobile] Fetching equipment by ID:', deployment.equipmentId);
            equipment = await db.getEquipmentById(deployment.equipmentId);
            console.log('[Mobile] Equipment fetched:', equipment ? { id: equipment.id, regNum: equipment.regNum } : 'null');
          } else {
            console.log('[Mobile] WARNING: Deployment has no equipmentId!');
          }
        } else {
          console.log('[Mobile] No active deployment found for worker:', worker.id);
        }
      }
      
      console.log('[Mobile] Final equipment result:', equipment ? { id: equipment.id, regNum: equipment.regNum } : 'null');
      return equipment;
    }),

    /**
     * Worker 본인 정보 조회
     */
    getWorkerInfo: protectedProcedure.query(async ({ ctx }) => {
      console.log('[Mobile] getWorkerInfo called for user:', ctx.user.id, ctx.user.name, ctx.user.email);

      const userPin = ctx.user.pin;
      const userEmail = ctx.user.email;

      let worker: any = null;

      // 먼저 PIN으로 찾기
      if (userPin) {
        worker = await db.getWorkerByPinCode(userPin);
      }

      // PIN으로 못 찾으면 Email로 찾기
      if (!worker && userEmail) {
        worker = await db.getWorkerByEmail(userEmail);
      }

      if (!worker) {
        console.log('[Mobile] No worker found with PIN or email');
        return null;
      }

      console.log('[Mobile] Worker info found:', worker.id, worker.name);
      return worker;
    }),

    /**
     * 본인에게 배정된 장비 조회 (별칭)
     */
    getAssignedEquipment: protectedProcedure.query(async ({ ctx }) => {
      const userPin = ctx.user.pin;
      const userEmail = ctx.user.email;

      let worker: any = null;

      // 먼저 PIN으로 찾기
      if (userPin) {
        worker = await db.getWorkerByPinCode(userPin);
      }

      // PIN으로 못 찾으면 Email로 찾기
      if (!worker && userEmail) {
        worker = await db.getWorkerByEmail(userEmail);
      }

      if (!worker) {
        return null;
      }

      // 1. equipment.assigned_worker_id로 배정된 장비 조회
      let equipment = await db.getEquipmentByAssignedWorker(worker.id);

      // 2. assigned_worker_id가 없으면, deployment에서 확인
      if (!equipment) {
        const deployment = await db.getDeploymentByWorkerId(worker.id);
        if (deployment && deployment.equipmentId) {
          equipment = await db.getEquipmentById(deployment.equipmentId);
        }
      }

      return equipment;
    }),

    /**
     * 현재 투입 정보 조회 (BP사 정보 포함)
     */
    getCurrentDeployment: protectedProcedure.query(async ({ ctx }) => {
      console.log('[Mobile] getCurrentDeployment called for user:', ctx.user.id, ctx.user.name, ctx.user.email, 'PIN:', ctx.user.pin);

      const userPin = ctx.user.pin;
      const userEmail = ctx.user.email;

      let worker: any = null;

      // 먼저 PIN으로 찾기
      if (userPin) {
        worker = await db.getWorkerByPinCode(userPin);
      }

      // PIN으로 못 찾으면 Email로 찾기
      if (!worker && userEmail) {
        worker = await db.getWorkerByEmail(userEmail);
      }

      if (!worker) {
        console.log('[Mobile] No worker found with PIN or email');
        return null;
      }

      console.log('[Mobile] Found worker:', worker.id, worker.name);

      // worker_id로 활성 deployment 조회 (BP사, EP사 정보 포함)
      const deployment = await db.getDeploymentByWorkerId(worker.id);
      console.log('[Mobile] Deployment result:', deployment ? { id: deployment.id, status: deployment.status, equipmentId: deployment.equipmentId } : 'null');

      if (deployment) {
        console.log('[Mobile] Deployment details:', {
          id: deployment.id,
          workerId: deployment.workerId,
          equipmentId: deployment.equipmentId,
          bpCompany: deployment.bpCompany?.name,
          epCompany: deployment.epCompany?.name,
        });
      }

      return deployment;
    }),

    /**
     * 작업 세션 시작
     */
    startWorkSession: protectedProcedure
      .input(
        z.object({
          equipmentId: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const workerId = await getWorkerIdFromContext(ctx);

        // 이미 진행 중인 세션이 있는지 확인
        const currentSession = await db.getCurrentWorkSession(workerId);
        if (currentSession) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "이미 진행 중인 작업 세션이 있습니다.",
          });
        }

        const id = nanoid();
        await db.createWorkSession({
          id,
          equipmentId: input.equipmentId,
          workerId,
          workDate: new Date(),
          startTime: new Date(),
          status: "working",
        });

        return { id };
      }),

    /**
     * 작업 세션 종료
     */
    endWorkSession: protectedProcedure.mutation(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const currentSession = await db.getCurrentWorkSession(workerId);

      if (!currentSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "진행 중인 작업 세션이 없습니다.",
        });
      }

      const endTime = new Date();
      const startTime = new Date(currentSession.startTime);
      
      // 전체 시간 계산
      const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      // 실제 근로 시간 = 전체 시간 - 휴식 시간
      const breakDuration = currentSession.breakDuration || 0;
      const actualWorkMinutes = totalMinutes - breakDuration;

      await db.updateWorkSession(currentSession.id, {
        endTime,
        totalWorkMinutes: actualWorkMinutes, // 휴식 시간 제외된 실제 근로 시간
        status: "completed",
      });

      return { success: true };
    }),

    /**
     * 휴식 시작
     */
    startBreak: protectedProcedure.mutation(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const currentSession = await db.getCurrentWorkSession(workerId);

      if (!currentSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "진행 중인 작업 세션이 없습니다.",
        });
      }

      if (currentSession.status !== "working") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "작업 중일 때만 휴식을 시작할 수 있습니다.",
        });
      }

      const breakStartTime = new Date();
      const breakPeriods = currentSession.breakPeriods || [];
      breakPeriods.push({ start: breakStartTime });

      await db.updateWorkSession(currentSession.id, {
        breakPeriods,
        breakStartTime,
        status: "break",
      });

      return { success: true };
    }),

    /**
     * 휴식 종료
     */
    endBreak: protectedProcedure.mutation(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const currentSession = await db.getCurrentWorkSession(workerId);

      if (!currentSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "진행 중인 작업 세션이 없습니다.",
        });
      }

      if (currentSession.status !== "break") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "휴식 중일 때만 휴식을 종료할 수 있습니다.",
        });
      }

      const breakPeriods = currentSession.breakPeriods || [];
      const endTime = new Date();
      
      if (breakPeriods.length > 0) {
        const lastBreak = breakPeriods[breakPeriods.length - 1];
        lastBreak.end = endTime;
        
        // 총 휴식 시간 계산 (분)
        const breakStart = new Date(lastBreak.start);
        const breakMinutes = Math.floor((endTime.getTime() - breakStart.getTime()) / (1000 * 60));
        const totalBreakDuration = (currentSession.breakDuration || 0) + breakMinutes;

        await db.updateWorkSession(currentSession.id, {
          breakPeriods,
          breakDuration: totalBreakDuration,
          lastBreakTime: endTime,
          status: "working",
        });
      } else {
        await db.updateWorkSession(currentSession.id, {
          status: "working",
        });
      }

      return { success: true };
    }),

    /**
     * 연장 시작
     */
    startOvertime: protectedProcedure.mutation(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const currentSession = await db.getCurrentWorkSession(workerId);

      if (!currentSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "진행 중인 작업 세션이 없습니다.",
        });
      }

      if (currentSession.status !== "working") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "작업 중일 때만 연장을 시작할 수 있습니다.",
        });
      }

      const overtimePeriods = currentSession.overtimePeriods || [];
      overtimePeriods.push({ start: new Date() });

      await db.updateWorkSession(currentSession.id, {
        overtimePeriods,
        status: "overtime",
      });

      return { success: true };
    }),

    /**
     * 연장 종료
     */
    endOvertime: protectedProcedure.mutation(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const currentSession = await db.getCurrentWorkSession(workerId);

      if (!currentSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "진행 중인 작업 세션이 없습니다.",
        });
      }

      if (currentSession.status !== "overtime") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "연장 중일 때만 연장을 종료할 수 있습니다.",
        });
      }

      const overtimePeriods = currentSession.overtimePeriods || [];
      if (overtimePeriods.length > 0) {
        overtimePeriods[overtimePeriods.length - 1].end = new Date();
      }

      await db.updateWorkSession(currentSession.id, {
        overtimePeriods,
        status: "working",
      });

      return { success: true };
    }),

    /**
     * 현재 작업 세션 조회
     */
    getCurrentSession: protectedProcedure.query(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const currentSession = await db.getCurrentWorkSession(workerId);
      return currentSession;
    }),

    /**
     * 위치 정보 전송
     */
    sendLocation: protectedProcedure
      .input(
        z.object({
          equipmentId: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          accuracy: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const workerId = await getWorkerIdFromContext(ctx);
        const id = nanoid();

        await db.createLocationLog({
          id,
          equipmentId: input.equipmentId,
          workerId,
          latitude: input.latitude.toString(),
          longitude: input.longitude.toString(),
          accuracy: input.accuracy?.toString(),
          loggedAt: new Date(),
        });

        return { success: true };
      }),

    /**
     * 긴급 알림 전송
     */
    sendEmergencyAlert: protectedProcedure
      .input(
        z.object({
          equipmentId: z.string(),
          alertType: z.string(),
          description: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const workerId = await getWorkerIdFromContext(ctx);
        const id = nanoid();

        await db.createEmergencyAlert({
          id,
          equipmentId: input.equipmentId,
          workerId,
          alertType: input.alertType,
          description: input.description,
          latitude: input.latitude,
          longitude: input.longitude,
        });

        return { id };
      }),

    /**
     * 내 작업 세션 목록 조회
     */
    getMyWorkSessions: protectedProcedure.query(async ({ ctx }) => {
      const workerId = await getWorkerIdFromContext(ctx);
      const sessions = await db.getWorkSessionsByWorker(workerId);
      return sessions;
    }),

    /**
     * 모든 활성 작업 세션 조회 (Admin/Owner 전용)
     */
    getAllActiveSessions: protectedProcedure.query(async () => {
      const sessions = await db.getAllActiveWorkSessions();
      return sessions;
    }),
  }),

  // ============================================================
  // 현장 안전점검원 (Inspector) API
  // ============================================================

  inspector: router({
    /**
     * 차량번호 뒷 4자리로 장비 검색
     */
    searchEquipmentByLastFour: protectedProcedure
      .input(
        z.object({
          lastFour: z.string().length(4),
        })
      )
      .query(async ({ input }) => {
        const equipment = await db.searchEquipmentByLastFourDigits(input.lastFour);
        return equipment;
      }),
  }),

  // ============================================================
  // 공통 API
  // ============================================================

  /**
   * 최신 위치 정보 조회
   */
  getLatestLocation: protectedProcedure
    .input(
      z.object({
        equipmentId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const location = await db.getLatestLocationByEquipment(input.equipmentId);
      return location;
    }),

  /**
   * 긴급 알림 목록 조회
   */
  getEmergencyAlerts: protectedProcedure
    .input(
      z.object({
        equipmentId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const alerts = await db.getEmergencyAlertsByEquipment(input.equipmentId);
      return alerts;
    }),

  /**
   * 긴급 알림 확인
   */
  acknowledgeEmergencyAlert: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateEmergencyAlert(input.id, {
        status: "acknowledged",
        acknowledgedBy: ctx.user.id,
        acknowledgedAt: new Date(),
      });

      return { success: true };
    }),
});

