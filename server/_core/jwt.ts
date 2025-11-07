import { SignJWT, jwtVerify } from "jose";
import { ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./env";

/**
 * JWT 페이로드 타입
 */
export interface JWTPayload {
  userId: string;
}

/**
 * JWT 시크릿 키 가져오기
 */
function getSecretKey(): Uint8Array {
  const secret = ENV.cookieSecret || "default-secret-key-change-in-production";
  return new TextEncoder().encode(secret);
}

/**
 * JWT 토큰 생성
 * @param payload JWT 페이로드
 * @param expiresInMs 만료 시간 (밀리초)
 * @returns JWT 토큰 문자열
 */
export async function createJWT(
  payload: JWTPayload,
  expiresInMs: number = ONE_YEAR_MS
): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSecretKey();

  return new SignJWT({
    userId: payload.userId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/**
 * JWT 토큰 검증
 * @param token JWT 토큰 문자열
 * @returns 검증된 페이로드 또는 null
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const { userId } = payload as Record<string, unknown>;

    if (typeof userId !== "string") {
      return null;
    }

    return { userId };
  } catch (error) {
    console.error("[JWT] Verification failed:", error);
    return null;
  }
}

