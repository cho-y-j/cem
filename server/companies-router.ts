import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

/**
 * Companies 라우터
 * Owner/BP/EP 회사 관리
 */
export const companiesRouter = router({
  /**
   * 회사 목록 조회
   */
  list: protectedProcedure
    .input(
      z.object({
        companyType: z.enum(["owner", "bp", "ep"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      console.log('[Companies] List query by:', ctx.user.email, 'role:', ctx.user.role, 'input:', input);

      // Admin만 전체 조회 가능, 다른 역할은 자신의 회사만
      if (ctx.user.role?.toLowerCase() !== "admin" && !input?.companyType) {
        const result = await db.getCompaniesByType(ctx.user.role);
        console.log('[Companies] Filtered by role:', ctx.user.role, 'count:', result.length);
        return result;
      }

      if (input?.companyType) {
        const result = await db.getCompaniesByType(input.companyType);
        console.log('[Companies] Filtered by type:', input.companyType, 'count:', result.length);
        return result;
      }

      const result = await db.getAllCompanies();
      console.log('[Companies] All companies count:', result.length);
      console.log('[Companies] Sample:', result[0]);
      return result;
    }),

  /**
   * 회사 상세 조회
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const company = await db.getCompanyById(input.id);

      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "회사를 찾을 수 없습니다.",
        });
      }

      return company;
    }),

  /**
   * 회사 생성 (Admin만 가능)
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "회사명은 필수입니다."),
        businessNumber: z.string().optional(),
        companyType: z.enum(["owner", "bp", "ep"]),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        contactPerson: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Admin 권한 확인
      console.log('[Companies] Create attempt by:', ctx.user.email, 'role:', ctx.user.role);
      
      if (ctx.user.role?.toLowerCase() !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "회사 생성 권한이 없습니다.",
        });
      }

      const id = `company-${nanoid()}`;

      await db.createCompany({
        id,
        name: input.name,
        businessNumber: input.businessNumber,
        companyType: input.companyType,
        address: input.address,
        phone: input.phone,
        email: input.email,
        contactPerson: input.contactPerson,
      });

      console.log(`[Companies] Created: ${input.name} (${input.companyType})`);

      return { id, success: true };
    }),

  /**
   * 회사 수정 (Admin만 가능)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        businessNumber: z.string().optional(),
        companyType: z.enum(["owner", "bp", "ep"]).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        contactPerson: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Admin 권한 확인
      if (ctx.user.role?.toLowerCase() !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "회사 수정 권한이 없습니다.",
        });
      }

      await db.updateCompany(input.id, input);

      console.log(`[Companies] Updated: ${input.id}`);

      return { success: true };
    }),

  /**
   * 회사 삭제 (Admin만 가능)
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Admin 권한 확인
      if (ctx.user.role?.toLowerCase() !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "회사 삭제 권한이 없습니다.",
        });
      }

      // 회사에 속한 사용자가 있는지 확인
      const users = await db.getUsersByCompany(input.id);
      if (users.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "회사에 속한 사용자가 있어 삭제할 수 없습니다.",
        });
      }

      await db.deleteCompany(input.id);

      console.log(`[Companies] Deleted: ${input.id}`);

      return { success: true };
    }),

  /**
   * 타입별 회사 목록 (드롭다운용)
   */
  listByType: protectedProcedure
    .input(
      z.object({
        companyType: z.enum(["owner", "bp", "ep"]),
      })
    )
    .query(async ({ input }) => {
      return await db.getCompaniesByType(input.companyType);
    }),
});

