import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";

/**
 * 운전자 점검표 관리 API
 * Admin: 템플릿 관리
 * Worker (Driver): 점검 작성 및 제출
 */
export const driverInspectionRouter = router({
  // ============================================================
  // 템플릿 관리 (Admin)
  // ============================================================

  /**
   * 템플릿 목록 조회
   */
  listTemplates: protectedProcedure
    .input(
      z.object({
        equipTypeId: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getDriverInspectionTemplates(input);
    }),

  /**
   * 템플릿 상세 조회 (항목 포함)
   */
  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = await db.getDriverInspectionTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "템플릿을 찾을 수 없습니다.",
        });
      }
      return template;
    }),

  /**
   * 템플릿 생성 (Admin)
   */
  createTemplate: adminProcedure
    .input(
      z.object({
        name: z.string(),
        equipTypeId: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();
      return await db.createDriverInspectionTemplate({
        id,
        ...input,
        createdBy: ctx.user.id,
        isActive: true,
      });
    }),

  /**
   * 템플릿 수정 (Admin)
   */
  updateTemplate: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateDriverInspectionTemplate(id, data);
    }),

  /**
   * 템플릿 삭제 (비활성화) (Admin)
   */
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.deleteDriverInspectionTemplate(input.id);
    }),

  /**
   * 템플릿 항목 생성 (Admin)
   */
  createTemplateItem: adminProcedure
    .input(
      z.object({
        templateId: z.string(),
        category: z.string().optional(),
        itemText: z.string(),
        checkFrequency: z.enum(["daily", "weekly", "monthly"]), // 항목별로 점검 주기 설정
        resultType: z.enum(["status", "text", "numeric"]).default("status"),
        displayOrder: z.number().default(0),
        isRequired: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const id = nanoid();
      return await db.createDriverInspectionTemplateItem({
        id,
        ...input,
      });
    }),

  /**
   * 템플릿 항목 수정 (Admin)
   */
  updateTemplateItem: adminProcedure
    .input(
      z.object({
        id: z.string(),
        category: z.string().optional(),
        itemText: z.string().optional(),
        checkFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        resultType: z.enum(["status", "text", "numeric"]).optional(),
        displayOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateDriverInspectionTemplateItem(id, data);
    }),

  /**
   * 템플릿 항목 삭제 (Admin)
   */
  deleteTemplateItem: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.deleteDriverInspectionTemplateItem(input.id);
    }),

  // ============================================================
  // 점검 기록 관리 (Worker/Driver)
  // ============================================================

  /**
   * 점검 기록 목록 조회 (장비별)
   */
  listRecordsByEquipment: protectedProcedure
    .input(z.object({ equipmentId: z.string() }))
    .query(async ({ input }) => {
      return await db.getDriverInspectionRecordsByEquipment(input.equipmentId);
    }),

  /**
   * 점검 기록 상세 조회 (항목 포함)
   */
  getRecord: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const record = await db.getDriverInspectionRecordById(input.id);
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "점검 기록을 찾을 수 없습니다.",
        });
      }
      return record;
    }),

  /**
   * 점검 기록 생성 (Driver)
   */
  createRecord: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        equipmentId: z.string(),
        inspectionDate: z.string(),
        checkFrequency: z.enum(["daily", "weekly", "monthly"]),
        // 운행 정보
        accumulatedHours: z.number().optional(),
        accumulatedMileage: z.number().optional(),
        operationHoursToday: z.number().optional(),
        mileageToday: z.number().optional(),
        // 소모품 정보
        lastOilChangeDate: z.string().optional(),
        lastOilChangeHours: z.number().optional(),
        lastOilChangeMileage: z.number().optional(),
        lastHydraulicOilChangeDate: z.string().optional(),
        lastFilterChangeDate: z.string().optional(),
        // 점검 항목
        items: z.array(
          z.object({
            templateItemId: z.string().optional(),
            category: z.string().optional(),
            itemText: z.string(),
            result: z.string().optional(),
            resultText: z.string().optional(),
            numericValue: z.number().optional(),
            actionRequired: z.string().optional(),
            photoUrl: z.string().optional(),
          })
        ),
        notes: z.string().optional(),
        driverSignature: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const recordId = nanoid();

      // users.id -> workers.id 변환
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

      // 기록 생성
      await db.createDriverInspectionRecord({
        id: recordId,
        templateId: input.templateId,
        equipmentId: input.equipmentId,
        driverId: worker.id,
        inspectionDate: new Date(input.inspectionDate),
        checkFrequency: input.checkFrequency,
        accumulatedHours: input.accumulatedHours,
        accumulatedMileage: input.accumulatedMileage,
        operationHoursToday: input.operationHoursToday,
        mileageToday: input.mileageToday,
        lastOilChangeDate: input.lastOilChangeDate ? new Date(input.lastOilChangeDate) : undefined,
        lastOilChangeHours: input.lastOilChangeHours,
        lastOilChangeMileage: input.lastOilChangeMileage,
        lastHydraulicOilChangeDate: input.lastHydraulicOilChangeDate ? new Date(input.lastHydraulicOilChangeDate) : undefined,
        lastFilterChangeDate: input.lastFilterChangeDate ? new Date(input.lastFilterChangeDate) : undefined,
        notes: input.notes,
        driverSignature: input.driverSignature,
        signedAt: input.driverSignature ? new Date() : undefined,
        status: "completed",
        submittedAt: new Date(),
      });

      // 항목별 결과 저장
      for (const item of input.items) {
        await db.createDriverInspectionRecordItem({
          id: nanoid(),
          recordId,
          ...item,
        });
      }

      return { id: recordId };
    }),

  /**
   * 점검 기록 수정 (Driver)
   */
  updateRecord: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
        driverSignature: z.string().optional(),
        status: z.enum(["draft", "completed"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      
      // 권한 확인: 자신의 기록만 수정 가능 (또는 admin)
      const record = await db.getDriverInspectionRecordById(id);
      // record는 { ...record, items: [...] } 형태로 반환되므로 driverId는 record 자체에 있음
      const driverId = (record as any)?.driverId || (record as any)?.items?.[0]?.driverId;
      if (record && driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "수정 권한이 없습니다.",
        });
      }

      return await db.updateDriverInspectionRecord(id, data);
    }),

  /**
   * 점검 기록 삭제 (Admin)
   */
  deleteRecord: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.deleteDriverInspectionRecord(input.id);
    }),
});

