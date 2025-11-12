/**
 * 사용자 관리 라우터
 * Admin이 사용자를 생성하고 관리
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// 관리자 전용 프로시저
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  console.log('[Users] Admin check - email:', ctx.user?.email, 'role:', ctx.user?.role);
  if (ctx.user?.role?.toLowerCase() !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다." });
  }
  return next({ ctx });
});

export const usersRouter = router({
  /**
   * 사용자 목록 조회
   */
  list: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  /**
   * 사용자 생성 (Admin)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "이름을 입력해주세요."),
        email: z.string().email("올바른 이메일을 입력해주세요."),
        password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
        role: z.enum(["admin", "owner", "bp", "ep", "inspector"]),
        companyId: z.string().optional(),
        pin: z.string().length(4, "PIN은 4자리여야 합니다.").optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = db.getSupabaseAdmin();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase Admin not available",
        });
      }

      // 역할이 admin이 아니면 companyId 필수
      if (input.role !== "admin" && !input.companyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "소속 회사를 선택해주세요.",
        });
      }

      // 이메일 중복 확인
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", input.email)
        .single();

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "이미 사용 중인 이메일입니다.",
        });
      }

      // 비밀번호 해싱
      const { hashPassword } = await import("./_core/password");
      const hashedPassword = hashPassword(input.password);

      // Supabase Auth에 사용자 생성
      console.log('[Users] Creating user with Service Role Key:', input.email);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true, // 이메일 인증 자동 완료
      });

      if (authError || !authData.user) {
        console.error("[Users] Auth create error:", authError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: authError?.message || "사용자 생성에 실패했습니다.",
        });
      }

      // users 테이블에 사용자 정보 저장 (해싱된 비밀번호 포함)
      const userId = authData.user.id;
      const { error: dbError } = await supabase.from("users").insert({
        id: userId,
        name: input.name,
        email: input.email,
        password: hashedPassword, // 해싱된 비밀번호 저장
        role: input.role,
        company_id: input.companyId || null,
        pin: input.pin || null, // Inspector용 PIN
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("[Users] DB insert error:", dbError);
        // Auth 사용자 삭제 (롤백)
        await supabase.auth.admin.deleteUser(userId);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "사용자 정보 저장에 실패했습니다.",
        });
      }

      console.log(`[Users] Created: ${input.email} (${input.role})`);

      return { id: userId, success: true };
    }),

  /**
   * 사용자 정보 수정 (Admin)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "이름을 입력해주세요.").optional(),
        email: z.string().email("올바른 이메일을 입력해주세요.").optional(),
        password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다.").optional(),
        role: z.enum(["admin", "owner", "bp", "ep", "worker", "inspector"]).optional(),
        companyId: z.string().optional(),
        pin: z.string().length(4, "PIN은 4자리여야 합니다.").optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = db.getSupabaseAdmin();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase Admin not available",
        });
      }

      console.log(`[Users] Update attempt for user: ${input.id}`);

      // UUID 형식 확인 (Supabase Auth는 UUID를 사용)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(input.id);

      if (!isUUID) {
        console.warn(`[Users] User ID is not UUID format: ${input.id}`);
        // UUID가 아니면 Supabase Auth 업데이트를 건너뛰고 DB만 업데이트
        console.log(`[Users] Skipping Supabase Auth update (non-UUID user)`);
      }

      // 이메일이 변경되면 중복 확인
      if (input.email) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", input.email)
          .neq("id", input.id)
          .single();

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "이미 사용 중인 이메일입니다.",
          });
        }

        // Supabase Auth 이메일 변경 (UUID인 경우만)
        if (isUUID) {
          const { error: authError } = await supabase.auth.admin.updateUserById(
            input.id,
            { email: input.email }
          );

          if (authError) {
            console.error("[Users] Auth email update error:", authError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `이메일 변경에 실패했습니다: ${authError.message}`,
            });
          }
          console.log(`[Users] Email updated in Auth: ${input.email}`);
        } else {
          console.log(`[Users] Skipping Auth email update (non-UUID user)`);
        }
      }

      // 비밀번호 변경
      if (input.password) {
        const { hashPassword } = await import("./_core/password");
        const hashedPassword = hashPassword(input.password);

        // Supabase Auth 비밀번호 변경 (UUID인 경우만)
        if (isUUID) {
          const { error: authError } = await supabase.auth.admin.updateUserById(
            input.id,
            { password: input.password }
          );

          if (authError) {
            console.error("[Users] Auth password update error:", authError);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `비밀번호 변경에 실패했습니다: ${authError.message}`,
            });
          }
          console.log(`[Users] Password updated in Auth`);
        } else {
          console.log(`[Users] Skipping Auth password update (non-UUID user)`);
        }
      }

      // users 테이블 업데이트
      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.email) updateData.email = input.email;
      if (input.password) {
        const { hashPassword } = await import("./_core/password");
        updateData.password = hashPassword(input.password); // 해싱된 비밀번호도 저장
      }
      if (input.role) updateData.role = input.role;
      if (input.companyId !== undefined) updateData.company_id = input.companyId || null;
      if (input.pin !== undefined) updateData.pin = input.pin || null;

      if (Object.keys(updateData).length > 0) {
        const { error: dbError } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", input.id);

        if (dbError) {
          console.error("[Users] DB update error:", dbError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "사용자 정보 저장에 실패했습니다.",
          });
        }
      }

      console.log(`[Users] Updated: ${input.id}`);

      return { success: true };
    }),

  /**
   * 역할 변경
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["admin", "owner", "bp", "ep", "worker", "inspector"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  /**
   * 회사 변경
   */
  updateCompany: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        companyId: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = db.getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const { error } = await supabase
        .from("users")
        .update({ company_id: input.companyId })
        .eq("id", input.userId);

      if (error) {
        console.error("[Users] Update company error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "회사 변경에 실패했습니다.",
        });
      }

      return { success: true };
    }),

  /**
   * 사용자 삭제
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = db.getSupabaseAdmin();
      if (!supabase) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      console.log(`[Users] Starting delete for user: ${input.id}`);

      // 먼저 사용자 정보 조회
      const { data: user } = await supabase
        .from("users")
        .select("email, role")
        .eq("id", input.id)
        .single();

      if (user) {
        console.log(`[Users] Deleting user: ${user.email} (${user.role})`);
      }

      // 1. 해당 사용자가 소유한 데이터 확인
      const { data: workers } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", input.id);

      const { data: equipment } = await supabase
        .from("equipment")
        .select("id")
        .eq("created_by", input.id);

      const { data: entryRequests } = await supabase
        .from("entry_requests")
        .select("id")
        .eq("owner_user_id", input.id);

      console.log(`[Users] User owns - Workers: ${workers?.length || 0}, Equipment: ${equipment?.length || 0}, Entry Requests: ${entryRequests?.length || 0}`);

      // 2. 관련 데이터가 있으면 경고 (하지만 삭제는 진행)
      if ((workers?.length || 0) > 0 || (equipment?.length || 0) > 0 || (entryRequests?.length || 0) > 0) {
        console.warn(`[Users] Warning: User has associated data that may be affected`);
      }

      // 3. workers 테이블에서 user_id 연결 제거
      if (workers && workers.length > 0) {
        const { error: workerError } = await supabase
          .from("workers")
          .update({ user_id: null })
          .eq("user_id", input.id);

        if (workerError) {
          console.error("[Users] Error removing worker associations:", workerError);
        } else {
          console.log(`[Users] Removed worker associations: ${workers.length}`);
        }
      }

      // 4. Supabase Auth에서 삭제 시도
      // UUID가 아닌 경우에도 시도 (일부 레거시 사용자는 UUID가 아닐 수 있음)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(input.id);

      if (isUUID) {
        // UUID인 경우 Auth에서 삭제 시도
        const { error: authError } = await supabase.auth.admin.deleteUser(input.id);
        if (authError) {
          console.warn(`[Users] Auth delete failed (continuing with DB delete): ${authError.message}`);
          // Auth 삭제 실패해도 DB 삭제는 계속 진행 (레거시 사용자일 수 있음)
        } else {
          console.log(`[Users] Successfully deleted from Auth`);
        }
      } else {
        // UUID가 아닌 경우: 이메일로 사용자 찾기 시도
        if (user?.email) {
          try {
            const { data: authUsers } = await supabase.auth.admin.listUsers();
            const authUser = authUsers?.users?.find((u) => u.email === user.email);
            if (authUser) {
              const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
              if (authError) {
                console.warn(`[Users] Auth delete failed for email ${user.email}: ${authError.message}`);
              } else {
                console.log(`[Users] Successfully deleted from Auth by email: ${user.email}`);
              }
            }
          } catch (error) {
            console.warn(`[Users] Could not find user in Auth by email: ${user.email}`, error);
          }
        }
        console.log(`[Users] Non-UUID user, attempted Auth delete by email if available`);
      }

      // 5. users 테이블에서 삭제
      const { error: dbError } = await supabase
        .from("users")
        .delete()
        .eq("id", input.id);

      if (dbError) {
        console.error("[Users] DB delete error:", dbError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `사용자 정보 삭제에 실패했습니다: ${dbError.message}`,
        });
      }

      console.log(`[Users] ✅ Successfully deleted user: ${input.id}`);

      return { success: true };
    }),

  /**
   * 본인 이메일 변경 (Worker 포함 모든 사용자)
   */
  updateEmail: protectedProcedure
    .input(z.object({
      email: z.string().email("올바른 이메일을 입력해주세요."),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = db.getSupabaseAdmin();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase Admin not available",
        });
      }

      // 이메일 중복 확인
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", input.email)
        .neq("id", ctx.user.id)
        .single();

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "이미 사용 중인 이메일입니다.",
        });
      }

      // Supabase Auth 이메일 변경
      const { error: authError } = await supabase.auth.admin.updateUserById(
        ctx.user.id,
        { email: input.email }
      );

      if (authError) {
        console.error("[Users] Auth email update error:", authError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "이메일 변경에 실패했습니다.",
        });
      }

      // users 테이블 업데이트
      const { error: dbError } = await supabase
        .from("users")
        .update({ email: input.email })
        .eq("id", ctx.user.id);

      if (dbError) {
        console.error("[Users] DB email update error:", dbError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "이메일 정보 저장에 실패했습니다.",
        });
      }

      console.log(`[Users] Email updated: ${ctx.user.id} -> ${input.email}`);
      return { success: true };
    }),

  /**
   * 본인 비밀번호 변경 (Worker 포함 모든 사용자)
   */
  updatePassword: protectedProcedure
    .input(z.object({
      password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = db.getSupabaseAdmin();
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase Admin not available",
        });
      }

      // Supabase Auth 비밀번호 변경
      const { error: authError } = await supabase.auth.admin.updateUserById(
        ctx.user.id,
        { password: input.password }
      );

      if (authError) {
        console.error("[Users] Auth password update error:", authError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "비밀번호 변경에 실패했습니다.",
        });
      }

      console.log(`[Users] Password updated: ${ctx.user.id}`);
      return { success: true };
    }),
});

