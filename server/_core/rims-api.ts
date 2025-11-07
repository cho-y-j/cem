/**
 * RIMS (운전자격확인시스템) API 클라이언트
 * 
 * 기능:
 * - OAuth2 토큰 발급 및 캐싱
 * - 운전면허 진위 확인
 * - 배치 검증
 */

import axios, { AxiosInstance } from 'axios';
import { encryptAES, decryptAES } from './rims-crypto';

// 환경 변수
const RIMS_API_URL = process.env.RIMS_API_URL || 'https://rims.kotsa.or.kr:8114';
const RIMS_AUTH_KEY = process.env.RIMS_AUTH_KEY || '';
const RIMS_SECRET_KEY = process.env.RIMS_SECRET_KEY || '';

// 토큰 캐싱 (3시간 유효)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * RIMS API 클라이언트
 */
export class RIMSApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: RIMS_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * OAuth2 토큰 발급
   */
  async getToken(): Promise<string> {
    // 캐시된 토큰이 유효하면 재사용
    const now = Date.now();
    if (cachedToken && tokenExpiry > now) {
      console.log('[RIMS] Using cached token');
      return cachedToken;
    }

    try {
      // Base64 인코딩된 인증키
      const authHeader = `Basic ${Buffer.from(RIMS_AUTH_KEY).toString('base64')}`;

      const response = await this.client.get('/col/oauth2', {
        params: {
          grantType: 'password',
        },
        headers: {
          Authorization: authHeader,
        },
      });

      // Authorization 헤더에서 토큰 추출
      const authHeaderValue = response.headers['authorization'];
      if (!authHeaderValue || !authHeaderValue.startsWith('Bearer ')) {
        throw new Error('토큰 발급 실패: Authorization 헤더 없음');
      }

      cachedToken = authHeaderValue.replace('Bearer ', '');
      tokenExpiry = now + 2.5 * 60 * 60 * 1000; // 2.5시간 후 만료 (여유 있게)

      console.log('[RIMS] New token issued');
      return cachedToken || '';
    } catch (error: any) {
      console.error('[RIMS] Token issuance failed:', error.response?.data || error.message);
      throw new Error('RIMS 토큰 발급 실패');
    }
  }

  /**
   * 운전면허 진위 확인 (단건)
   */
  async verifyLicense(params: {
    licenseNo: string; // 운전면허번호 (12자리)
    name: string; // 면허자명
    licenseType: string; // 면허종별 코드 (2자리)
    fromDate: string; // 검증시작일 (YYYYMMDD)
    toDate: string; // 검증종료일 (YYYYMMDD)
    vehicleNo?: string; // 차량번호 (기본값: 99임9999)
    bizInfo?: string; // 사용자ID (플랫폼인 경우)
  }): Promise<RIMSVerificationResult> {
    try {
      const token = await this.getToken();

      // 요청 데이터 (암호화 전)
      const requestData = {
        f_license_no: params.licenseNo,
        f_resident_name: params.name,
        f_licn_con_code: params.licenseType,
        f_from_date: params.fromDate,
        f_to_date: params.toDate,
        vhcl_reg_no: params.vehicleNo || '99임9999',
        ...(params.bizInfo ? { bizinfo: params.bizInfo } : {}),
      };

      console.log('[RIMS] Request data:', requestData);

      // AES 암호화
      const plainText = JSON.stringify(requestData);
      const encryptedData = encryptAES(plainText, RIMS_SECRET_KEY);

      // API 호출
      const response = await this.client.post(
        '/licenseVerification',
        {
          encryptedData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('[RIMS] Response status:', response.status);
      console.log('[RIMS] Response data:', JSON.stringify(response.data, null, 2));

      // 응답 파싱
      if (!response.data) {
        throw new Error('RIMS API 응답이 없습니다');
      }

      const { header, body } = response.data;

      if (!header) {
        console.error('[RIMS] Invalid response structure:', response.data);
        throw new Error('RIMS API 응답 형식이 올바르지 않습니다');
      }

      if (header.f_rtn_cd !== '0') {
        throw new Error(`RIMS API 오류: ${header.f_rtn_msg || 'Unknown error'} (코드: ${header.f_rtn_cd})`);
      }

      return {
        isValid: body.f_rtn_code === '00',
        resultCode: body.f_rtn_code,
        vehicleConfirmed: body.vhcl_idnty_cd === '1',
        maskedLicenseNo: body.f_license_no,
        requestDate: header.f_request_date,
      };
    } catch (error: any) {
      console.error('[RIMS] License verification failed:');
      console.error('  - Error message:', error.message);
      console.error('  - Response status:', error.response?.status);
      console.error('  - Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  - Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      });
      
      // 더 자세한 에러 메시지
      let errorMsg = '운전면허 검증 실패';
      if (error.response?.status === 401) {
        errorMsg = '인증 실패: RIMS API 키를 확인하세요';
      } else if (error.response?.status === 400) {
        errorMsg = '잘못된 요청: 면허번호 또는 정보를 확인하세요';
      } else if (error.message) {
        errorMsg += ': ' + error.message;
      }
      
      throw new Error(errorMsg);
    }
  }

  /**
   * 운전면허 진위 확인 (배치)
   */
  async verifyLicenseBatch(
    licenses: Array<{
      licenseNo: string;
      name: string;
      licenseType: string;
      fromDate: string;
      toDate: string;
      vehicleNo?: string;
    }>,
    bizInfo?: string
  ): Promise<RIMSVerificationResult[]> {
    try {
      const token = await this.getToken();

      // 요청 리스트 (암호화 전)
      const requestList = licenses.map((license) => ({
        f_license_no: license.licenseNo,
        f_resident_name: license.name,
        f_licn_con_code: license.licenseType,
        f_from_date: license.fromDate,
        f_to_date: license.toDate,
        vhcl_reg_no: license.vehicleNo || '99임9999',
      }));

      const requestData = {
        f_send_cnt: String(licenses.length),
        requestList,
        ...(bizInfo ? { bizinfo: bizInfo } : {}),
      };

      // AES 암호화
      const plainText = JSON.stringify(requestData);
      const encryptedData = encryptAES(plainText, RIMS_SECRET_KEY);

      // API 호출
      const response = await this.client.post(
        '/licenseVerificationBatch',
        {
          encryptedData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // 응답 파싱
      const { header, body } = response.data;

      if (header.f_rtn_cd !== '0') {
        throw new Error(`RIMS API 오류: ${header.f_rtn_msg || 'Unknown error'}`);
      }

      return body.map((item: any) => ({
        isValid: item.f_rtn_code === '00',
        resultCode: item.f_rtn_code,
        vehicleConfirmed: item.vhcl_idnty_cd === '1',
        maskedLicenseNo: item.f_license_no,
        requestDate: header.f_request_date,
      }));
    } catch (error: any) {
      console.error('[RIMS] Batch verification failed:', error.response?.data || error.message);
      throw new Error('운전면허 배치 검증 실패: ' + (error.message || 'Unknown error'));
    }
  }
}

/**
 * 검증 결과 타입
 */
export interface RIMSVerificationResult {
  isValid: boolean; // 적격 여부 (true: 00, false: 01~)
  resultCode: string; // 검증결과코드 (00: 적격, 01~: 부적격)
  vehicleConfirmed: boolean; // 차량확인 여부
  maskedLicenseNo: string; // 마스킹된 면허번호
  requestDate: string; // 요청일시
}

/**
 * 싱글톤 인스턴스
 */
export const rimsClient = new RIMSApiClient();

/**
 * 간편 함수: 운전면허 검증
 */
export async function verifyDriverLicense(
  licenseNo: string,
  name: string,
  licenseType: string = '12' // 기본값: 1종 보통
): Promise<RIMSVerificationResult> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

  return rimsClient.verifyLicense({
    licenseNo,
    name,
    licenseType,
    fromDate: dateStr,
    toDate: dateStr,
  });
}

