# 밥줄 모바일 프론트엔드

기존 Spring Boot 백엔드와 연결되는 **Expo + React Native 모바일 앱**입니다. 웹/Vite 미리보기용 프로젝트가 아니며, 인증을 프론트에서 흉내 내는 로컬 mock도 사용하지 않습니다.

시작·권한·로그인·회원가입 흐름과 손님/점주 화면이 구현되어 있습니다. 기능별 실제 서버 지원 범위와 미지원 항목은 `docs/BACKEND_REQUIREMENTS.md` 및 `docs/OWNER_UI.md`를 확인하세요.

## 현재 화면까지 연결된 백엔드 기능

- `POST /api/auth/signup`: 이메일, 비밀번호, 닉네임, `CUSTOMER`/`OWNER` 역할로 가입
- `POST /api/auth/login`: 실제 백엔드 로그인 및 JWT 수신
- `GET /api/auth/me`: 저장된 JWT로 로그인 유지와 사용자 역할 확인

손님과 점주 화면에서 식당·혼잡도·차트·프로모션 API를 호출합니다. 쿠폰 발급/보유와 포인트 적립 API는 아직 없으므로 실제 성공으로 표시하지 않습니다.

인증 정보 중 JWT만 기기의 SecureStore에 보관하며 비밀번호는 저장하지 않습니다. 기기 전용 프로필 설정은 계정·서버별로 분리해 저장하고 선택한 사진은 앱 영구 저장소에 복사합니다. `backend-b` Controller를 기준으로 현재 혼잡도는 `GET /api/restaurants/{id}/crowd`, 차트는 `GET /api/restaurants/{id}/crowd/chart?hours=24`에 연결했습니다.

## 손님 피드백 반영 (2026-10-08)

- 식당 목록 상단 손잡이를 위/아래로 끌거나 눌러 펼침/접기. 내부 스크롤과 3개씩 더 보기, 거리순 기본 선택.
- 거리 없는 식당은 임의 거리를 만들지 않고 ‘거리 확인 전’으로 표시.
- 검색은 앱 내부 네이버 지도 화면에서 열림. 밥줄 식당 API와 네이버 결과의 통합은 별도 서버 계약 필요.
- My의 별표 안내 삭제, 오른쪽 위 로그아웃, 사진 선택 및 닉네임 기기 저장.
- 명시적으로 GPS 관찰을 시작한 뒤 5분 체류/50m 이내 확인된 식당만 제보 가능. 앱 활성 중 안내 팝업, 백그라운드 체류 완료 알림에서 제보로 이동. OS 설정/방해금지에 따라 알림 표시 방식이 달라질 수 있음.
- 화면의 수집 중지 버튼은 제거하되 Android 수집 알림의 중지와 로그아웃 중지는 유지. 권한 철회·강제 종료·재부팅을 우회해 수집하지 않음.
- 사진 선택/네이버 검색/새 체류 알림은 새 네이티브 모듈이 포함된 APK 재빌드 필요. JavaScript 새로고침만으로 기존 APK에 추가되지 않음.
- Windows의 pnpm 경로 길이로 WebView C++ 빌드가 실패하지 않도록 `react-native.config.js`에서 공개 `node_modules` 경로를 사용한다. 생성된 Android 폴더를 직접 수정하지 않아 prebuild 후에도 유지된다.

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
- 원본 너비를 기준으로 `390 / 412` 비율을 적용하고 화면 높이는 별도로 유지
- Auto Layout은 React Native의 Flex 구조로 변환
- 색상·간격·타이포그래피는 공통 토큰으로 관리
- 전달받은 로고·픽토그램을 사용하고, 미제공 자산은 임의 아이콘 라이브러리로 대체하지 않음
- 위치·알림 동의창은 이미지로 복제하지 않고 운영체제의 실제 권한 요청을 사용

Google/네이버 로그인은 백엔드 OAuth 엔드포인트와 앱 키가 제공되지 않아 가짜 성공 처리를 넣지 않았습니다. 현재 버튼은 필요한 설정을 안내하고, 이메일 로그인만 실제 백엔드에 연결됩니다.

현재 알림 단계는 운영체제 권한 요청까지만 구현되어 있습니다. 푸시 토큰 발급, FCM/APNs 설정, 백엔드 기기 토큰 등록은 관련 서버 API와 자격정보가 제공된 뒤 연결해야 합니다. 원본 앱 아이콘·스플래시·알림 아이콘도 아직 제공되지 않았으므로 현재 설정은 스토어 제출 완료본이 아닙니다.

## 검증 명령

```bash
pnpm run typecheck
pnpm run check:deps
pnpm run export:android
node --test src/customer/restaurantList.test.cjs src/location/stayEligibility.test.cjs src/profile/localProfile.test.cjs
```

`export:android`는 Android용 JavaScript 번들 검증이며 APK 생성 명령은 아닙니다. APK/AAB 배포 빌드는 `eas.json`의 preview/production 프로필을 사용합니다.
