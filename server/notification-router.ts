import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { nanoid } from "nanoid";
import * as db from "./db";
import type { InsertNotification } from "../drizzle/schema";

/**
 * 알림 시스템 라우터
 * - 알림 목록 조회
 * - 읽음 처리
 * - 알림 발송 (관리자용)
 * - FCM 토큰 등록
 */
export const notificationRouter = router({
  /**
   * 알림 목록 조회 (본인용)
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0, unreadOnly = false } = input || {};

      return db.getNotificationsForUser({
        userId: ctx.user.id,
        userRole: ctx.user.role?.toLowerCase(),
        userCompanyId: ctx.user.companyId || undefined,
        limit,
        offset,
        unreadOnly,
      });
    }),

  /**
   * 읽지 않은 알림 수 조회
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return db.getUnreadNotificationCount({
      userId: ctx.user.id,
      userRole: ctx.user.role?.toLowerCase(),
      userCompanyId: ctx.user.companyId || undefined,
    });
  }),

  /**
   * 알림 읽음 처리
   */
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationAsRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  /**
   * 모든 알림 읽음 처리
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsAsRead({
      userId: ctx.user.id,
      userRole: ctx.user.role?.toLowerCase(),
      userCompanyId: ctx.user.companyId || undefined,
    });
    return { success: true };
  }),

  /**
   * FCM 토큰 등록/업데이트
   */
  registerFcmToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserFcmToken(ctx.user.id, input.token);
      return { success: true };
    }),

  // ============================================================
  // 관리자용 API
  // ============================================================

  /**
   * 알림 발송 (관리자/BP/EP/Owner용)
   */
  send: protectedProcedure
    .input(
      z.object({
        title: z.string().max(200).optional().default(""),
        content: z.string().optional().default(""),
        type: z.enum(["announcement", "document_expiry", "emergency", "task", "system"]),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        targetType: z.enum(["all", "company", "role", "user"]),
        targetId: z.string().optional(), // targetType이 'all'이 아닌 경우 필수
        linkType: z.string().optional(),
        linkId: z.string().optional(),
        expiresAt: z.string().optional(), // ISO date string
        sendSms: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.user.role?.toLowerCase();

      // 제목 또는 내용 중 하나는 필수
      if (!input.title?.trim() && !input.content?.trim()) {
        throw new Error("제목 또는 내용을 입력해주세요.");
      }

      // 권한 체크: admin만 전체 알림 발송 가능
      if (input.targetType === "all" && userRole !== "admin") {
        throw new Error("전체 알림은 관리자만 발송할 수 있습니다.");
      }

      // 긴급 알림은 admin, bp, ep만 발송 가능
      if (input.type === "emergency" && !["admin", "bp", "ep"].includes(userRole || "")) {
        throw new Error("긴급 알림은 관리자, BP, EP만 발송할 수 있습니다.");
      }

      // targetType이 'all'이 아닌 경우 targetId 필수
      if (input.targetType !== "all" && !input.targetId) {
        throw new Error("대상을 선택해주세요.");
      }

      const notification: InsertNotification = {
        id: nanoid(),
        title: input.title || "",
        content: input.content || "",
        type: input.type,
        priority: input.priority,
        targetType: input.targetType,
        targetId: input.targetId || null,
        senderId: ctx.user.id,
        senderCompanyId: ctx.user.companyId || null,
        linkType: input.linkType || null,
        linkId: input.linkId || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        sendSms: input.sendSms,
      };

      const result = await db.createNotification(notification);

      // TODO: FCM 푸시 알림 발송
      // if (result) {
      //   await sendFcmNotification(result);
      // }

      return result;
    }),

  /**
   * 발송한 알림 목록 조회 (발송함)
   */
  sentList: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0 } = input || {};
      return db.getSentNotifications({
        senderId: ctx.user.id,
        limit,
        offset,
      });
    }),

  /**
   * 알림 목록 조회 (관리자용)
   */
  adminList: adminProcedure
    .input(
      z.object({
        type: z.string().optional(),
        priority: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const { type, priority, limit = 50, offset = 0 } = input || {};
      return db.getAllNotifications({ type, priority, limit, offset });
    }),

  /**
   * 알림 삭제 (관리자용)
   */
  delete: adminProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input }) => {
      await db.deleteNotification(input.notificationId);
      return { success: true };
    }),

  /**
   * 서류 만료 알림 수동 실행 (관리자용)
   * Cron Job 테스트용
   */
  triggerDocumentExpiryNotifications: adminProcedure.mutation(async () => {
    const count = await db.createDocumentExpiryNotifications();
    return { success: true, createdCount: count };
  }),

  /**
   * 대상 선택을 위한 데이터 조회 (사용자 목록, 회사 목록 등)
   */
  getTargetOptions: protectedProcedure
    .input(
      z.object({
        targetType: z.enum(["company", "role", "user"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const userRole = ctx.user.role?.toLowerCase();
      const supabase = db.getSupabase();
      if (!supabase) return [];

      if (input.targetType === "role") {
        return [
          { id: "worker", name: "작업자 (Worker)" },
          { id: "inspector", name: "안전점검원 (Inspector)" },
          { id: "owner", name: "오너사 (Owner)" },
          { id: "bp", name: "협력사 (BP)" },
          { id: "ep", name: "발주사 (EP)" },
        ];
      }

      if (input.targetType === "company") {
        let query = supabase.from("companies").select("id, name, company_type");

        // admin이 아니면 자신의 회사만
        if (userRole !== "admin" && ctx.user.companyId) {
          query = query.eq("id", ctx.user.companyId);
        }

        const { data } = await query.order("name");
        return (data || []).map((c: any) => ({
          id: c.id,
          name: `${c.name} (${c.company_type})`,
        }));
      }

      if (input.targetType === "user") {
        let query = supabase.from("users").select("id, name, email, role, company_id");

        // Owner는 자신의 회사 작업자만
        if (userRole === "owner" && ctx.user.companyId) {
          query = query.eq("company_id", ctx.user.companyId);
        }
        // BP/EP는 자신의 회사 + 연결된 deployment의 작업자
        else if (["bp", "ep"].includes(userRole || "") && ctx.user.companyId) {
          // 일단 자신의 회사 사용자만 (추후 deployment 연결 작업자 추가 필요)
          query = query.eq("company_id", ctx.user.companyId);
        }
        // admin은 전체

        const { data } = await query.order("name").limit(100);
        return (data || []).map((u: any) => ({
          id: u.id,
          name: `${u.name || u.email} (${u.role})`,
        }));
      }

      return [];
    }),
});

export type NotificationRouter = typeof notificationRouter;
