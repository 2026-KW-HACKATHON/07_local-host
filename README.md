<<<<<<< HEAD
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
=======
# 밥줄 백엔드 — 07_local-host 구조

요청한 `07_local-host/backend/src/main/java/bapjul/BapjulApplication.java` 구조로 정리한 Java 17 / Spring Boot 프로젝트입니다. 서버는 `backend` 한 폴더에서 빌드합니다. 체류 판정 코드도 서버 안의 `bapjul.stay` 패키지에 포함했습니다.

이전 버전의 5분 체류 및 50m 이내 식당 최대 3곳 추천 규칙을 유지합니다. 이번 변경은 폴더·패키지·설정 파일·빌드 경로를 팀 구조에 맞춘 것입니다. 원본 저장소의 파일이나 DB 구조는 제공되지 않았으므로 실제 밥줄 DB·인증 연동은 별도로 확인해야 합니다.

## 파일 위치

아래 경로는 `07_local-host`를 기준으로 합니다.

| 경로 | 역할 |
| --- | --- |
| `backend/pom.xml` | Java 17, Spring Boot, DB, 거리 계산 의존성 |
| `backend/mvnw`, `backend/mvnw.cmd` | Maven 실행 도구 |
| `backend/src/main/java/bapjul/BapjulApplication.java` | 서버 실행 클래스, `package bapjul;` |
| `backend/src/main/java/bapjul/location/api/` | 요청·응답·컨트롤러·오류 처리 |
| `backend/src/main/java/bapjul/location/service/` | 체류 재검사 및 식당 추천 |
| `backend/src/main/java/bapjul/location/catalog/` | 식당 DB 조회 인터페이스와 JDBC 구현 |
| `backend/src/main/java/bapjul/stay/` | 5분 체류 판정과 거리 계산 |
| `backend/src/main/resources/application.properties` | 기본 서버 설정 |
| `backend/src/main/resources/application-demo.properties` | 가상 식당 데모 설정 |
| `backend/src/main/resources/schema.sql` | 독립 실행용 식당 테이블 |
| `backend/src/test/java/bapjul/` | 체류 및 API 테스트 |
| `android-integration/` | Android 앱에 연결하는 Java 예제 |
| `.github/workflows/java.yml` | `backend` 폴더에서 빌드하는 GitHub Actions |

실제 기능을 구현하는 Java 파일은 `BapjulApplication.java` 아래의 하위 패키지에 나눠 두었습니다. `BapjulApplication`의 기본 component scan 범위가 `bapjul` 하위이므로 추가 scan 설정 없이 서버 Bean을 찾습니다.

## 처리 흐름

1. 앱에서 권한을 받은 뒤 약 15초마다 위치를 확인하고 폰의 메모리에 모읍니다.
2. 첫 관측점 기준 반경 20m 안에서 300초 이상 관측되면 체류가 성립합니다.
3. 300초 이후 첫 유효 위치 콜백에서 관측값을 한 번에 서버로 전송합니다.
4. 서버가 시간·이동 범위·위치 품질을 다시 검사합니다.
5. 마지막 위치로 식당까지의 거리를 계산하여 50m 이내 최대 3곳을 거리순으로 반환합니다. 식당이 0~2곳이면 있는 만큼 반환합니다.

5분 체류를 판단하려면 그전부터 휴대폰에서 위치를 관측해야 합니다. 서버에 전송하는 시점이 5분 이후입니다. 서버에서 5분 동안 기다리는 방식이 아니며, 위치 이력을 DB에 저장하지 않습니다.

| 기준 | 값 |
| --- | --- |
| 체류 시간 | 300초 이상, 단말의 단조 증가 시간 사용 |
| 체류 반경 | 첫 관측점으로부터 20m |
| 위치 정확도 | 단말이 보고한 오차 반경 20m 이하 |
| 요청하는 위치 관측 간격 | 약 15초, OS가 정확한 주기를 보장하지 않음 |
| 최대 관측 공백 | 60초, 초과하면 초기화 |
| 앱에서 허용하는 위치의 나이 | 30초 |
| 서버에서 허용하는 마지막 위치의 나이 | 120초, 미래 시각은 최대 30초 |
| 식당 검색 | 반경 50m, 최대 3곳, 거리순 |

20m 체류·정확도 기준은 초기 운영값입니다. `bapjul.stay.StayRules.DEFAULT`에서 변경하고 앱과 서버에 동일하게 반영하세요. 정확도 부족·체류 범위 이탈·관측 중단은 체류 계산을 초기화합니다. 같은 체류 중에는 앱에서 한 번만 요청합니다.

거리 계산은 GeographicLib의 WGS84 수평 거리입니다. 반올림 전 거리로 필터와 정렬을 수행하고, 표시할 거리만 소수 첫째 자리로 반올림합니다. 수치 경계 오차에 0.000001m 여유를 둡니다. 동률은 식당 ID 순입니다. 클라이언트 관측값의 일관성을 검사하는 기능이며 실제 입장·층·위치 조작 여부를 증명하지는 못합니다.

## 실행

JDK 17을 설치하고 `JAVA_HOME`을 설정하세요. 포함된 Maven Wrapper가 필요한 Maven을 내려받습니다. 최초 실행은 인터넷 연결이 필요합니다.

Windows PowerShell에서 `07_local-host` 폴더를 연 다음:

```powershell
cd backend
.\mvnw.cmd verify
java -jar target/bapjul-backend-1.0.0.jar --spring.profiles.active=demo
```

macOS / Linux:

```bash
cd backend
sh mvnw verify
java -jar target/bapjul-backend-1.0.0.jar --spring.profiles.active=demo
```

IntelliJ를 사용한다면 `backend/pom.xml`을 Maven 프로젝트로 열고 `bapjul.BapjulApplication`을 실행해도 됩니다. 가상 식당을 사용하려면 실행 인자에 `--spring.profiles.active=demo`를 추가하세요.

두 번째 터미널에서 `07_local-host` 폴더를 연 다음 데모 요청을 보냅니다.

```powershell
.\scripts\demo-request.ps1
```

JDK 17을 사용하는 다른 환경에서는:

```bash
java scripts/DemoRequest.java
```

스크립트는 합성 위치로 5분 관측을 만들어 즉시 호출합니다. 실제 5분을 기다리는 기기 테스트는 아닙니다. 데모는 12m·24m·38m의 가상 식당 3곳을 반환합니다. 실제 앱에서는 `android-integration` 예제를 기존 위치 권한·서비스·화면에 연결해야 합니다.

## API와 데이터

`POST /api/v1/location/stays/recommendations`

요청은 마지막 위치의 UTC 측정 시각인 `capturedAt`과 시간순 `samples` 배열로 구성합니다. 각 관측값에는 `latitude`, `longitude`, `accuracyMeters`, `elapsedRealtimeMillis`가 필요합니다. `elapsedRealtimeMillis`는 위치에 기록된 단말 부팅 후 경과 시간이며 Unix timestamp가 아닙니다. 오래된 위치를 재전송할 때 `capturedAt`을 현재 시각으로 바꾸면 안 됩니다. 실행 가능한 전체 요청 예시는 두 데모 스크립트에 있습니다.

응답은 `radiusMeters`, `limit`, `count`, `dwellDurationMillis`, `restaurants`입니다. 식당 항목에는 `id`, `name`, `address`, `floor`, `latitude`, `longitude`, `distanceMeters`가 들어갑니다.

| 응답 | 의미 |
| --- | --- |
| HTTP 200, count 0~3 | 체류 검증 후 식당 조회 성공 |
| HTTP 400, INVALID_REQUEST | 필드 누락, 잘못된 JSON/자료형 |
| HTTP 400, INVALID_STAY | 5분 미만, 이탈, 공백, 정확도 부족, 오래된 위치 등 |

상태 확인은 `GET /health`입니다. 기본 설정은 실행 폴더의 `./data/bapjul-location.mv.db`에 H2 DB를 만듭니다. `demo` 프로필을 빼면 가짜 식당은 등록되지 않습니다. 식당 등록 형식은 [docs/restaurant-example.sql](docs/restaurant-example.sql)을 참고하세요.

기존 밥줄 식당 테이블은 `RestaurantCatalog`를 구현해 연결합니다. PostgreSQL 드라이버도 포함했으며 접속 환경 변수는 `BAPJUL_DB_URL`, `BAPJUL_DB_USERNAME`, `BAPJUL_DB_PASSWORD`입니다. PostgreSQL에서의 스키마 적용은 기존 마이그레이션 절차를 따르세요. 실제 운영 DB 연결은 확인하지 않았습니다.

조회 구현은 활성 식당을 읽어 거리를 계산합니다. 많은 식당 데이터에는 DB의 공간 인덱스로 후보를 좁힌 뒤 50m 최종 검사를 유지하는 방식으로 확장하세요. 로그인과 혼잡도 저장 기능은 기존 밥줄 서버에 연결해야 합니다.

## 팀 저장소에 올리기

저장소 이름이 `07_local-host`라면 그 저장소 최상위에 `backend`가 놓여야 합니다. 압축 속 `07_local-host` 폴더의 **내용물**이 저장소 내용에 대응합니다. 경로에 `07_local-host/07_local-host/backend`가 생기지 않게 확인하세요.

GitHub에 파일을 올리는 것과 기존 앱에 기능을 연결하는 것은 별도입니다. 기존 소스가 있다면 [docs/GITHUB.md](docs/GITHUB.md), [docs/INTEGRATION.md](docs/INTEGRATION.md)에 따라 기능 브랜치에서 합치세요. 사진에는 빌드 도구가 표시되지 않아 이전과 같은 Maven을 유지했습니다. 실제 팀이 Gradle을 사용 중이면 기존 Gradle 설정에 의존성을 옮겨야 합니다.

검증 범위는 [docs/VERIFICATION.md](docs/VERIFICATION.md)에 기록했습니다. Android 어댑터는 서버 빌드 대상이 아니며, 화면 꺼짐·권한 변경·배터리 정책을 포함한 실제 기기 테스트가 필요합니다.
>>>>>>> origin/backend-a
