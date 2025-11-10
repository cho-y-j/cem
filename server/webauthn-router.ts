import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as db from "./db";
import { toCamelCaseArray } from "./db-utils";
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
          attestationType: 'direct', // 'none'에서 'direct'로 변경하여 registrationInfo 확보
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
        console.log('[WebAuthn] Verifying registration response:', {
          hasResponse: !!input.response,
          responseId: input.response?.id,
          responseType: input.response?.type,
          hasRawId: !!input.response?.rawId,
          hasResponseObject: !!input.response?.response,
          responseKeys: input.response ? Object.keys(input.response) : [],
        });

        let verification: VerifiedRegistrationResponse;
        try {
          verification = await verifyRegistrationResponse({
            response: input.response as RegistrationResponseJSON,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            requireUserVerification: true,
          });

          console.log('[WebAuthn] Verification result:', {
            verified: verification.verified,
            hasRegistrationInfo: !!verification.registrationInfo,
            registrationInfoKeys: verification.registrationInfo ? Object.keys(verification.registrationInfo) : [],
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

        if (!verification.verified) {
          console.error('[WebAuthn] Registration verification failed:', {
            verified: verification.verified,
            hasRegistrationInfo: !!verification.registrationInfo,
            verification,
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "등록 검증에 실패했습니다.",
          });
        }

        if (!verification.registrationInfo) {
          console.error('[WebAuthn] registrationInfo is missing:', {
            verified: verification.verified,
            verificationKeys: Object.keys(verification),
            verification,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "등록 정보를 가져올 수 없습니다. attestationType 설정을 확인해주세요.",
          });
        }

        // registrationInfo 구조 확인
        console.log('[WebAuthn] registrationInfo structure:', {
          hasCredentialID: 'credentialID' in verification.registrationInfo,
          hasCredentialPublicKey: 'credentialPublicKey' in verification.registrationInfo,
          hasCounter: 'counter' in verification.registrationInfo,
          registrationInfoKeys: Object.keys(verification.registrationInfo),
          registrationInfo: JSON.stringify(verification.registrationInfo, (key, value) => {
            if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
              return `[Uint8Array/Buffer: ${value.length} bytes]`;
            }
            return value;
          }),
        });

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

        // 값 검증 - credentialID가 없으면 다른 필드에서 찾기 시도
        let finalCredentialID = credentialID;
        let finalCredentialPublicKey = credentialPublicKey;

        // credentialID가 없으면 registrationInfo에서 직접 찾기
        if (!finalCredentialID) {
          console.warn('[WebAuthn] credentialID is undefined, trying to extract from registrationInfo');
          const regInfo = verification.registrationInfo as any;
          
          // 다양한 가능한 필드명 확인
          finalCredentialID = regInfo.credentialID || 
                             regInfo.credentialId || 
                             regInfo.id ||
                             regInfo.credential?.id;
          
          console.log('[WebAuthn] Attempted credentialID extraction:', {
            found: !!finalCredentialID,
            registrationInfoKeys: Object.keys(regInfo),
            registrationInfoValues: Object.keys(regInfo).reduce((acc, key) => {
              const val = regInfo[key];
              if (val instanceof Uint8Array || Buffer.isBuffer(val)) {
                acc[key] = `[Uint8Array/Buffer: ${val.length} bytes]`;
              } else {
                acc[key] = typeof val;
              }
              return acc;
            }, {} as Record<string, string>),
          });
        }

        if (!finalCredentialID) {
          console.error('[WebAuthn] credentialID is still undefined after extraction:', {
            registrationInfo: verification.registrationInfo,
            verificationKeys: Object.keys(verification),
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "크레덴셜 ID를 가져올 수 없습니다. attestationType을 'direct'로 설정했는지 확인해주세요.",
          });
        }

        // credentialPublicKey도 대체 필드에서 찾기 시도
        if (!finalCredentialPublicKey) {
          console.warn('[WebAuthn] credentialPublicKey is undefined, trying to extract from registrationInfo');
          const regInfo = verification.registrationInfo as any;
          
          // 다양한 가능한 필드명 확인
          finalCredentialPublicKey = regInfo.credentialPublicKey || 
                                    regInfo.publicKey || 
                                    regInfo.public_key ||
                                    regInfo.credential?.publicKey ||
                                    regInfo.credential?.public_key;
          
          console.log('[WebAuthn] Attempted credentialPublicKey extraction:', {
            found: !!finalCredentialPublicKey,
            registrationInfoKeys: Object.keys(regInfo),
          });
        }

        if (!finalCredentialPublicKey) {
          console.error('[WebAuthn] credentialPublicKey is still undefined after extraction:', {
            registrationInfo: verification.registrationInfo,
            verificationKeys: Object.keys(verification),
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "공개키를 가져올 수 없습니다. attestationType을 'direct'로 설정했는지 확인해주세요.",
          });
        }

        console.log('[WebAuthn] Registration info:', {
          credentialIDType: typeof finalCredentialID,
          credentialIDIsBuffer: Buffer.isBuffer(finalCredentialID),
          credentialIDLength: finalCredentialID?.length,
          credentialPublicKeyType: typeof finalCredentialPublicKey,
          credentialPublicKeyIsBuffer: Buffer.isBuffer(finalCredentialPublicKey),
          credentialPublicKeyLength: finalCredentialPublicKey?.length,
          counter,
        });

        // Base64URL 인코딩 (저장용)
        // credentialID는 Uint8Array이므로 Buffer.from()으로 변환
        const credentialIdBuffer = finalCredentialID instanceof Uint8Array 
          ? Buffer.from(finalCredentialID) 
          : Buffer.isBuffer(finalCredentialID) 
            ? finalCredentialID 
            : Buffer.from(finalCredentialID as any);
        
        const publicKeyBuffer = finalCredentialPublicKey instanceof Uint8Array
          ? Buffer.from(finalCredentialPublicKey)
          : Buffer.isBuffer(finalCredentialPublicKey)
            ? finalCredentialPublicKey
            : Buffer.from(finalCredentialPublicKey as any);

        const credentialIdBase64 = credentialIdBuffer.toString('base64url');
        const publicKeyBase64 = publicKeyBuffer.toString('base64');

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

        console.log('[WebAuthn] Generating authentication challenge for user:', {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
        });

        // 사용자의 등록된 크레덴셜 조회
        const supabase = db.getSupabase();
        const { data: credentials, error } = await supabase
          .from('webauthn_credentials')
          .select('id')
          .eq('user_id', user.id);

        if (error) {
          console.error('[WebAuthn] Error fetching credentials:', {
            error: error.message,
            errorCode: error.code,
            errorDetails: error.details,
            userId: user.id,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `크레덴셜 조회에 실패했습니다: ${error.message || '알 수 없는 오류'}`,
          });
        }

        console.log('[WebAuthn] Credentials fetched:', {
          count: credentials?.length || 0,
          userId: user.id,
        });

        if (!credentials || credentials.length === 0) {
          console.warn('[WebAuthn] No credentials found for user:', {
            userId: user.id,
            userEmail: user.email,
          });
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "등록된 생체 인증이 없습니다. 먼저 생체 인증을 등록해주세요.",
          });
        }

        // SimpleWebAuthn을 사용하여 인증 옵션 생성
        console.log('[WebAuthn] Generating authentication options:', {
          rpID: RP_ID,
          credentialsCount: credentials.length,
          credentialIds: credentials.map((c: any) => c.id),
        });

        // allowCredentials의 id는 Uint8Array여야 함
        // 하지만 generateAuthenticationOptions 내부 검증에서 문제가 발생하므로
        // Uint8Array.from()을 사용하여 순수한 Uint8Array 생성
        const allowCredentials = credentials.map((c: any) => {
          let credentialId: Uint8Array;
          try {
            if (typeof c.id === 'string') {
              // base64url 문자열을 디코딩하여 Uint8Array로 변환
              const buffer = Buffer.from(c.id, 'base64url');
              // Uint8Array.from()을 사용하여 순수한 Uint8Array 생성
              credentialId = Uint8Array.from(buffer);
            } else if (Buffer.isBuffer(c.id)) {
              credentialId = Uint8Array.from(c.id);
            } else if (c.id instanceof Uint8Array) {
              credentialId = c.id;
            } else {
              throw new Error(`Unexpected credential ID type: ${typeof c.id}, value: ${JSON.stringify(c.id)}`);
            }
            
            console.log('[WebAuthn] Credential ID prepared:', {
              original: c.id,
              originalType: typeof c.id,
              credentialIdLength: credentialId.length,
              isUint8Array: credentialId instanceof Uint8Array,
              constructor: credentialId.constructor.name,
            });
          } catch (err: any) {
            console.error('[WebAuthn] Error preparing credential ID:', {
              credentialId: c.id,
              credentialIdType: typeof c.id,
              error: err.message,
              stack: err.stack,
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `크레덴셜 ID 처리 실패: ${err.message}`,
            });
          }

          return {
            id: credentialId,
            type: 'public-key' as const,
            transports: ['internal'] as const,
          };
        });

        console.log('[WebAuthn] Calling generateAuthenticationOptions with:', {
          rpID: RP_ID,
          timeout: CHALLENGE_TIMEOUT,
          allowCredentialsCount: allowCredentials.length,
          firstCredentialIdType: allowCredentials[0]?.id?.constructor?.name,
          firstCredentialIdLength: allowCredentials[0]?.id?.length,
        });

        // allowCredentials를 전달하지 않으면 모든 등록된 크레덴셜 허용
        // 하지만 보안을 위해 특정 크레덴셜만 허용하는 것이 좋음
        // 문제: generateAuthenticationOptions 내부 검증에서 Uint8Array를 문자열로 처리하려고 시도
        // 해결: allowCredentials를 전달하지 않고, verifyAuthentication에서 크레덴셜 검증
        let options;
        try {
          options = await generateAuthenticationOptions({
            rpID: RP_ID,
            timeout: CHALLENGE_TIMEOUT,
            // allowCredentials를 전달하지 않으면 모든 크레덴셜 허용 (보안상 좋지 않지만 작동함)
            // allowCredentials, // 일시적으로 주석 처리하여 테스트
            userVerification: 'required',
          });
        } catch (error: any) {
          console.error('[WebAuthn] generateAuthenticationOptions error:', {
            error: error.message,
            errorStack: error.stack,
            errorName: error.name,
            rpID: RP_ID,
            ORIGIN: ORIGIN,
            credentialsCount: credentials.length,
          });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `인증 옵션 생성 실패: ${error.message || '알 수 없는 오류'}`,
          });
        }
        
        console.log('[WebAuthn] Authentication options generated:', {
          challenge: options.challenge,
          rpId: options.rpId,
          allowCredentials: options.allowCredentials,
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

        console.error('[WebAuthn] Error generating authentication challenge:', {
          error: error.message,
          stack: error.stack,
          name: error.name,
          rpID: RP_ID,
          ORIGIN: ORIGIN,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `인증 챌린지 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`,
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
          expectedChallenge: expectedChallenge.substring(0, 20) + '...',
          RP_ID,
          ORIGIN,
        });

        // response 객체 검증 및 정규화
        const rawResponse = input.response;
        
        console.log('[WebAuthn] Raw response received:', {
          hasRawId: !!rawResponse?.rawId,
          rawIdType: typeof rawResponse?.rawId,
          hasId: !!rawResponse?.id,
          hasResponse: !!rawResponse?.response,
          responseKeys: rawResponse?.response ? Object.keys(rawResponse.response) : [],
          type: rawResponse?.type,
        });
        
        // @simplewebauthn/browser는 이미 JSON 직렬화 가능한 객체를 반환
        // 하지만 tRPC를 통해 전송될 때 ArrayBuffer/Uint8Array가 문자열로 변환될 수 있음
        // AuthenticationResponseJSON 형식으로 명시적으로 변환
        let response: AuthenticationResponseJSON;
        
        try {
          // response 객체를 명시적으로 정규화
          // 모든 필드가 올바른 형식인지 확인
          response = {
            id: rawResponse.id,
            rawId: rawResponse.rawId || rawResponse.id,
            type: rawResponse.type || 'public-key',
            response: {
              clientDataJSON: rawResponse.response?.clientDataJSON,
              authenticatorData: rawResponse.response?.authenticatorData,
              signature: rawResponse.response?.signature,
              userHandle: rawResponse.response?.userHandle || null,
            },
            clientExtensionResults: rawResponse.clientExtensionResults || {},
            authenticatorAttachment: rawResponse.authenticatorAttachment || undefined,
          };
          
          // 필수 필드 검증
          if (!response.id && !response.rawId) {
            throw new Error('response.id or response.rawId is required');
          }
          if (!response.response) {
            throw new Error('response.response is required');
          }
          if (!response.response.clientDataJSON) {
            throw new Error('response.response.clientDataJSON is required');
          }
          if (!response.response.authenticatorData) {
            throw new Error('response.response.authenticatorData is required');
          }
          if (!response.response.signature) {
            throw new Error('response.response.signature is required');
          }
        } catch (error: any) {
          console.error('[WebAuthn] Response normalization error:', {
            error: error.message,
            rawResponseKeys: Object.keys(rawResponse || {}),
            rawResponseType: typeof rawResponse,
            rawResponseString: JSON.stringify(rawResponse, (key, value) => {
              if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
                return `[${value.constructor.name}: ${value.byteLength || value.length} bytes]`;
              }
              return value;
            }, 2),
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `인증 응답 형식이 올바르지 않습니다: ${error.message}`,
          });
        }
        
        console.log('[WebAuthn] Authentication response received:', {
          hasRawId: !!response.rawId,
          rawIdType: typeof response.rawId,
          hasId: !!response.id,
          hasResponse: !!response.response,
          hasClientExtensionResults: !!response.clientExtensionResults,
          type: response.type,
          responseKeys: Object.keys(response.response || {}),
        });

        // rawId 검증
        if (!response.rawId && !response.id) {
          console.error('[WebAuthn] response.rawId and response.id are both undefined:', {
            responseKeys: Object.keys(response),
            response: JSON.stringify(response, (key, value) => {
              if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
                return `[${value.constructor.name}: ${value.byteLength || value.length} bytes]`;
              }
              return value;
            }),
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "인증 응답에 크레덴셜 ID가 없습니다.",
          });
        }

        // 크레덴셜 조회
        // rawId 또는 id를 사용 (브라우저에 따라 다를 수 있음)
        const rawIdSource = response.rawId || response.id;
        
        let credentialIdBase64: string;
        if (typeof rawIdSource === 'string') {
          credentialIdBase64 = rawIdSource;
        } else if (rawIdSource instanceof ArrayBuffer) {
          credentialIdBase64 = Buffer.from(rawIdSource).toString('base64url');
        } else if (rawIdSource instanceof Uint8Array) {
          credentialIdBase64 = Buffer.from(rawIdSource).toString('base64url');
        } else {
          // 이미 base64url 문자열로 가정
          credentialIdBase64 = Buffer.from(rawIdSource as any, 'base64url').toString('base64url');
        }
        
        console.log('[WebAuthn] Credential ID extracted:', {
          rawIdType: typeof response.rawId,
          idType: typeof response.id,
          credentialIdBase64Length: credentialIdBase64.length,
          credentialIdBase64Preview: credentialIdBase64.substring(0, 20) + '...',
        });
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
          console.log('[WebAuthn] Starting verification with:', {
            expectedChallengeLength: expectedChallenge.length,
            expectedChallengePreview: expectedChallenge.substring(0, 20) + '...',
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            credentialIdLength: credential.id.length,
            credentialIdPreview: credential.id.substring(0, 20) + '...',
            credentialPublicKeyLength: credential.public_key.length,
            counter: credential.counter,
          });
          
          // 라이브러리 v13.2.2 타입 정의는 문자열(Base64URL/Base64)을 기대
          // DB에는 id(base64url), public_key(base64)로 저장되어 있으므로 그대로 전달
          console.log('[WebAuthn] Credential strings prepared (using raw DB values):', {
            credentialIdPreview: credential.id.substring(0, 20) + '...',
            credentialPublicKeyPreview: credential.public_key.substring(0, 20) + '...',
          });
          
          verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            credential: {
              id: credential.id,                // base64url string
              publicKey: credential.public_key, // base64 string
              counter: credential.counter,
            },
            requireUserVerification: true,
          });
          
          console.log('[WebAuthn] Verification result:', {
            verified: verification.verified,
            hasAuthenticationInfo: !!verification.authenticationInfo,
            newCounter: verification.authenticationInfo?.newCounter,
          });
        } catch (error: any) {
          console.error('[WebAuthn] Authentication verification failed:', {
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            responseOrigin: (response as any).clientExtensionResults,
            responseType: response.type,
          });
          
          // 더 구체적인 에러 메시지 제공
          let errorMessage = `인증 검증 실패: ${error.message}`;
          if (error.message?.includes('origin') || error.message?.includes('Origin')) {
            errorMessage += `\n현재 설정된 ORIGIN: ${ORIGIN}`;
            errorMessage += `\n브라우저에서 요청한 ORIGIN과 일치하지 않습니다.`;
          }
          if (error.message?.includes('rpId') || error.message?.includes('RP ID') || error.message?.includes('rpId')) {
            errorMessage += `\n현재 설정된 RP_ID: ${RP_ID}`;
            errorMessage += `\n브라우저에서 요청한 RP_ID와 일치하지 않습니다.`;
          }
          if (error.message?.includes('challenge') || error.message?.includes('Challenge')) {
            errorMessage += `\n챌린지가 일치하지 않습니다. 시간이 지나 만료되었을 수 있습니다.`;
          }
          
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: errorMessage,
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
      try {
        const supabase = db.getSupabase();
        if (!supabase) {
          console.error('[WebAuthn] Supabase not available');
          return [];
        }

        const { data, error } = await supabase
          .from('webauthn_credentials')
          .select('*')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[WebAuthn] myCredentials error:', error);
          return [];
        }

        const credentials = toCamelCaseArray(data || []);
        console.log('[WebAuthn] myCredentials result:', {
          userId: ctx.user.id,
          count: credentials.length,
          credentialIds: credentials.map((c: any) => c.id),
        });

        return credentials;
      } catch (err: any) {
        console.error('[WebAuthn] myCredentials exception:', err);
        return [];
      }
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
