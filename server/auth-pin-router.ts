import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

/**
 * PIN 로그인 라우터
 * 운전자가 간편 PIN 코드로 로그인할 수 있도록 지원
 */
export const authPinRouter = router({
  /**
   * PIN 코드로 로그인
   */
  loginWithPin: publicProcedure
    .input(
      z.object({
        pinCode: z.string().length(4, "PIN 코드는 4자리여야 합니다."),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // PIN으로 운전자 조회
      const worker = await db.getWorkerByPin(input.pinCode);

      if (!worker) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "PIN 코드가 올바르지 않습니다.",
        });
      }

      // JWT 토큰 생성 및 쿠키 설정
      const token = await sdk.signSession({
        openId: worker.id,
        appId: ENV.appId || "construction-management",
        name: worker.name || "Worker",
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      console.log(`[Auth] Worker logged in with PIN: ${worker.name} (${worker.id})`);

      return {
        success: true,
        user: {
          id: worker.id,
          name: worker.name,
          email: worker.email,
          role: worker.role,
        },
      };
    }),

  /**
   * 이메일 + PIN 코드로 로그인 (Inspector용)
   */
  loginWithEmailAndPin: publicProcedure
    .input(
      z.object({
        email: z.string().email("올바른 이메일을 입력해주세요."),
        pin: z.string().length(4, "PIN 코드는 4자리여야 합니다."),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 이메일 + PIN으로 사용자 조회
      const user = await db.getUserByEmailAndPin(input.email, input.pin);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "이메일 또는 PIN이 올바르지 않습니다.",
        });
      }

      // Inspector 또는 Worker 역할만 로그인 허용
      if (user.role !== "inspector" && user.role !== "worker") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "모바일 로그인 권한이 없습니다.",
        });
      }

      // JWT 토큰 생성 및 쿠키 설정
      const token = await sdk.signSession({
        openId: user.id,
        appId: ENV.appId || "construction-management",
        name: user.name || "User",
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      console.log(`[Auth] ${user.role} logged in: ${user.name} (${user.email})`);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * 현재 로그인한 사용자 정보 조회
   */
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    // 사용자 정보 반환
    return ctx.user;
  }),

  /**
   * 로그아웃
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  /**
   * PIN 변경 (로그인된 사용자)
   */
  changePin: publicProcedure
    .input(
      z.object({
        currentPin: z.string().length(4, "현재 PIN은 4자리여야 합니다."),
        newPin: z.string().length(4, "새 PIN은 4자리여야 합니다."),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "로그인이 필요합니다.",
        });
      }

      // Inspector 또는 Worker만 PIN 변경 가능
      if (ctx.user.role !== "inspector" && ctx.user.role !== "worker") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "PIN 변경 권한이 없습니다.",
        });
      }

      // 현재 PIN 확인
      const user = await db.getUserByEmailAndPin(ctx.user.email!, input.currentPin);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "현재 PIN이 올바르지 않습니다.",
        });
      }

      // PIN 변경
      await db.updateUserPin(ctx.user.id, input.newPin);

      console.log(`[Auth] PIN changed for ${ctx.user.role}: ${ctx.user.email}`);

      return { success: true };
    }),
});

