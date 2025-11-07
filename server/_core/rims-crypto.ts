/**
 * RIMS (운전자격확인시스템) AES 암호화/복호화 유틸리티
 * 
 * - 알고리즘: AES-128-ECB
 * - 패딩: PKCS5
 * - 인코딩: Base64
 */

import crypto from 'crypto';

/**
 * AES-128-ECB 암호화 (PKCS5 패딩)
 * @param plainText 평문
 * @param secretKey Secret Key (RIMS에서 발급받은 원본 키)
 * @returns Base64 인코딩된 암호문
 */
export function encryptAES(plainText: string, secretKey: string): string {
  try {
    // RIMS Secret Key를 그대로 사용 (UTF-8 인코딩)
    const keyBuffer = Buffer.from(secretKey, 'utf-8');
    
    console.log('[RIMS Crypto] Secret Key length:', keyBuffer.length, 'bytes');
    
    // 키 길이에 따라 AES 알고리즘 선택
    let algorithm: string;
    if (keyBuffer.length === 16) {
      algorithm = 'aes-128-ecb';
    } else if (keyBuffer.length === 24) {
      algorithm = 'aes-192-ecb';
    } else if (keyBuffer.length === 32) {
      algorithm = 'aes-256-ecb';
    } else {
      // 키 길이가 맞지 않으면 16바이트로 조정
      console.warn(`[RIMS Crypto] Invalid key length (${keyBuffer.length}), padding to 16 bytes`);
      const paddedKey = Buffer.alloc(16);
      keyBuffer.copy(paddedKey, 0, 0, Math.min(keyBuffer.length, 16));
      algorithm = 'aes-128-ecb';
      
      const cipher = crypto.createCipheriv(algorithm, paddedKey, null);
      let encrypted = cipher.update(plainText, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    }
    
    // ECB 모드 사용 (IV 불필요)
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, null);
    
    // PKCS5 패딩은 Node.js에서 기본값
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    console.log('[RIMS Crypto] Encryption successful, output length:', encrypted.length);
    
    return encrypted;
  } catch (error: any) {
    console.error('[RIMS Crypto] Encryption error:', error.message);
    throw new Error('암호화 실패: ' + error.message);
  }
}

/**
 * AES-128-ECB 복호화 (PKCS5 패딩)
 * @param encryptedBase64 Base64 인코딩된 암호문
 * @param secretKey Secret Key (RIMS에서 발급받은 원본 키)
 * @returns 복호화된 평문
 */
export function decryptAES(encryptedBase64: string, secretKey: string): string {
  try {
    // RIMS Secret Key를 그대로 사용 (UTF-8 인코딩)
    const keyBuffer = Buffer.from(secretKey, 'utf-8');
    
    // 키 길이에 따라 AES 알고리즘 선택
    let algorithm: string;
    if (keyBuffer.length === 16) {
      algorithm = 'aes-128-ecb';
    } else if (keyBuffer.length === 24) {
      algorithm = 'aes-192-ecb';
    } else if (keyBuffer.length === 32) {
      algorithm = 'aes-256-ecb';
    } else {
      // 키 길이가 맞지 않으면 16바이트로 조정
      const paddedKey = Buffer.alloc(16);
      keyBuffer.copy(paddedKey, 0, 0, Math.min(keyBuffer.length, 16));
      algorithm = 'aes-128-ecb';
      
      const decipher = crypto.createDecipheriv(algorithm, paddedKey, null);
      let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    
    // ECB 모드 사용 (IV 불필요)
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, null);
    
    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('[RIMS Crypto] Decryption error:', error.message);
    throw new Error('복호화 실패: ' + error.message);
  }
}

/**
 * 테스트 함수
 */
export function testCrypto() {
  const secretKey = 'test-secret-key-1234';
  const plainText = JSON.stringify({
    f_license_no: '221212121212',
    f_resident_name: '홍길동',
    f_licn_con_code: '12',
    f_from_date: '20241201',
    f_to_date: '20241201',
    vhcl_reg_no: '99임9999',
  });
  
  console.log('원본:', plainText);
  
  const encrypted = encryptAES(plainText, secretKey);
  console.log('암호화:', encrypted);
  
  const decrypted = decryptAES(encrypted, secretKey);
  console.log('복호화:', decrypted);
  
  console.log('일치 여부:', plainText === decrypted);
}

