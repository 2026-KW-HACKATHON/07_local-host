# 밥줄 모바일 프론트엔드

기존 Spring Boot 백엔드와 연결되는 **Expo + React Native 모바일 앱**입니다. 웹/Vite 미리보기용 프로젝트가 아니며, 인증을 프론트에서 흉내 내는 로컬 mock도 사용하지 않습니다.

현재 구현 범위는 Figma의 첫 번째 줄인 시작 화면, 위치 권한, 알림 권한, 환영 화면, 로그인, 회원가입, 약관, 역할 선택입니다.

## 현재 화면까지 연결된 백엔드 기능

- `POST /api/auth/signup`: 이메일, 비밀번호, 닉네임, `CUSTOMER`/`OWNER` 역할로 가입
- `POST /api/auth/login`: 실제 백엔드 로그인 및 JWT 수신
- `GET /api/auth/me`: 저장된 JWT로 로그인 유지와 사용자 역할 확인

첫 줄 다음 화면에서 사용할 식당 생성·목록·상세·수정, 현재 혼잡도·차트 조회와 제보, 프로모션 생성·조회·수정·삭제는 API 클라이언트 모듈까지 준비되어 있습니다. 아직 해당 화면에서 호출되는 단계는 아닙니다.

JWT만 기기의 SecureStore에 보관합니다. 비밀번호는 앱에 저장하지 않습니다. `backend-b` Controller를 기준으로 현재 혼잡도는 `GET /api/restaurants/{id}/crowd`, 차트는 `GET /api/restaurants/{id}/crowd/chart?hours=12`에 연결했습니다.

## 실행 준비

1. Spring Boot 백엔드를 먼저 실행합니다.
2. 패키지를 설치합니다.

```bash
pnpm install
```

3. 앱을 실행합니다.

```bash
pnpm start
```

Android 에뮬레이터가 준비되어 있으면 다음 명령으로 바로 열 수 있습니다.

```bash
pnpm android
```

## API 주소

별도 설정이 없을 때 앱은 실행 환경에 따라 다음 주소를 사용합니다.

- Android 에뮬레이터: `http://10.0.2.2:8080`
- iOS 시뮬레이터: `http://localhost:8080`
- 실제 휴대폰: `.env`에 같은 Wi-Fi의 개발 PC 주소를 지정해야 함

실제 휴대폰용 `.env` 예시:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080
```

`192.168.0.10`은 개발 PC의 실제 내부 IP로 바꿉니다. 백엔드는 외부 기기에서 접근할 수 있도록 해당 인터페이스에 열려 있어야 하며 Windows 방화벽에서도 8080 포트 접근이 가능해야 합니다. 배포 빌드는 HTTPS 백엔드 주소를 사용하는 것이 기준입니다.

preview/production 빌드는 개발용 localhost로 자동 대체되지 않습니다. EAS의 `preview`와 `production` 환경에 각각 `EXPO_PUBLIC_API_BASE_URL`을 등록한 뒤 빌드해야 합니다. 이 값은 앱 번들에 포함되는 공개 설정이므로 비밀번호나 API secret을 넣으면 안 됩니다.

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

내부 APK에서도 Android가 평문 HTTP를 차단할 수 있으므로 배포 서버 또는 HTTPS 터널을 사용합니다. production에서 평문 HTTP를 허용하도록 설정하지 않습니다.

자세한 연결 구조와 점검 순서는 [백엔드 연동 안내](./docs/BACKEND_INTEGRATION.md)에 정리했습니다.

## 디자인 구현 기준

- 확인된 Figma 원본 프레임: 412×917
- 검수 기준 뷰포트: 390×844
- `0.9203925856` 비율로 각 수치를 변환해 터치 영역과 화면 좌표를 함께 유지
- Auto Layout은 React Native의 Flex 구조로 변환
- 색상·간격·타이포그래피는 공통 토큰으로 관리
- 원본 로고·위치·알림 이미지가 전달되지 않은 곳은 투명 에셋 슬롯으로 보존
- 위치·알림 동의창은 이미지로 복제하지 않고 운영체제의 실제 권한 요청을 사용

Google/네이버 로그인은 백엔드 OAuth 엔드포인트와 앱 키가 제공되지 않아 가짜 성공 처리를 넣지 않았습니다. 현재 버튼은 필요한 설정을 안내하고, 이메일 로그인만 실제 백엔드에 연결됩니다.

현재 알림 단계는 운영체제 권한 요청까지만 구현되어 있습니다. 푸시 토큰 발급, FCM/APNs 설정, 백엔드 기기 토큰 등록은 관련 서버 API와 자격정보가 제공된 뒤 연결해야 합니다. 원본 앱 아이콘·스플래시·알림 아이콘도 아직 제공되지 않았으므로 현재 설정은 스토어 제출 완료본이 아닙니다.

## 검증 명령

```bash
pnpm run typecheck
pnpm run check:deps
pnpm run export:android
```

`export:android`는 Android용 JavaScript 번들 검증이며 APK 생성 명령은 아닙니다. APK/AAB 배포 빌드는 `eas.json`의 preview/production 프로필을 사용합니다.
