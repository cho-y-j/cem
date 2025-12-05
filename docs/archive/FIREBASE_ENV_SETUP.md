# Firebase 환경 변수 설정 가이드

## 서비스 계정 키 정보

서비스 계정 키 파일 (`cemapp-c6c17-firebase-adminsdk-fbsvc-4ebd3769ba.json`)에서 다음 정보를 확인했습니다:

- **Project ID**: `cemapp-c6c17`
- **Client Email**: `firebase-adminsdk-fbsvc@cemapp-c6c17.iam.gserviceaccount.com`
- **Private Key**: (파일에서 확인)

## 환경 변수 설정

`.env` 파일에 다음 환경 변수를 추가하세요:

```env
# Firebase Admin SDK 환경 변수
FIREBASE_PROJECT_ID=cemapp-c6c17
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cemapp-c6c17.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDYBxXWQDhW8tr0\nwsaP+oazIA7ZQ/xgBj0C9rusFiqoAhjkgGduCn9GgujJx63GfiG9CaFIEimsppSZ\n0hLny5NE9mf/LNBX5eeQ0/npp+UAdl7FqB5nU1TqMw2GlqpNvhLASO46096ClA2m\n2XoLEPoW20TU0hy+vuWi7837/G2SUt2VnLpmO/Bkt175EBratIt38/nY4JWE9q3g\nxZItpjCqys2OaZGKegArsyKm65MQPiVbf90AyBsyHOsQvpZBbQDsi0IdsaTaWaAg\nzbya47tCcE2XAyyb78wM+eo5KX+31T9j86d5fDqNcGJrTU4kI1l0JW3f23h6bbj3\nhqONGNy/AgMBAAECggEAQ1Kx83tAE5jLs8ufpe8lW116Qyt001geW3YZNqAR2xoM\nN+nsUdbjo03Yzkl0Vo+oZAlEQfmnEy820Fkvmx1OYAeKkXOd2kbDy9bD45V3QJWj\nI2YpU3oc1H/kjzUVDfVWUqZn191/UqJhPsY3yosX5VegM9LnMmq7lfO19fnNC/RE\nk/jexTe2ZkzPbgTswf8aYpzlr3XzDjxx9xPMM2sSq357pW9okfwO2hYOSaYcwnlB\nxP1uyR6MJzlstS6IGrNujBHrPeNgj1Ah9a2MxPTDZUCdIXq1IPb6lorlBAa3Ikm+\nFaLK/GG3qhCNfVGaM4i42FLMJNuHcvYCdUfIAeyiwQKBgQDt0LhbQXGEUbLl2mR+\nOuI1UoHZFEVurHqQc/q9zEPLvpqfIzHyNb2zX9KEtWWdWlyl65ozwzJaCTyLBR26\nESTtpQrSwnh1vGK/NOxuR+JfOuZMbq/Ksj61y/+RAocuTsmWJndwmp7Hfgygvwbd\nW7npXM90eFAB5YbNDM4HybPEiwKBgQDoi944djt8caLVoy2h882Rll0REhKL+Ecq\n6vccFhZpDUOlMdJ4gea0mnsignbwSc9lL+6jcVwhjRSrRL55moch00cv4pxf6rcw\nRAb6dq8HrHCa868M70Fv7hUtaDkXPR1N/5rj9EPHV+Kb5XFdKj4qL9t7w+bCTr3x\nFwOlxPDrHQKBgQDPzVvqUYsRphn+gxDgxC85jLjtqKrrBEesxctJ4Z00AX82oxhX\nnuH+RTK8x4zdLEJcsTxzEpOC3SNMDtJk7eooxdhpRYjgyBY5IdOeoa2KrPrjuqxd\nH9dwH6tXWLAqpKm9TCt9933ar6f1JjanYilXYsPb7+1pWtipgBDf+T3d9QKBgQCj\nz9Nshq0Ezq/cOqSsjyfiRL+uhMKX4v+PFhGYsV58BiH+vof659byplfTSYAraHM2\nXnuGmxZBdDZ5J2XeF6LVixV8f++UCa2dzG32BaDqkOiJ3tsTC39XL6mvYNnGqwB3\nr3UW2zzbsecp1ojzDgzYfvnnx2pIultG9+VT4tWraQKBgFu16Ml2rhl6n0xuiyFs\nTb7+NtZMod4upDLINxBz6qrLeFr/QlN+DLjgqzodLdIG57xSNszPqSR++SVf68pp\nJNUk42jXP3KS1wazwzW/mfS39RQavQv8r3QAGQ6ELQiRm4foZZagn5BXsDJhsfB1\np1R1OqqDkSEwpihDKNtKRXKa\n-----END PRIVATE KEY-----\n"
```

**중요**: `FIREBASE_PRIVATE_KEY`는 전체 키를 한 줄로 작성하되, `\n`을 그대로 포함해야 합니다.

## 확인 방법

서버를 재시작한 후, 콘솔에 다음 메시지가 나타나면 성공입니다:
```
[FCM] Firebase Admin SDK 초기화 완료
```

만약 환경 변수가 설정되지 않았다면:
```
[FCM] Firebase Admin SDK 환경 변수가 설정되지 않았습니다. 푸시 알림이 비활성화됩니다.
```

## 다음 단계

환경 변수 설정 후:
1. 서버 재시작
2. 알림 전송 테스트
3. Android 앱에서 FCM 토큰 등록 확인


