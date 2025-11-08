import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";

/**
 * WebAuthn 생체 인증 API
 * FIDO2 표준 기반 지문/얼굴 인식
 *
 * 참고: 실제 WebAuthn 구현은 다음 라이브러리 사용 권장:
 * - @simplewebauthn/server
 * - @simplewebauthn/browser (client-side)
 */
export const webauthnRouter = router({
  /**
   * 등록 챌린지 생성
   * WebAuthn 등록을 시작하기 위한 챌린지(난수) 생성
   */
  generateRegistrationChallenge: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: Implement WebAuthn registration challenge
      // 1. 난수 생성 (crypto.randomBytes)
      // 2. 유저 정보와 함께 반환
      // 3. 챌린지를 세션/DB에 임시 저장

      const challenge = nanoid(32);

      return {
        challenge,
        rp: {
          name: "Construction Equipment Management",
          id: "localhost", // 프로덕션에서는 도메인 사용
        },
        user: {
          id: ctx.user.id,
          name: ctx.user.email || ctx.user.name,
          displayName: ctx.user.name,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" as const }, // ES256
          { alg: -257, type: "public-key" as const }, // RS256
        ],
        timeout: 60000,
        attestation: "none" as const,
        authenticatorSelection: {
          authenticatorAttachment: "platform" as const, // 기기 내장 (지문/얼굴)
          requireResidentKey: false,
          userVerification: "preferred" as const,
        },
      };
    }),

  /**
   * 등록 완료 (크레덴셜 저장)
   */
  registerCredential: protectedProcedure
    .input(z.object({
      credentialId: z.string(),
      publicKey: z.string(),
      deviceName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement credential verification and storage
      // 1. 챌린지 검증
      // 2. 공개키 검증
      // 3. DB에 저장

      const supabase = db.getSupabaseClient();
      const { error } = await supabase.from('webauthn_credentials').insert({
        id: input.credentialId,
        user_id: ctx.user.id,
        public_key: input.publicKey,
        counter: 0,
        device_name: input.deviceName || "Unknown Device",
        device_type: "platform",
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[WebAuthn] registerCredential error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "크레덴셜 저장에 실패했습니다.",
        });
      }

      return { success: true };
    }),

  /**
   * 인증 챌린지 생성
   */
  generateAuthenticationChallenge: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: Implement WebAuthn authentication challenge
      const challenge = nanoid(32);

      // 사용자의 등록된 크레덴셜 조회
      const supabase = db.getSupabaseClient();
      const { data: credentials } = await supabase
        .from('webauthn_credentials')
        .select('id')
        .eq('user_id', ctx.user.id);

      return {
        challenge,
        timeout: 60000,
        rpId: "localhost",
        allowCredentials: credentials?.map((c: any) => ({
          id: c.id,
          type: "public-key" as const,
          transports: ["internal"] as const[],
        })) || [],
        userVerification: "preferred" as const,
      };
    }),

  /**
   * 인증 검증
   */
  verifyAuthentication: protectedProcedure
    .input(z.object({
      credentialId: z.string(),
      signature: z.string(),
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement authentication verification
      // 1. 챌린지 검증
      // 2. 서명 검증
      // 3. 카운터 업데이트

      return { verified: true };
    }),

  /**
   * 내 크레덴셜 목록 조회
   */
  myCredentials: protectedProcedure
    .query(async ({ ctx }) => {
      const supabase = db.getSupabaseClient();
      const { data, error } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[WebAuthn] myCredentials error:', error);
        return [];
      }

      return db.toCamelCaseArray(data || []);
    }),

  /**
   * 크레덴셜 삭제
   */
  deleteCredential: protectedProcedure
    .input(z.object({
      credentialId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const supabase = db.getSupabaseClient();
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('id', input.credentialId)
        .eq('user_id', ctx.user.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "크레덴셜 삭제에 실패했습니다.",
        });
      }

      return { success: true };
    }),
});
