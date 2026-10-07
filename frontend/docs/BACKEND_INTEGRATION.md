# 백엔드 연동 안내

이 앱은 이미 구현된 Spring Boot 백엔드를 소비하는 모바일 프론트엔드입니다. 앱 안에 별도 인증 서버나 로컬 사용자 DB를 만들지 않습니다.

## 인증 흐름

1. 회원가입 화면에서 이메일, 닉네임, 비밀번호를 입력합니다.
2. 필수 약관 동의 후 손님 또는 점주 역할을 선택합니다.
3. 앱이 `POST /api/auth/signup`을 호출합니다.
4. 성공하면 같은 계정으로 `POST /api/auth/login`을 호출합니다.
5. 받은 `accessToken`만 SecureStore에 저장합니다.
6. 앱을 다시 열 때 토큰으로 `GET /api/auth/me`를 호출해 세션과 역할을 복원합니다.
7. 앱 시작 시 `/api/auth/me`가 401 또는 403을 반환하면 만료·무효 토큰을 삭제합니다. 일시적인 네트워크 장애만으로는 토큰을 삭제하지 않습니다.

로그인 성공 여부는 반드시 백엔드 응답으로 결정됩니다. 앱은 입력한 비밀번호를 자체 비교하거나 임의 사용자를 만들지 않습니다.

회원가입이 성공했지만 직후 자동 로그인만 실패하면 이미 만들어진 계정으로 다시 가입하지 않습니다. 가입 대기 상태를 지우고 로그인 화면으로 이동해 같은 이메일과 비밀번호로 로그인하도록 안내합니다.

현재 프론트가 보내는 회원가입 요청은 다음 구조입니다.

```json
{
  "email": "owner@example.com",
  "password": "owner1234!",
  "nickname": "테스트점주",
  "role": "OWNER"
}
```

로그인 요청은 다음 구조입니다.

```json
{
  "email": "owner@example.com",
  "password": "owner1234!"
}
```

`backend-b`의 실제 로그인 성공 응답은 최상위 `accessToken`, `tokenType`, `user`를 모두 반환합니다.

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

현재 프론트 타입은 `backend-b`의 `AuthResponse` 및 `UserResponse` record와 대조해 맞춘 상태입니다.

## 공통 API 호출

`src/api/client.ts`가 다음을 공통 처리합니다.

- API Base URL 결합
- JSON 요청·응답
- `Authorization: Bearer {accessToken}` 헤더
- 15초 타임아웃
- 204 No Content
- HTTP 오류와 네트워크 오류 구분

기능별 API는 `src/api/auth.ts`, `restaurants.ts`, `crowd.ts`, `promotions.ts`에 분리되어 있습니다.

## 로컬 연결

Spring Boot가 개발 PC의 8080 포트에서 실행된다는 기준입니다.

- Android 에뮬레이터에서 PC의 `localhost`는 `10.0.2.2`입니다.
- iOS 시뮬레이터는 `localhost`를 사용할 수 있습니다.
- 실제 Android/iPhone은 PC와 같은 네트워크에 연결하고 `EXPO_PUBLIC_API_BASE_URL`을 PC의 내부 IP로 설정합니다.
- 네이티브 앱 요청에는 브라우저 CORS 제한이 적용되지 않지만, 서버 바인딩과 운영체제 방화벽은 실제 기기의 접근을 허용해야 합니다.
- preview/production 앱은 `EXPO_PUBLIC_API_BASE_URL`이 없으면 개발용 로컬 주소로 대체하지 않습니다.

환경값을 바꾼 뒤에는 Expo 개발 서버를 다시 시작합니다.

```bash
pnpm start --clear
```

EAS preview/production 환경에도 각각 HTTPS API 주소를 등록해야 합니다. `EXPO_PUBLIC_*` 값은 앱 안에서 확인할 수 있는 공개 설정이므로 secret을 넣지 않습니다. `eas.json`은 각 빌드 프로필이 같은 이름의 EAS 환경을 사용하도록 설정되어 있습니다.

## 실제 연동 확인 순서

1. 백엔드에서 MySQL 연결과 Spring Boot 기동을 확인합니다.
2. 앱의 API 주소에서 `/api/restaurants` 같은 공개 GET 요청이 응답하는지 확인합니다.
3. 앱에서 새 이메일과 닉네임으로 회원가입합니다.
4. 가입 직후 자동 로그인되고 역할 화면으로 이동하는지 확인합니다.
5. 앱을 완전히 종료했다가 다시 열어 `/api/auth/me`로 세션이 복원되는지 확인합니다.
6. 잘못된 비밀번호, 중복 이메일·닉네임, 만료 토큰의 안내 문구를 확인합니다.

현재 개발 환경에서는 `localhost:8080`에 실행 중인 서버가 없어 네트워크 왕복 테스트는 수행할 수 없었습니다. 백엔드를 켜면 별도 프론트 코드 변경 없이 위 순서대로 검증할 수 있습니다.

## 백엔드와 마지막으로 맞출 항목

`backend-b` Controller/DTO 대조를 통해 인증, 식당, 프로모션, 혼잡도 계약을 확인했습니다. 현재 혼잡도와 차트 경로는 다음과 같습니다.

- `GET /api/restaurants/{restaurantId}/crowd`
- `GET /api/restaurants/{restaurantId}/crowd/chart?hours=12`

배포 전에는 다음 운영 계약을 추가로 정해야 합니다.

- 공통 오류 응답 구조
- 배포 API 주소
- 1시간 만료 뒤 재로그인 또는 refresh token 정책

백엔드는 현재 refresh token을 제공하지 않으므로, 인증 요청이 401을 반환하면 앱은 저장된 access token과 사용자 상태를 지워 재로그인을 요구합니다.

현재 약관 API가 제공되지 않았기 때문에 약관 체크 상태는 가입 진행을 막는 프론트 상태일 뿐 서버의 동의 이력으로 저장되지 않습니다. 약관 버전·동의 시각·선택 마케팅 동의를 보관해야 한다면 백엔드 DTO와 저장 API가 추가로 필요합니다. `OWNER` 선택도 서버의 최종 권한·사업자 검증을 대신하지 않습니다.
