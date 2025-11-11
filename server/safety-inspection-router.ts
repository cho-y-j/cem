import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";

/**
 * 안전점검 관리 API
 * Admin: 템플릿 관리
 * Inspector: 점검 작성 및 제출
 * EP: 점검 확인
 */
export const safetyInspectionRouter = router({
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
        inspectorType: z.enum(["inspector", "driver"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await db.getSafetyInspectionTemplates(input);
    }),

  /**
   * 템플릿 상세 조회 (항목 포함)
   */
  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = await db.getSafetyInspectionTemplateById(input.id);
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
        inspectorType: z.enum(["inspector", "driver"]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();
      return await db.createSafetyInspectionTemplate({
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
      return await db.updateSafetyInspectionTemplate(id, data);
    }),

  /**
   * 템플릿 삭제 (비활성화) (Admin)
   */
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.deleteSafetyInspectionTemplate(input.id);
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
        checkFrequency: z.enum(["daily", "weekly", "monthly", "as_needed"]),
        checkTiming: z.string().optional(), // "before_use,during_use,after_use"
        resultType: z.enum(["status", "text"]).default("status"),
        displayOrder: z.number().default(0),
        isRequired: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const id = nanoid();
      return await db.createSafetyInspectionTemplateItem({
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
        itemText: z.string().optional(),
        checkFrequency: z.enum(["daily", "weekly", "monthly", "as_needed"]).optional(),
        checkTiming: z.string().optional(),
        displayOrder: z.number().optional(),
        isRequired: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateSafetyInspectionTemplateItem(id, data);
    }),

  /**
   * 템플릿 항목 삭제 (Admin)
   */
  deleteTemplateItem: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.deleteSafetyInspectionTemplateItem(input.id);
      return { success: true };
    }),

  // ============================================================
  // 점검 작성 및 관리 (Inspector/Driver)
  // ============================================================

  /**
   * 차량번호로 장비 검색
   */
  searchEquipment: protectedProcedure
    .input(z.object({ partialNumber: z.string() }))
    .query(async ({ input }) => {
      return await db.searchEquipmentByVehicleNumber(input.partialNumber);
    }),

  /**
   * 장비 상세 컨텍스트 조회 (장비 + 배정 운전자 + 서류)
   */
  getEquipmentContext: protectedProcedure
    .input(z.object({ equipmentId: z.string() }))
    .query(async ({ input }) => {
      const context = await db.getEquipmentInspectionContext(input.equipmentId);
      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "장비 정보를 찾을 수 없습니다.",
        });
      }
      return context;
    }),

  /**
   * NFC 태그로 장비 컨텍스트 조회
   */
  getEquipmentByNfcTag: protectedProcedure
    .input(z.object({ nfcTagId: z.string().min(1) }))
    .query(async ({ input }) => {
      const context = await db.getEquipmentInspectionContextByNfcTag(input.nfcTagId);
      if (!context) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "NFC 태그에 해당하는 장비를 찾을 수 없습니다.",
        });
      }
      return context;
    }),

  /**
   * 장비에 적용 가능한 템플릿 조회
   */
  getApplicableTemplates: protectedProcedure
    .input(z.object({
      equipmentId: z.string(),
      inspectorType: z.enum(['inspector', 'driver']).optional()
    }))
    .query(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();
      const inspectorType = input.inspectorType ||
        (userRole === 'inspector' ? 'inspector' : 'driver');
      return await db.getApplicableTemplatesForEquipment(input.equipmentId, inspectorType);
    }),

  /**
   * 점검 생성 (초안)
   */
  createInspection: protectedProcedure
    .input(
      z.object({
        templateId: z.string().optional(),
        equipmentId: z.string(),
        checkFrequency: z.enum(["daily", "weekly", "monthly", "as_needed"]),
        inspectionDate: z.string(), // ISO date string
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 장비 정보 조회
      const equipment = await db.getEquipmentById(input.equipmentId);
      if (!equipment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "장비를 찾을 수 없습니다.",
        });
      }

      const id = nanoid();
      const userRole = ctx.user.role?.toLowerCase();
      const inspectorType = userRole === "inspector" ? "inspector" : "driver";

      // 장비 타입 이름 가져오기
      let equipmentName = "";
      if (equipment.equipTypeId) {
        const equipType = await db.getEquipTypeById(equipment.equipTypeId);
        equipmentName = equipType?.name || "";
      }

      return await db.createSafetyInspection({
        id,
        templateId: input.templateId,
        equipmentId: input.equipmentId,
        inspectorId: ctx.user.id,
        inspectorType,
        inspectionDate: input.inspectionDate,
        checkFrequency: input.checkFrequency,
        vehicleNumber: equipment.regNum,
        equipmentName,
        status: "draft",
      });
    }),

  /**
   * 점검 목록 조회
   */
  listInspections: protectedProcedure
    .input(
      z.object({
        equipmentId: z.string().optional(),
        inspectorId: z.string().optional(),
        status: z.string().optional(),
        checkFrequency: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Inspector/Driver는 자신의 점검만 조회
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole === "inspector" || userRole === "driver") {
        return await db.getSafetyInspections({
          ...input,
          inspectorId: ctx.user.id,
        });
      }

      // EP/Admin은 전체 조회
      return await db.getSafetyInspections(input);
    }),

  /**
   * 점검 상세 조회 (결과 포함)
   */
  getInspection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const inspection = await db.getSafetyInspectionById(input.id);
      if (!inspection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "점검 기록을 찾을 수 없습니다.",
        });
      }
      return inspection;
    }),

  /**
   * 점검 항목 결과 저장/수정
   */
  saveInspectionResult: protectedProcedure
    .input(
      z.object({
        inspectionId: z.string(),
        templateItemId: z.string().optional(),
        itemText: z.string(),
        checkTiming: z.enum(["before_use", "during_use", "after_use"]).optional(),
        result: z.enum(["good", "adjust", "replace", "manufacture", "discard", "na"]).optional(),
        resultText: z.string().optional(),
        actionRequired: z.string().optional(),
        resultId: z.string().optional(), // 수정 시 기존 결과 ID
      })
    )
    .mutation(async ({ input }) => {
      const { resultId, inspectionId, ...data } = input;

      if (resultId) {
        // 수정
        return await db.updateSafetyInspectionResult(resultId, data);
      } else {
        // 신규
        const id = nanoid();
        return await db.createSafetyInspectionResult({
          id,
          inspectionId,
          ...data,
        });
      }
    }),

  /**
   * 점검 제출 (전자서명 포함)
   */
  submitInspection: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        signatureData: z.string(), // Base64 이미지
        inspectorName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // 점검 기록 확인
      const inspection = await db.getSafetyInspectionById(input.id);
      if (!inspection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "점검 기록을 찾을 수 없습니다.",
        });
      }

      // inspection 객체에서 status 확인 (results가 아닌 inspection 자체의 status)
      const inspectionStatus = (inspection as any).status;
      if (inspectionStatus !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "초안 상태의 점검만 제출할 수 있습니다.",
        });
      }

      // 전체 결과 분석
      const hasFailures = inspection.results?.some(
        (r: any) => r.result === "discard" || r.result === "replace"
      );

      const overallResult = hasFailures ? "fail" : "pass";

      return await db.submitSafetyInspection(
        input.id,
        input.signatureData,
        input.inspectorName
      );
    }),

  // ============================================================
  // EP 확인
  // ============================================================

  /**
   * EP가 제출된 점검 확인
   */
  reviewInspection: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userRole = ctx.user.role?.toLowerCase();
      if (userRole !== "ep" && userRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "EP 또는 Admin만 확인할 수 있습니다.",
        });
      }

      return await db.reviewSafetyInspection(
        input.id,
        ctx.user.id,
        input.comments
      );
    }),

  /**
   * 제출된 점검 목록 조회 (EP용)
   * 제출됨(submitted)과 확인완료(reviewed) 모두 조회
   */
  listSubmittedInspections: protectedProcedure.query(async ({ ctx }) => {
    const userRole = ctx.user.role?.toLowerCase();
    if (userRole !== "ep" && userRole !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "EP 또는 Admin만 조회할 수 있습니다.",
      });
    }

    // submitted와 reviewed 둘 다 조회 (draft은 제외)
    const inspections = await db.getSafetyInspections({
      inspectorType: "inspector", // 점검원이 작성한 것만
    });

    // draft 상태 제외 (submitted와 reviewed만)
    return inspections.filter((i: any) =>
      i.status === "submitted" || i.status === "reviewed"
    );
  }),
});
