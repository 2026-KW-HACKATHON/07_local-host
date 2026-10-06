# Bapjul 프론트엔드 연동 가이드 v1

작성 기준: 현재까지 구현·테스트한 백엔드 기능  
대상: 프론트엔드 개발자  
백엔드: Spring Boot + JPA + MySQL + JWT  
로컬 기본 주소: `http://localhost:8080`

---

## 1. 현재 구현 범위

현재 백엔드는 다음 기능까지 구현되어 있습니다.

- 회원가입 / 로그인
- JWT 기반 인증
- 사용자 역할 구분: `CUSTOMER`, `OWNER`
- 현재 로그인 사용자 조회
- 식당 생성 / 조회 / 수정
- 식당과 점주 계정 연결
- 혼잡도 제보
- 최근 혼잡도 집계
- 혼잡도 차트용 데이터 제공
- 프로모션 생성 / 조회 / 수정 / 삭제
- 점주 본인 식당에 대한 프로모션 관리
- 활성 프로모션만 일반 사용자에게 노출

---

## 2. 인증 방식

로그인 성공 시 서버에서 JWT Access Token을 반환합니다.

프론트에서는 인증이 필요한 요청마다 아래 헤더를 포함해야 합니다.

```http
Authorization: Bearer {accessToken}
```

예:

```javascript
fetch("http://localhost:8080/api/auth/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

### 권한

| 역할 | 설명 |
|---|---|
| `CUSTOMER` | 일반 사용자 |
| `OWNER` | 식당 점주 |

점주 전용 API에 `CUSTOMER` 토큰을 사용하면 `403 Forbidden`이 발생합니다.

---

# 3. 인증 API

## 3-1. 회원가입

```http
POST /api/auth/signup
Content-Type: application/json
```

예시:

```json
{
  "email": "owner@example.com",
  "password": "owner1234!",
  "nickname": "테스트점주",
  "role": "OWNER"
}
```

일반 사용자 가입 예시:

```json
{
  "email": "customer@example.com",
  "password": "customer1234!",
  "nickname": "테스트사용자",
  "role": "CUSTOMER"
}
```

주요 오류:
- 이메일 또는 닉네임 중복: `409 Conflict`
- 잘못된 요청값: `400 Bad Request`

---

## 3-2. 로그인

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "owner@example.com",
  "password": "owner1234!"
}
```

로그인 성공 시 `accessToken`을 받습니다.

응답 예시는 대략 다음 구조입니다.

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "email": "owner@example.com",
    "nickname": "테스트점주",
    "role": "OWNER"
  }
}
```

프론트에서는 이후 인증 요청에 `accessToken`을 사용하면 됩니다.

---

## 3-3. 현재 로그인 사용자 조회

```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

사용처:
- 로그인 유지 확인
- 현재 사용자 정보 표시
- `CUSTOMER` / `OWNER` 화면 분기

로그인하지 않았거나 토큰이 유효하지 않으면 인증 실패 응답이 발생합니다.

---

# 4. 식당 API

## 4-1. 식당 생성

점주 전용입니다.

```http
POST /api/restaurants
Authorization: Bearer {OWNER_TOKEN}
Content-Type: application/json
```

예시:

```json
{
  "name": "광운식당",
  "address": "서울 노원구 광운로",
  "openingTime": "10:00:00",
  "closingTime": "21:00:00"
}
```

중요: `ownerId`를 프론트에서 보내지 않습니다. 서버가 JWT의 로그인 사용자 정보를 이용하여 자동으로 식당의 점주를 연결합니다.

응답에는 식당 정보와 `ownerId`가 포함됩니다.

---

## 4-2. 식당 목록 조회

```http
GET /api/restaurants
```

인증 없이 사용할 수 있습니다.

---

## 4-3. 식당 단건 조회

```http
GET /api/restaurants/{restaurantId}
```

인증 없이 사용할 수 있습니다.

---

## 4-4. 식당 수정

점주 전용이며, 자신의 식당만 수정할 수 있습니다.

```http
PUT /api/restaurants/{restaurantId}
Authorization: Bearer {OWNER_TOKEN}
Content-Type: application/json
```

다른 점주의 식당을 수정하려고 하면 `403 Forbidden`이 발생합니다.

---

# 5. 혼잡도 기능

혼잡도 단계는 현재 아래 3개를 사용합니다.

| 서버 값 | 화면 표시 |
|---|---|
| `AVAILABLE` | 바로 앉아요 |
| `FEW_SEATS` | 자리가 적어요 |
| `LONG_WAIT` | 대기가 길어요 |

추가 서버 상태:

| 서버 값 | 의미 |
|---|---|
| `UNKNOWN` | 최근 제보 없음 / 정보 없음 |

`UNKNOWN`은 사용자가 제보하는 값이 아니라 서버에서 반환하는 상태입니다.

---

## 5-1. 혼잡도 제보

로그인한 사용자만 가능합니다.

```http
POST /api/restaurants/{restaurantId}/crowd
Authorization: Bearer {accessToken}
Content-Type: application/json
```

제보 예시:

```json
{
  "level": "AVAILABLE"
}
```

또는 `FEW_SEATS`, `LONG_WAIT`.

사용자 ID는 프론트에서 보내지 않습니다. 서버가 JWT를 이용하여 실제 제보자를 자동 연결합니다.

`UNKNOWN`은 직접 제보할 수 없습니다.

---

## 5-2. 현재 혼잡도 계산 방식

최근 **30분 동안의 제보**를 기준으로 계산합니다.

1. 최근 30분 제보를 조회
2. 가장 많은 표를 받은 혼잡도 선택
3. 동률이면 가장 최근 제보를 사용
4. 최근 제보가 하나도 없으면 `UNKNOWN`

따라서 프론트는 자체적으로 혼잡도를 계산하지 않고 서버 응답을 그대로 표시하는 것을 권장합니다.

---

## 5-3. 혼잡도 차트

백엔드에는 시간대별 혼잡도 차트 계산 기능도 구현되어 있습니다.

차트는 서버에서 시간 단위로 데이터를 묶어 대표 혼잡도를 계산합니다.

> 정확한 최종 URL과 응답 DTO 이름은 프론트 연결 직전에 백엔드 Controller 기준으로 한 번 더 맞추는 것을 권장합니다.

---

# 6. 프로모션 API

프로모션은 점주가 자신의 식당에만 생성/수정/삭제할 수 있습니다.

일반 사용자는 현재 활성화된 프로모션만 조회할 수 있습니다.

---

## 6-1. 프로모션 생성

```http
POST /api/restaurants/{restaurantId}/promotions
Authorization: Bearer {OWNER_TOKEN}
Content-Type: application/json
```

예시:

```json
{
  "title": "오후 타임세일",
  "description": "지금 방문하면 10% 할인",
  "discountPercent": 10,
  "startAt": "2026-10-06T17:00:00",
  "endAt": "2026-10-06T19:00:00"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `title` | string | 프로모션 제목 |
| `description` | string | 설명 |
| `discountPercent` | number | 할인율 |
| `startAt` | datetime | 시작 시각 |
| `endAt` | datetime | 종료 시각 |

`discountPercent`는 1~100 범위입니다. 생성 시 `enabled`는 서버에서 기본적으로 `true`가 됩니다.

---

## 6-2. 일반 사용자용 활성 프로모션 조회

```http
GET /api/restaurants/{restaurantId}/promotions
```

인증이 필요하지 않습니다.

이 API는 아래 조건을 모두 만족하는 프로모션만 반환합니다.

- `enabled = true`
- 현재 시간이 `startAt` 이후
- 현재 시간이 `endAt` 이전

예정 / 종료 / 비활성 프로모션은 일반 사용자에게 표시되지 않습니다.

활성 프로모션이 없으면 빈 배열이 반환됩니다.

```json
[]
```

---

## 6-3. 점주 관리용 프로모션 전체 조회

```http
GET /api/restaurants/{restaurantId}/promotions/manage
Authorization: Bearer {OWNER_TOKEN}
```

점주 관리 화면에서 사용합니다.

일반 조회와 달리 활성 / 비활성 / 예정 / 종료 프로모션을 모두 조회할 수 있습니다. 단, 해당 식당의 실제 점주만 접근 가능합니다.

---

## 6-4. 프로모션 수정

```http
PUT /api/restaurants/{restaurantId}/promotions/{promotionId}
Authorization: Bearer {OWNER_TOKEN}
Content-Type: application/json
```

예시:

```json
{
  "title": "저녁 타임세일",
  "description": "한정 시간 20% 할인",
  "discountPercent": 20,
  "startAt": "2026-10-06T17:00:00",
  "endAt": "2026-10-06T21:00:00",
  "enabled": true
}
```

`enabled` 값을 `false`로 보내면 일반 사용자용 조회에서 노출되지 않습니다.

---

## 6-5. 프로모션 삭제

```http
DELETE /api/restaurants/{restaurantId}/promotions/{promotionId}
Authorization: Bearer {OWNER_TOKEN}
```

성공 시:

```http
204 No Content
```

응답 body가 없는 것이 정상입니다.

---

# 7. 프로모션 응답 예시

```json
{
  "id": 1,
  "restaurantId": 1,
  "title": "오후 타임세일",
  "description": "지금 방문하면 10% 할인",
  "discountPercent": 10,
  "startAt": "2026-10-06T17:00:00",
  "endAt": "2026-10-06T19:00:00",
  "enabled": true,
  "active": true
}
```

### `enabled`와 `active` 차이

- `enabled`: 점주가 프로모션을 사용할지 직접 설정한 값
- `active`: 현재 시각까지 고려하여 실제 노출 가능한 상태인지 서버가 계산한 값

예:

```text
enabled = true + 현재 시간이 기간 안쪽 → active = true
enabled = true + 아직 시작 전          → active = false
enabled = false                        → active = false
```

---

# 8. 프론트 화면별 권장 API 연결

## 일반 사용자 화면

앱 진입 흐름:

```text
식당 목록 조회
→ 식당 상세 진입
→ 현재 혼잡도 조회
→ 활성 프로모션 조회
```

혼잡도 제보 흐름:

```text
로그인 여부 확인
→ 혼잡도 버튼 클릭
→ POST crowd
→ 성공
→ 현재 혼잡도 다시 GET
→ UI 갱신
```

## 점주 화면

로그인 후 `/api/auth/me` 응답의 `role`이 `OWNER`인지 확인하여 점주 메뉴를 표시합니다.

```text
로그인
→ 내 식당 확인
→ 식당 정보 수정
→ 프로모션 관리 목록 조회
→ 생성 / 수정 / 활성화 / 비활성화 / 삭제
```

---

# 9. 권장 프론트 인증 상태

프론트에서 최소한 아래 값은 전역 상태 또는 인증 Context 등에서 관리하는 것이 편합니다.

```javascript
{
  accessToken,
  user: {
    id,
    email,
    nickname,
    role
  }
}
```

예:

```javascript
if (user?.role === "OWNER") {
  // 점주 메뉴 표시
}
```

단, 실제 보안 검사는 프론트가 아니라 서버에서 다시 수행합니다. 프론트의 역할 체크는 화면 제어용입니다.

---

# 10. 공통 요청 함수 예시

```javascript
const API_BASE_URL = "http://localhost:8080";

async function apiFetch(path, options = {}, accessToken = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
```

일반 조회:

```javascript
const promotions = await apiFetch(
  `/api/restaurants/${restaurantId}/promotions`
);
```

점주 조회:

```javascript
const promotions = await apiFetch(
  `/api/restaurants/${restaurantId}/promotions/manage`,
  { method: "GET" },
  accessToken
);
```

---

# 11. HTTP 상태 코드 처리

| 상태 | 의미 | 권장 처리 |
|---|---|---|
| `200` | 조회 / 수정 성공 | 정상 처리 |
| `201` 또는 정상 성공 응답 | 생성 성공 | 생성 후 화면 갱신 |
| `204` | 삭제 성공 | body 파싱하지 않기 |
| `400` | 요청 값 오류 | 입력값 안내 |
| `401` | 로그인/인증 오류 | 재로그인 유도 |
| `403` | 권한 없음 | 권한 안내 |
| `404` | 대상 없음 | 존재하지 않는 데이터 안내 |
| `409` | 중복 | 이메일/닉네임 중복 등 안내 |
| `500` | 서버 오류 | 사용자 안내 후 백엔드 로그 확인 |

---

# 12. 특히 주의할 점

1. **OWNER ID를 직접 보내지 않기**  
   식당 생성, 혼잡도 제보 등 로그인 사용자와 관련된 데이터는 JWT를 기준으로 서버가 연결합니다.

2. **점주 권한은 프론트에서만 검사하면 안 됨**  
   프론트에서 OWNER 화면을 숨기더라도 서버에서 OWNER 여부 및 실제 식당 소유 여부를 다시 검증합니다.

3. **날짜 형식**  
   프로모션 날짜는 `yyyy-MM-ddTHH:mm:ss` 형식을 사용합니다. 예: `2026-10-06T18:30:00`.

4. **빈 배열은 정상 응답일 수 있음**  
   활성 프로모션이 없으면 `[]`가 반환됩니다. 오류가 아니라 "진행 중인 프로모션 없음" UI를 표시하면 됩니다.

5. **DELETE 204 처리**  
   프로모션 삭제 성공 시 body가 없습니다. `status === 204`이면 `response.json()`을 호출하지 않도록 처리해야 합니다.

---

# 13. 현재 DB 관계

```text
User
 └─ OWNER
      └─ Restaurant
           ├─ CrowdSnapshot
           └─ Promotion

User
 └─ CUSTOMER / OWNER
      └─ CrowdSnapshot reporter
```

핵심 FK:

```text
Restaurant.owner_id        → app_user.id
CrowdSnapshot.restaurant_id → restaurant.id
CrowdSnapshot.reporter_id   → app_user.id
Promotion.restaurant_id     → restaurant.id
```

---

# 14. 프론트 연동 권장 순서

1. 회원가입 화면 연결
2. 로그인 및 JWT 저장
3. `/api/auth/me`로 로그인 유지 확인
4. 식당 목록 / 상세 연결
5. 혼잡도 표시
6. 혼잡도 제보
7. 활성 프로모션 표시
8. OWNER 전용 화면 분기
9. 점주 식당 관리
10. 프로모션 생성 / 수정 / 비활성화 / 삭제

이 순서로 연결하면 인증과 권한 문제를 먼저 해결한 뒤 주요 기능을 붙일 수 있어 디버깅이 쉽습니다.

---

# 15. 프론트 연결 전 마지막 확인 항목

현재까지 구현된 기능은 위 내용과 같습니다. 다만 프론트 최종 연결 전에 아래 항목은 Controller 코드를 기준으로 마지막 확인이 필요합니다.

- 혼잡도 현재 상태 조회 URL
- 혼잡도 차트 조회 URL
- 식당 DTO의 모든 세부 필드명
- 회원가입/로그인 응답 DTO의 정확한 최종 JSON 구조
- 공통 ErrorResponse 구조
- 프론트 실행 주소에 대한 CORS 설정
- 배포 시 API Base URL

이 부분은 기능 미구현이라는 의미가 아니라, 프론트와 백엔드가 최종 인터페이스를 정확히 맞추기 위한 체크 항목입니다.

---

# 16. 현재 백엔드 진행 상태 요약

```text
Spring Boot + MySQL 연결              완료
회원가입                              완료
로그인                                완료
BCrypt 비밀번호 암호화                완료
JWT 인증                              완료
CUSTOMER / OWNER 권한                완료

식당 생성                             완료
식당 조회                             완료
식당 수정                             완료
점주-식당 연동                        완료
본인 식당 권한 검증                   완료

혼잡도 제보                           완료
제보자 계정 연동                      완료
최근 30분 혼잡도 집계                 완료
동률 시 최신 제보 적용                완료
최근 제보 없을 시 UNKNOWN             완료
혼잡도 차트 계산                      완료

프로모션 생성                         완료
활성 프로모션 공개 조회               완료
점주용 전체 프로모션 조회             완료
프로모션 수정                         완료
프로모션 활성/비활성                  완료
프로모션 삭제                         완료
본인 식당 프로모션 권한 검증          완료
```

---

## 전달용 한 줄 요약

프론트는 `JWT → 식당 → 혼잡도 → 프로모션` 순으로 연결하면 되고, 사용자 ID나 점주 ID를 직접 보내기보다 JWT를 기준으로 서버가 사용자 관계를 처리하는 구조입니다.
