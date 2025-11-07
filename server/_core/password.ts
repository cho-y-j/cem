import { createHash } from "crypto";

/**
 * 비밀번호를 SHA-256으로 해싱
 * @param password 평문 비밀번호
 * @returns 해시된 비밀번호
 */
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * 비밀번호 검증
 * @param password 평문 비밀번호
 * @param hash 해시된 비밀번호
 * @returns 일치 여부
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

