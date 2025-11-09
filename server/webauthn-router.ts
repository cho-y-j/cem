import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

/**
 * WebAuthn 설정
 * 프로덕션에서는 환경 변수로 관리
 */
const RP_NAME = process.env.RP_NAME || "ERMS 건설장비관리";

// RP_ID: 도메인만 추출 (포트 제외)
// 예: https://cem-21tp.onrender.com -> cem-21tp.onrender.com
// 예: http://localhost:3000 -> localhost
function getRPID(): string {
  if (process.env.RP_ID) {
    return process.env.RP_ID;
  }
  
  // 환경 변수에서 URL 추출 시도
  if (process.env.ORIGIN) {
    try {
      const url = new URL(process.env.ORIGIN);
      return url.hostname;
    } catch {
      // URL 파싱 실패 시 그대로 사용
    }
  }
  
  // Render 환경 변수 확인
  if (process.env.RENDER_EXTERNAL_URL) {
    try {
      const url = new URL(process.env.RENDER_EXTERNAL_URL);
      return url.hostname;
    } catch {
      // URL 파싱 실패 시 그대로 사용
    }
  }
  
  // 기본값: localhost (개발 환경)
  return "localhost";
}

// ORIGIN: 전체 URL (프로토콜 포함)
// 예: https://cem-21tp.onrender.com
// 예: http://localhost:3000
function getOrigin(): string {
  if (process.env.ORIGIN) {
    return process.env.ORIGIN;
  }
  
  // Render 환경 변수 확인
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  
  // 기본값: localhost (개발 환경)
  return "http://localhost:3000";
}

const RP_ID = getRPID();
const ORIGIN = getOrigin();

// 디버깅 로그
console.log('[WebAuthn] Configuration:', {
  RP_NAME,
  RP_ID,
  ORIGIN,
  NODE_ENV: process.env.NODE_ENV,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
});

// 챌린지 임시 저장소 (프로덕션에서는 Redis/DB 사용)
// Map<userId, { challenge: string, createdAt: Date, timeoutId: NodeJS.Timeout }>
const challenges = new Map<string, { challenge: string; createdAt: Date; timeoutId: NodeJS.Timeout }>();

// 챌린지 만료 시간 (밀리초) - PIN 입력 + 지문 등록 시간 고려하여 3분으로 설정
const CHALLENGE_TIMEOUT = 3 * 60 * 1000; // 3분

/**
 * WebAuthn 생체 인증 API
 * FIDO2 표준 기반 지문/얼굴 인식
 */
export const webauthnRouter = router({
  /**
   * 등록 챌린지 생성
   * WebAuthn 등록을 시작하기 위한 옵션 생성
   */
  generateRegistrationChallenge: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const user = ctx.user;

        // SimpleWebAuthn을 사용하여 등록 옵션 생성
        const options = await generateRegistrationOptions({
          rpName: RP_NAME,
          rpID: RP_ID,
          userName: user.email || user.name || user.id,
          userDisplayName: user.name || user.email || "사용자",
          // Uint8Array로 변환
          userID: new TextEncoder().encode(user.id),
          timeout: CHALLENGE_TIMEOUT,
          attestationType: 'none',
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // 기기 내장 생체 인식
            requireResidentKey: false,
            residentKey: 'preferred',
            userVerification: 'required', // 생체 인증 필수
          },
          supportedAlgorithmIDs: [-7, -257], // ES256, RS256
        });

        // 기존 챌린지가 있으면 타임아웃 취소
        const existingChallenge = challenges.get(user.id);
        if (existingChallenge) {
          clearTimeout(existingChallenge.timeoutId);
        }

        // 챌린지 임시 저장 (3분 후 자동 삭제)
        const timeoutId = setTimeout(() => {
          challenges.delete(user.id);
          console.log(`[WebAuthn] Registration challenge expired for user ${user.id}`);
        }, CHALLENGE_TIMEOUT);

        challenges.set(user.id, {
          challenge: options.challenge,
          createdAt: new Date(),
          timeoutId,
        });

        console.log(`[WebAuthn] Registration challenge generated for user ${user.id}`, {
          challengeLength: options.challenge.length,
          timeout: CHALLENGE_TIMEOUT / 1000 + '초',
          createdAt: new Date().toISOString(),
        });

        return options;
      } catch (error) {
        console.error('[WebAuthn] Error generating registration challenge:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "등록 챌린지 생성에 실패했습니다.",
        });
      }
    }),

  /**
   * 등록 완료 (크레덴셜 검증 및 저장)
   */
  registerCredential: protectedProcedure
    .input(z.object({
      response: z.any(), // RegistrationResponseJSON
      deviceName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = ctx.user;
        const challengeData = challenges.get(user.id);

        if (!challengeData) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "챌린지가 만료되었거나 존재하지 않습니다. 다시 시도해주세요.",
          });
        }

        const expectedChallenge = challengeData.challenge;
        const elapsedTime = Date.now() - challengeData.createdAt.getTime();
        
        console.log(`[WebAuthn] Verifying registration for user ${user.id}`, {
          elapsedTime: Math.round(elapsedTime / 1000) + '초',
          challengeAge: Math.round(elapsedTime / 1000) + '초 전 생성',
        });

        // 등록 응답 검증
        let verification: VerifiedRegistrationResponse;
        try {
          verification = await verifyRegistrationResponse({
            response: input.response as RegistrationResponseJSON,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            requireUserVerification: true,
          });
        } catch (error: any) {
          console.error('[WebAuthn] Registration verification failed:', error);
          console.error('[WebAuthn] Error details:', {
            message: error.message,
            name: error.name,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            responseOrigin: input.response?.clientExtensionResults,
          });
          
          // 더 명확한 에러 메시지
          let errorMessage = `등록 검증 실패: ${error.message}`;
          if (error.message?.includes('origin')) {
            errorMessage += `\n현재 설정된 ORIGIN: ${ORIGIN}`;
            errorMessage += `\n브라우저에서 요청한 ORIGIN과 일치하지 않습니다.`;
          }
          if (error.message?.includes('rpId') || error.message?.includes('RP ID')) {
            errorMessage += `\n현재 설정된 RP_ID: ${RP_ID}`;
            errorMessage += `\n브라우저에서 요청한 RP_ID와 일치하지 않습니다.`;
          }
          
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: errorMessage,
          });
        }

        if (!verification.verified || !verification.registrationInfo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "등록 검증에 실패했습니다.",
          });
        }

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        // Base64URL 인코딩 (저장용)
        const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');
        const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');

        // DB에 크레덴셜 저장
        const supabase = db.getSupabase();
        const { error } = await supabase.from('webauthn_credentials').insert({
          id: credentialIdBase64,
          user_id: user.id,
          public_key: publicKeyBase64,
          counter: counter,
          device_name: input.deviceName || "Unknown Device",
          device_type: "platform",
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error('[WebAuthn] Database error:', error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "크레덴셜 저장에 실패했습니다.",
          });
        }

        // 사용된 챌린지 삭제 (이미 위에서 선언된 challengeData 사용)
        if (challengeData) {
          clearTimeout(challengeData.timeoutId);
          challenges.delete(user.id);
        }

        console.log(`[WebAuthn] Credential registered successfully for user ${user.id}`);

        return {
          verified: true,
          credentialId: credentialIdBase64,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;

        console.error('[WebAuthn] registerCredential error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "크레덴셜 등록에 실패했습니다.",
        });
      }
    }),

  /**
   * 인증 챌린지 생성
   */
  generateAuthenticationChallenge: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const user = ctx.user;

        // 사용자의 등록된 크레덴셜 조회
        const supabase = db.getSupabase();
        const { data: credentials, error } = await supabase
          .from('webauthn_credentials')
          .select('id')
          .eq('user_id', user.id);

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "크레덴셜 조회에 실패했습니다.",
          });
        }

        if (!credentials || credentials.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "등록된 생체 인증이 없습니다. 먼저 생체 인증을 등록해주세요.",
          });
        }

        // SimpleWebAuthn을 사용하여 인증 옵션 생성
        const options = await generateAuthenticationOptions({
          rpID: RP_ID,
          timeout: CHALLENGE_TIMEOUT,
          allowCredentials: credentials.map((c: any) => ({
            id: Buffer.from(c.id, 'base64url'),
            type: 'public-key',
            transports: ['internal'],
          })),
          userVerification: 'required',
        });

        // 기존 챌린지가 있으면 타임아웃 취소
        const existingChallenge = challenges.get(user.id);
        if (existingChallenge) {
          clearTimeout(existingChallenge.timeoutId);
        }

        // 챌린지 임시 저장 (3분 후 자동 삭제)
        const timeoutId = setTimeout(() => {
          challenges.delete(user.id);
          console.log(`[WebAuthn] Authentication challenge expired for user ${user.id}`);
        }, CHALLENGE_TIMEOUT);

        challenges.set(user.id, {
          challenge: options.challenge,
          createdAt: new Date(),
          timeoutId,
        });

        console.log(`[WebAuthn] Authentication challenge generated for user ${user.id}`, {
          challengeLength: options.challenge.length,
          timeout: CHALLENGE_TIMEOUT / 1000 + '초',
          createdAt: new Date().toISOString(),
        });

        return options;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;

        console.error('[WebAuthn] Error generating authentication challenge:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "인증 챌린지 생성에 실패했습니다.",
        });
      }
    }),

  /**
   * 인증 검증
   */
  verifyAuthentication: protectedProcedure
    .input(z.object({
      response: z.any(), // AuthenticationResponseJSON
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = ctx.user;
        const challengeData = challenges.get(user.id);

        if (!challengeData) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "챌린지가 만료되었거나 존재하지 않습니다. 다시 시도해주세요.",
          });
        }

        const expectedChallenge = challengeData.challenge;
        const elapsedTime = Date.now() - challengeData.createdAt.getTime();
        
        console.log(`[WebAuthn] Verifying authentication for user ${user.id}`, {
          elapsedTime: Math.round(elapsedTime / 1000) + '초',
          challengeAge: Math.round(elapsedTime / 1000) + '초 전 생성',
        });

        const response = input.response as AuthenticationResponseJSON;

        // 크레덴셜 조회
        const credentialIdBase64 = Buffer.from(response.rawId, 'base64url').toString('base64url');
        const supabase = db.getSupabase();
        const { data: credential, error: credError } = await supabase
          .from('webauthn_credentials')
          .select('*')
          .eq('id', credentialIdBase64)
          .eq('user_id', user.id)
          .single();

        if (credError || !credential) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "등록된 크레덴셜을 찾을 수 없습니다.",
          });
        }

        // 인증 응답 검증
        let verification: VerifiedAuthenticationResponse;
        try {
          verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
              credentialID: Buffer.from(credential.id, 'base64url'),
              credentialPublicKey: Buffer.from(credential.public_key, 'base64'),
              counter: credential.counter,
            },
            requireUserVerification: true,
          });
        } catch (error: any) {
          console.error('[WebAuthn] Authentication verification failed:', error);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `인증 검증 실패: ${error.message}`,
          });
        }

        if (!verification.verified) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "인증에 실패했습니다.",
          });
        }

        // 카운터 업데이트 (리플레이 공격 방지)
        const { authenticationInfo } = verification;
        await supabase
          .from('webauthn_credentials')
          .update({
            counter: authenticationInfo.newCounter,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', credentialIdBase64);

        // 사용된 챌린지 삭제 (이미 위에서 선언된 challengeData 사용)
        if (challengeData) {
          clearTimeout(challengeData.timeoutId);
          challenges.delete(user.id);
        }

        console.log(`[WebAuthn] Authentication verified successfully for user ${user.id}`);

        return {
          verified: true,
          credentialId: credentialIdBase64,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;

        console.error('[WebAuthn] verifyAuthentication error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "인증 검증에 실패했습니다.",
        });
      }
    }),

  /**
   * 내 크레덴셜 목록 조회
   */
  myCredentials: protectedProcedure
    .query(async ({ ctx }) => {
      const supabase = db.getSupabase();
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
    .mutation(async ({ ctx, input }) => {
      const supabase = db.getSupabase();
      const { error } = await supabase
        .from('webauthn_credentials')
        .delete()
        .eq('id', input.credentialId)
        .eq('user_id', ctx.user.id);

      if (error) {
        console.error('[WebAuthn] deleteCredential error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "크레덴셜 삭제에 실패했습니다.",
        });
      }

      console.log(`[WebAuthn] Credential deleted: ${input.credentialId}`);

      return { success: true };
    }),
});
