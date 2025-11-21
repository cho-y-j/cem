import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

/**
 * EP 대시보드 전용 Router
 * EP와 Admin이 통합 현장 상황판 데이터를 조회
 */
export const epDashboardRouter = router({
  /**
   * 통합 대시보드 데이터 조회
   * Admin, EP, BP, Owner 모두 접근 가능 (역할별 필터링)
   */
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const userRole = ctx.user.role?.toLowerCase();

    // 허용된 역할 확인
    const allowedRoles = ["admin", "ep", "bp", "owner"];
    if (!allowedRoles.includes(userRole || "")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "접근 권한이 없습니다.",
      });
    }

    const filters: { epCompanyId?: string; bpCompanyId?: string; ownerUserId?: string } = {};

    // 역할별 필터링
    if (userRole === "ep" && ctx.user.companyId) {
      // EP는 자신의 회사가 관리하는 프로젝트만
      filters.epCompanyId = ctx.user.companyId;
    } else if (userRole === "bp" && ctx.user.companyId) {
      // BP는 자신의 회사가 참여한 프로젝트만
      filters.bpCompanyId = ctx.user.companyId;
    } else if (userRole === "owner") {
      // Owner는 자신이 소유한 장비/인력만
      filters.ownerUserId = ctx.user.id;
    }
    // Admin은 전체 조회 (filters 없음)

    const dashboardData = await db.getEpDashboardData(filters);

    if (!dashboardData) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "대시보드 데이터를 불러오는 중 오류가 발생했습니다.",
      });
    }

    return dashboardData;
  }),
});
