import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

/**
 * EP 대시보드 전용 Router
 * EP와 Admin이 통합 현장 상황판 데이터를 조회
 */
export const epDashboardRouter = router({
  /**
   * EP 통합 대시보드 데이터 조회
   */
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const userRole = ctx.user.role?.toLowerCase();

    // EP 또는 Admin만 접근 가능
    if (userRole !== "ep" && userRole !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "EP 또는 Admin만 조회할 수 있습니다.",
      });
    }

    const filters: { epCompanyId?: string } = {};

    // EP는 자신의 회사만 조회
    if (userRole === "ep" && ctx.user.companyId) {
      filters.epCompanyId = ctx.user.companyId;
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
