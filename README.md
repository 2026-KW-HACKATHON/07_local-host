# 밥줄 (Bapjul)

**식당의 혼잡도를 확인하고, 방문한 식당의 상황을 제보하며, 점주가 제공하는 혜택을 이용하는 모바일 서비스**입니다.

2026 광운대학교 해커톤 `07_local-host` 팀 프로젝트로, Expo·React Native 앱, Spring Boot 백엔드, Android GPS 체류 확인 모듈로 구성됩니다. 손님은 식당과 혜택을 탐색하고 혼잡도를 제보하며, 점주는 식당 정보·혼잡도·프로모션을 관리하고 누적 제보 데이터를 분석합니다.

이 문서는 저장소의 `backend/`, `frontend/`, `android-integration/` 코드를 기준으로 서비스 기능, 내부 동작, 실행 방법과 API를 설명합니다.

## 목차

- [주요 기능](#주요-기능)
- [기술 구성](#기술-구성)
- [프로젝트 구조](#프로젝트-구조)
- [앱과 서버의 동작](#앱과-서버의-동작)
- [데이터 저장과 연동 범위](#데이터-저장과-연동-범위)
- [개발 환경 실행](#개발-환경-실행)
- [백엔드 API](#백엔드-api)
- [개발 데이터와 확인 명령](#개발-데이터와-확인-명령)
- [추가 문서](#추가-문서)

## 주요 기능

### 공통

- 밥줄 온보딩 화면과 운영체제의 위치·알림 권한 요청.
- 이메일·닉네임·비밀번호 입력, 필수 약관 확인, 손님·점주 역할 선택 후 회원가입.
- 가입 완료 후 방금 가입한 계정으로 바로 로그인하거나 이메일이 채워진 로그인 화면으로 이동.
- 이메일 로그인과 JWT 기반 세션 복원, `CUSTOMER` / `OWNER` 역할에 따른 화면 분기.
- 로그아웃·인증 만료 시 로그인 상태와 GPS 체류 서비스 정리.

### 손님

- **홈:** 식당 이름·주소 검색, 식당 목록 펼침·접기, 확인 가능한 거리 기준 정렬, 혼잡도와 활성 할인 혜택 조회.
- **식당 상세:** 주소·영업시간·최근 제보 수·최근 24시간 혼잡도 차트·다운로드 가능한 쿠폰 확인.
- **지도 검색:** 앱 안의 WebView에서 네이버 지도 검색 결과 확인.
- **제보:** GPS 5분 체류 확인 후 추천된 식당에서 입장을 확인하고 혼잡도 선택·제출.
- **My:** 닉네임·프로필 사진 변경, 현재 로그인 세션의 제보 확인, 기기 포인트 조회와 쿠폰 다운로드·사용.

### 점주

- **식당 등록:** 이름·주소·영업시간 입력, 정기 휴무일 선택, 등록 후 1~3단계 혜택 설정.
- **혼잡도 제보:** 식당 상황을 직접 제보하고 본인이 작성한 내역 확인.
- **프로모션:** 단계별 혜택·포인트 비용·게시 종료일·쿠폰 사용 요일과 시간 설정, 발행·취소.
- **데이터 분석:** 오늘을 제외한 최근 28일의 서버 제보를 요일별·시간대별로 조회.
- **My:** 식당 주소·영업시간 수정, 정기 휴무일과 특정 날짜의 영업 변경 사항 저장.

## 기술 구성

### 모바일

- Expo `~57.0.27`, React Native `0.86.3`, React `19.2.3`
- TypeScript `~6.0.3`, pnpm `11.19.0`
- Expo SecureStore: 로그인 토큰과 일부 기기 설정
- Expo FileSystem: 사진, 점주 제보, 쿠폰·포인트 파일
- Expo Location / Notifications: 위치·알림 권한
- Expo ImagePicker / DocumentPicker: 프로필 사진 선택
- React Native WebView: 네이버 지도 검색
- Noto Sans KR / Inter, 공통 디자인 토큰과 제공된 로고·픽토그램

### 백엔드

- Java 17, Spring Boot `4.1.1`, Gradle Wrapper `9.7.1`
- Spring Web, Spring Data JPA, Validation, Security, Mail
- MySQL, BCrypt 비밀번호 해싱, JJWT `0.13.0`
- GeographicLib `2.1`: WGS84 좌표 간 거리 계산
- JUnit·Mockito 테스트, 테스트용 H2

### Android

- Kotlin·Java 로컬 Expo 모듈 `BapjulStay`
- Google Play Services Location `21.0.1`
- 위치 foreground service, 체류 완료 알림, `bapjul://report` 앱 링크

통합 서버의 빌드 기준은 `backend/build.gradle`입니다. 함께 있는 `pom.xml`과 Maven Wrapper는 이전 위치 추천 구현에서 가져온 파일입니다.

## 프로젝트 구조

```text
07_local-host/
├─ backend/
│  ├─ build.gradle / gradlew / gradlew.bat
│  └─ src/
│     ├─ main/java/bapjul/
│     │  ├─ BapjulApplication.java  # 서버 진입점, UTC Clock
│     │  ├─ auth/                  # 가입·로그인·내 정보
│     │  ├─ security/              # JWT 인증·역할별 접근 제어
│     │  ├─ user/                  # 사용자·역할
│     │  ├─ restaurant/            # 식당·좌표·거리 조회
│     │  ├─ crowd/                 # 제보·혼잡도 집계·차트
│     │  ├─ promotion/             # 할인율·기간 기반 프로모션
│     │  ├─ owner/                 # 점주 통계·제보 조회
│     │  ├─ location/              # 체류 검증·주변 식당 추천
│     │  ├─ stay/                  # Java 공통 체류 판정
│     │  │  └─ proof/              # 서버 체류 증명
│     │  ├─ wallet/                # 서버 포인트·거래 내역
│     │  ├─ coupon/                # 서버 쿠폰 발행·다운로드·사용
│     │  ├─ profile/               # 서버 프로필·약관 동의
│     │  ├─ verification/          # SMTP 이메일 인증
│     │  ├─ push/                  # Expo Push Token 관리
│     │  ├─ external/              # 네이버 지역 검색 중계
│     │  └─ devseed/               # 선택적 개발 데이터
│     ├─ main/resources/           # 설정·참고 SQL
│     └─ test/                     # 백엔드 테스트
├─ frontend/
│  ├─ App.tsx                      # 화면 흐름·역할 분기
│  ├─ app.json / eas.json          # 권한·앱 식별자·빌드 프로필
│  ├─ src/
│  │  ├─ api/                      # JSON 요청·API 함수·타입
│  │  ├─ auth/                     # 토큰 복원·세션 관리
│  │  ├─ screens/                  # 인증·손님·점주 화면
│  │  ├─ components/               # 폼·차트·달력·쿠폰·공통 UI
│  │  ├─ customer/                 # 목록·검색·영업시간 판정
│  │  ├─ owner/                    # 점주 설정·제보 저장·시간 처리
│  │  ├─ coupons/                  # 기기 쿠폰·지갑·사용 조건
│  │  ├─ profile/                  # 기기 프로필·사진 저장
│  │  ├─ location/                 # 네이티브 체류 서비스 연결
│  │  ├─ config/                   # API 주소·요청 제한 시간
│  │  └─ theme/                    # 색상·크기·간격·글꼴 토큰
│  ├─ modules/bapjul-stay/          # Android 체류 확인 서비스
│  ├─ plugins/withBapjulStay.js     # prebuild Java 소스 연결
│  ├─ assets/                      # 로고·아이콘·온보딩 이미지
│  └─ docs/                        # 프론트·서버 연동 문서
├─ android-integration/            # 위치 관측·추천 API 어댑터
├─ scripts/                        # 추천 요청·개발 시드 확인
├─ docs/                           # 통합·시드·검증 참고 문서
└─ .github/workflows/java.yml      # Gradle 빌드·테스트 CI
```

앱 진입점은 `frontend/App.tsx`, 서버 진입점은 `BapjulApplication`입니다. 현재 점주 통계 화면은 `frontend/src/components/OwnerAnalytics.tsx`를 사용합니다. 루트의 `.patch`·`.zip` 파일은 기존 작업 전달 자료입니다.

## 앱과 서버의 동작

### 인증과 화면 전환

`App.tsx`가 시작 → 위치 권한 → 알림 권한 → 환영 → 로그인·회원가입 흐름을 관리합니다. 저장된 JWT가 유효하면 역할에 맞는 홈으로 진입합니다.

가입은 이메일·닉네임·비밀번호 입력 → 약관 확인 → 역할 선택 → 서버 가입 → 가입 완료 순서입니다. 서버는 이메일·닉네임 중복을 확인하고 비밀번호를 BCrypt로 저장합니다. 로그인 응답은 JWT와 사용자 정보를 포함하며 기본 토큰 유효기간은 1시간입니다.

`AuthContext`는 SecureStore의 토큰을 복원하고 `/api/auth/me`로 사용자를 확인합니다. `api/client.ts`는 Bearer 토큰, JSON 요청·응답, 기본 15초 요청 제한 시간과 오류를 처리합니다. 비밀번호는 기기에 저장하지 않습니다.

### 식당 조회와 혼잡도

손님 홈은 식당 목록과 각 식당의 현재 혼잡도·활성 할인 프로모션을 조회합니다. 이름·주소 검색과 거리순 정렬을 적용하며, GPS 추천에서 거리가 확인되지 않은 식당에는 `거리 확인 전`을 표시합니다.

서버의 혼잡도 상태:

- `AVAILABLE`: 바로 앉아요, 점수 `0`
- `FEW_SEATS`: 자리가 적어요, 점수 `1`
- `LONG_WAIT`: 대기가 길어요, 점수 `2`
- `UNKNOWN`: 정보 없음, 점수 `-1`

현재 상태는 **최근 30분 제보에서 가장 많이 나온 상태**입니다. 동률이면 가장 최근 제보의 상태를 선택하고, 최근 제보가 없으면 `UNKNOWN`을 반환합니다. `UNKNOWN`은 직접 제보할 수 없습니다.

현재 모바일의 공통 혼잡도 배지는 같은 상태를 `여유`·`보통`·`혼잡`으로 표시합니다. 위 문구는 서버 응답의 `label` 기준입니다.

혼잡도 차트는 제보를 시간별로 묶고 같은 대표 상태 규칙을 적용합니다. 손님 상세 화면은 최근 24시간을 요청합니다. 점주 분석은 별도로 **혼잡도 상태별 실제 제보 건수**를 집계하며, 오늘을 제외한 지난 28일의 요일별 건수와 선택 요일의 10~21시 분포를 표시합니다.

### GPS 체류와 식당 추천

사용자가 동의하면 `BapjulStayService`가 Android 위치 foreground service를 시작합니다. 기기의 `StayTracker`가 관측을 누적하고 서버의 `StayWindowValidator`가 전송된 구간을 다시 확인합니다.

- 최소 체류 시간 **5분**
- 첫 관측 위치에서 **20m 이내**
- GPS 오차 **20m 이하**
- 관측 간 공백 **60초 이하**
- 기기에서 새 관측을 받아들일 때 관측 나이 **30초 이하**
- 전송 구간 **2~128개** 샘플
- 마지막 위치에서 **50m 이내**, 거리순 **최대 3개 식당** 추천

체류가 확인되면 `/api/v1/location/stays/recommendations`로 구간과 마지막 측정 시각을 보냅니다. 앱 활성 상태에서는 제보 안내 팝업, 백그라운드에서는 체류 완료 알림으로 안내합니다. 사용자가 방문 식당을 확인한 뒤 혼잡도를 제출합니다.

이동·정확도 부족·관측 공백이 발생하면 후보를 비우고 새 구간을 시작합니다. 원본 GPS와 서비스 토큰은 프로세스 메모리에서 관리하며, 알림의 중지 버튼·로그아웃·위치 권한 철회 시 수집을 중지합니다.

`withBapjulStay.js`는 prebuild 시 백엔드의 공통 체류 Java 소스와 `android-integration/StayApiClient.java`를 네이티브 모듈로 복사합니다. APK 빌드에는 `backend/`, `frontend/`, `android-integration/` 디렉터리가 함께 필요합니다.

### 점주 관리와 혜택

식당 등록 시 서버가 JWT의 계정을 점주로 연결합니다. 식당·프로모션 수정과 점주 통계 조회는 소유자를 확인합니다.

식당 이름·주소·영업시간은 서버에 저장하고, 단계별 혜택·정기 휴무일·날짜별 영업 변경은 기기에 보관합니다. 앱의 쿠폰 발행은 비용과 사용 조건을 저장합니다. 발행 취소는 새 다운로드를 중단하며, 이미 받은 쿠폰은 기존 조건·유효기간을 유지합니다.

서버 할인 프로모션은 `promotion` 모델이며 활성 상태와 기간을 기준으로 공개 조회합니다. 서버에서 포인트로 다운로드하는 쿠폰은 별도 `coupon_offer`·`issued_coupon` 모델입니다.

### 서버 데이터 모델

서버 코드는 기능별로 Controller가 요청을 받고, Service가 규칙과 트랜잭션을 처리하며, Repository가 JPA로 데이터를 읽고 저장하는 구조입니다. DTO는 요청·응답 필드를 정의합니다. 점주 통계·외부 검색 등 일부 기능은 Controller에서 집계나 외부 호출을 처리합니다.

- `app_user`: 계정·비밀번호 해시·닉네임·역할. 이메일과 닉네임은 고유값입니다.
- `restaurant`: 식당 이름·주소·영업시간·좌표·층과 소유 점주.
- `crowd_snapshot`: 식당·제보자·혼잡도·관측 시각·선택적 설명.
- `promotion`: 식당별 할인율·기간·활성 상태.
- `point_wallet` / `point_transaction`: 사용자별 잔액과 중복 처리를 구분하는 거래 키.
- `coupon_offer` / `issued_coupon`: 발행 조건과 다운로드 당시 혜택·조건·만료·사용 시각.
- `stay_proof`: 사용자·식당에 연결된 증명 토큰·만료·사용 시각.
- `user_consent`, `email_verification`, `device_push_token`: 동의 기록·이메일 인증 상태·푸시 기기 토큰.

`bapjul_location_restaurants`는 이전 위치 추천의 별도 좌표 테이블입니다. 현재 추천 카탈로그는 좌표가 있는 정식 `restaurant` 데이터와 이 참고 테이블의 활성 데이터를 함께 읽습니다.

## 데이터 저장과 연동 범위

### 현재 앱의 서버 연결

- 회원가입·로그인·현재 사용자 확인
- 식당 목록·상세·등록·수정
- 혼잡도 조회·제보·차트
- 활성 할인 프로모션·점주 관리용 프로모션 조회
- GPS 관측 구간 기반 식당 추천
- 점주 식당의 요일·시간별 28일 통계

### 현재 앱의 기기 저장

- **프로필:** 표시 닉네임은 SecureStore, 사진은 앱 파일 저장소. 서버·계정별로 분리합니다.
- **점주 설정:** 단계별 혜택·정기 휴무일·영업 변경을 서버·점주·식당별로 저장합니다.
- **점주 제보:** 서버 성공 응답과 추가 설명을 파일에 저장합니다. 현재 앱의 추가 설명은 서버 요청 본문에는 포함하지 않습니다.
- **손님 제보 내역 화면:** 현재 로그인 세션에서 제출한 성공 응답을 화면 상태로 보관합니다.
- **쿠폰·포인트:** 서버 주소별 파일에 발행 혜택을 저장하고 손님 계정별 지갑을 분리합니다. 같은 앱 설치에서 점주·손님 계정 사이에 발행 혜택을 조회할 수 있습니다.

기기 지갑은 최초 `1,000P`, 성공한 본인 제보당 `1,000P`를 적립하며 같은 제보 ID의 중복 적립을 막습니다. 쿠폰 비용은 최소 `500P`, `500P` 단위입니다. 다운로드 시 포인트를 차감하고 **72시간** 유효한 쿠폰을 저장합니다. 사용 가능 요일·시간에 맞을 때 사용 완료로 바꿉니다. 기기 저장 값은 다른 기기로 자동 동기화되지 않습니다.

### 백엔드의 추가 API

서버에는 포인트 지갑·거래 내역, 쿠폰 발행·다운로드·사용, 내 제보 전체 조회, 체류 증명, 프로필·사진·약관 동의, 이메일 인증, 푸시 토큰 등록, 네이버 지역 검색 API도 구현되어 있습니다. 주요 모바일 화면은 앞의 기기 저장 흐름을 사용하므로 서버 값과 기기 저장 값은 각각 관리됩니다.

서버 지갑도 최초 생성 시 `1,000P`를 지급합니다. 서버 제보 보상은 **손님이 유효한 서버 체류 증명을 제출한 경우**에 적용하고 같은 식당의 최근 30분 제보 여부를 확인합니다. 현재 앱은 `{ "level": "AVAILABLE" }` 형태로 제보하며 서버 증명 토큰은 보내지 않습니다.

서버 체류 증명은 사용자·식당에 연결된 1회용 토큰이며 120초 동안 유효합니다. 서버 쿠폰 다운로드는 `requestId`로 재시도를 구분하고 지갑 차감·발급을 트랜잭션으로 처리합니다. 쿠폰 사용 API는 사용 상태 기록을 담당합니다.

Google·네이버 로그인 버튼은 설정 안내를 표시합니다. 앱의 지도 검색은 네이버 웹 검색이며 서버 지역 검색 API와 별도입니다. Android 체류 완료 알림은 기기 알림이고, 서버 푸시 API는 기기 토큰 등록·해제를 담당합니다.

## 개발 환경 실행

### 준비 사항

- Git, JDK 17과 `JAVA_HOME`, MySQL
- pnpm `11.19.0`을 실행할 수 있는 Node.js 환경
- Android 실행 시 Android SDK·에뮬레이터 또는 실제 기기

`main` 브랜치의 통합 코드를 내려받습니다.

```powershell
git clone --branch main https://github.com/2026-KW-HACKATHON/07_local-host.git
cd 07_local-host
```

### 백엔드

MySQL에 데이터베이스를 생성합니다.

```sql
CREATE DATABASE bapjul CHARACTER SET utf8mb4;
```

기본 JDBC 주소는 `jdbc:mysql://localhost:3306/bapjul?serverTimezone=Asia/Seoul&characterEncoding=UTF-8`이며 JPA는 `ddl-auto=update`를 사용합니다.

PowerShell에서 DB 계정·비밀번호와 JWT 키를 지정하고 실행합니다. 예시 값은 실제 값으로 바꾸고, `JWT_SECRET`은 32바이트 이상의 충분히 긴 임의 값으로 설정합니다.

```powershell
cd backend
$env:BAPJUL_DB_USERNAME = "root"
$env:BAPJUL_DB_PASSWORD = "your-mysql-password"
$env:JWT_SECRET = "replace-with-your-own-random-secret-at-least-32-bytes"
.\gradlew.bat bootRun
```

macOS·Linux에서는 같은 환경 변수를 설정하고 `bash ./gradlew bootRun`을 실행합니다.

환경 변수:

- `PORT`: 기본 `8080`.
- `BAPJUL_DB_URL`: JDBC 주소, 생략 시 위의 기본값.
- `BAPJUL_DB_USERNAME`: DB 계정, 생략 시 `DB_USERNAME`, 그다음 `root`.
- `BAPJUL_DB_PASSWORD`: DB 비밀번호, 생략 시 `DB_PASSWORD`.
- `JWT_SECRET`: JWT 서명 키.
- `BAPJUL_STAY_PROOF_ENFORCED`: 손님 제보의 서버 증명 필수 여부, 기본 `false`.
- `BAPJUL_CONSENT_ENFORCED`: 가입 시 동의·버전 필수 여부, 기본 `false`.
- `BAPJUL_EMAIL_ENABLED`: SMTP 이메일 인증 사용 여부, 기본 `false`.
- `BAPJUL_EMAIL_FROM`: 인증 메일 발신 주소. 사용 시 Spring Mail SMTP 설정도 필요.
- `BAPJUL_PROFILE_UPLOAD_DIR`: 서버 사진 저장 경로, 기본 `./data/profile-images`.
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: 서버 네이버 지역 검색 키.

현재 앱 요청 형태로 실행할 때는 증명·동의·이메일 인증 강제 옵션을 기본값으로 유지합니다. `local`은 개발 시드 활성화 조건입니다. 별도의 `application-local.properties`가 없으므로 `local`만 지정해도 DB가 H2로 바뀌지는 않습니다.

### 프론트엔드

새 터미널에서 저장소의 `frontend/`로 이동합니다.

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm start
```

`frontend/src/config/api.ts`의 API 주소:

- 개발 Android 에뮬레이터: `http://10.0.2.2:8080`
- 개발 iOS 시뮬레이터: `http://localhost:8080`
- 직접 지정: `frontend/.env`의 `EXPO_PUBLIC_API_BASE_URL`
- preview·production: `EXPO_PUBLIC_API_BASE_URL` 명시 필요

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
```

일반 API를 같은 네트워크의 PC로 연결할 때는 PC 내부 IP와 접근 가능한 서버 포트를 지정합니다. **실제 기기 GPS 체류 모듈은 HTTPS를 사용합니다.** 디버그 앱의 HTTP 예외는 `10.0.2.2`와 `127.0.0.1` 주소입니다.

### Android 네이티브 실행·배포

GPS 체류는 Android 8 이상과 로컬 모듈이 포함된 네이티브 앱에서 사용합니다. Expo Go에는 이 모듈이 없습니다.

`frontend/`에서 실행합니다.

```powershell
pnpm exec expo prebuild --platform android --no-install
pnpm android
```

정확한 위치 권한과 Android 13 이상의 알림 권한을 요청합니다. 네이티브 모듈·권한 변경 후에는 APK를 다시 빌드합니다.

`eas.json`의 `preview`·`production` 환경에 HTTPS API 주소를 등록한 뒤 배포 빌드를 실행합니다.

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

`preview`는 APK를 생성합니다. `pnpm run export:android`는 Android JavaScript 번들 생성 명령입니다.

## 백엔드 API

기본 서버는 `http://localhost:8080`이며 인증 요청은 `Authorization: Bearer <accessToken>`을 사용합니다. 아래 목록은 서버 구현 기준입니다. 모바일 화면의 연결 범위는 [데이터 저장과 연동 범위](#데이터-저장과-연동-범위)를 참고하세요.

### 인증·프로필·약관

- `POST /api/auth/signup`: 가입.
- `POST /api/auth/login`: JWT·사용자 정보 반환.
- `GET /api/auth/me`: 현재 사용자, JWT 필요.
- `POST /api/auth/email/send`: SMTP 인증번호 발송.
- `POST /api/auth/email/verify`: 6자리 인증번호 확인.
- `PATCH /api/auth/me/nickname`: 서버 닉네임 변경, JWT 필요.
- `POST /api/auth/me/photo`: `multipart/form-data`의 `file`, PNG/JPEG 최대 2MB, JWT 필요.
- `GET /api/auth/me/photo`: 본인 사진, JWT 필요.
- `GET /api/auth/me/consents`: 약관 동의 기록, JWT 필요.
- `PATCH /api/auth/me/consents/marketing`: 마케팅 동의 변경, JWT 필요.

가입 필드는 `email`, `password` 8~50자, `nickname` 2~30자, `role` (`CUSTOMER` / `OWNER`)입니다. 서버는 선택적 `termsAgreed`, `privacyAgreed`, `marketingAgreed`, `termsVersion`, `privacyVersion`도 받습니다.

### 식당

- `GET /api/restaurants`: 목록. `latitude`·`longitude`를 함께 전달하면 거리 계산·정렬.
- `GET /api/restaurants/{restaurantId}`: 상세.
- `POST /api/restaurants`: 등록, 점주 JWT 필요.
- `PUT /api/restaurants/{restaurantId}`: 본인 식당 수정, 점주 JWT 필요.

기본 요청은 `name`, `address`, `openingTime`, `closingTime`입니다. 서버는 `latitude`, `longitude`, `floor`도 받으며 GPS 추천에는 식당 좌표가 필요합니다. 현재 앱 폼은 기본 필드를 전송합니다. 위도·경도는 함께 지정합니다.

### 혼잡도·제보

- `POST /api/restaurants/{restaurantId}/crowd`: 제보, JWT 필요. `level`, 선택적 `description`·`proofToken`.
- `GET /api/restaurants/{restaurantId}/crowd`: 최근 30분 대표 상태.
- `GET /api/restaurants/{restaurantId}/crowd/chart?hours=24`: 차트. `hours` 1~168, 기본 12.
- `GET /api/restaurants/{restaurantId}/crowd/reports`: 식당 제보 목록.
- `GET /api/crowd/reports/me`: 본인 전체 제보, JWT 필요.

페이지 조회는 `page` 기본 0, `size` 기본 20·최대 100입니다.

### 점주 통계

- `GET /api/restaurants/{restaurantId}/owner/analytics?days=28`: 오늘 포함 일별 건수.
- `GET /api/restaurants/{restaurantId}/owner/analytics/weekday-hourly?days=28`: 오늘 제외 요일·시간별 건수.
- `GET /api/restaurants/{restaurantId}/owner/reports`: 본인 식당의 전체 제보 목록.

모두 본인 식당 점주 JWT가 필요합니다. `days`는 1~28입니다. 요일·시간별 API는 월요일 1~일요일 7, 각 요일 0~23시 집계를 반환합니다.

### 할인 프로모션

- `GET /api/restaurants/{restaurantId}/promotions`: 현재 활성 목록.
- `GET /api/restaurants/{restaurantId}/promotions/manage`: 전체 관리 목록, 점주 JWT 필요.
- `POST /api/restaurants/{restaurantId}/promotions`: 생성, 점주 JWT 필요.
- `PUT /api/restaurants/{restaurantId}/promotions/{promotionId}`: 수정·활성 상태 변경, 점주 JWT 필요.
- `DELETE /api/restaurants/{restaurantId}/promotions/{promotionId}`: 삭제, 점주 JWT 필요.

생성은 `title`, `description`, `discountPercent` 1~100, `startAt`, `endAt`을 받습니다. 종료는 시작 이후여야 하고 수정에는 `enabled`도 포함합니다.

### 위치 추천·체류 증명

- `GET /health`: 서버 상태.
- `POST /api/v1/location/stays/recommendations`: `capturedAt`·`samples`로 추천, 현재 서버의 공개 경로.
- `POST /api/stay-proofs`: 서버 증명 발급, 손님 JWT 필요.

샘플은 `latitude`, `longitude`, `accuracyMeters`, `elapsedRealtimeMillis`입니다. `capturedAt`은 마지막 GPS 관측의 UTC 측정 시각입니다. 추천은 과거 120초·미래 30초, 증명은 과거 60초·미래 10초 범위를 검사합니다. 증명에는 `restaurantId`도 필요하며 마지막 위치와 식당의 거리 50m 이내를 확인합니다.

### 서버 포인트·쿠폰

- `GET /api/wallet`: 손님 잔액, JWT 필요.
- `GET /api/wallet/transactions`: 손님 거래 내역, JWT 필요.
- `GET /api/restaurants/{id}/coupon-offers`: 활성 발행 목록.
- `GET /api/restaurants/{id}/coupon-offers/manage`: 관리 목록, 점주 JWT 필요.
- `POST /api/restaurants/{id}/coupon-offers`: 발행, 점주 JWT 필요.
- `DELETE /api/coupon-offers/{id}`: 본인 식당 발행 취소, 점주 JWT 필요.
- `POST /api/coupon-offers/{id}/download`: 포인트 차감·다운로드, 손님 JWT·`requestId` 필요.
- `GET /api/coupons/me`: 본인 쿠폰, JWT 필요.
- `POST /api/coupons/{id}/use`: 본인 쿠폰 사용 기록, 손님 JWT 필요.

발행 요청은 `stage` 1~3, `benefit`, `cost`, `useDays`, `timeRanges`, `endDate`입니다. 요일은 월요일 1~일요일 7, 시간은 `HH:mm-HH:mm`입니다. 앱 기기 모델은 일요일 0~토요일 6과 요일별 시간 구간을 사용하므로 연결 시 변환이 필요합니다.

서버 쿠폰은 다운로드 후 72시간 유효하며 사용 시 요일·시간을 검사합니다. `requestId`는 영문·숫자·`_`·`-`로 된 8~80자이고 동일 다운로드 재시도에는 같은 값을 사용합니다.

### 외부 검색·푸시 기기

- `GET /api/external/naver/places?query=...`: 네이버 지역 검색, JWT·서버 API 키 필요.
- `POST /api/push/devices`: `expoPushToken` 등록, JWT 필요.
- `DELETE /api/push/devices`: 본인 토큰 등록 해제, JWT 필요.

## 개발 데이터와 확인 명령

### 선택적 개발 시드

`local` 프로필과 `bapjul.dev-seed.enabled=true`를 **둘 다** 지정하면 개발 시드가 실행됩니다. 기본 실행에는 자동 생성되지 않습니다. 백엔드 디렉터리에서 DB·JWT 변수를 설정한 뒤 실행합니다.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local --bapjul.dev-seed.enabled=true"
```

사용자 7명, 식당 8개, 제보 114건, 할인 프로모션 6개를 생성합니다. 대표 계정은 손님 `customer1@example.test`, 점주 `owner1@example.test`, 비밀번호 `Demo1234!`입니다. 개발 시드를 실행했을 때만 생성됩니다.

`dev_seed_manifest`로 생성 행을 추적하고 재실행 시 자신이 생성한 시간 민감 데이터를 갱신합니다. `prod`·`production`에서는 실행을 거부합니다. 시드 식당의 GPS 좌표는 별도 등록합니다.

### 저장소에 포함된 확인 명령

백엔드 디렉터리:

```powershell
.\gradlew.bat test bootJar
```

프론트 디렉터리:

```powershell
pnpm run typecheck
pnpm run check:deps
pnpm run export:android
$testFiles = Get-ChildItem -Path src -Recurse -Filter *.test.cjs | ForEach-Object { $_.FullName }
node --test $testFiles
```

백엔드 테스트는 체류·추천 API·식당 관리·제보 내역·쿠폰 시간·포인트 모델을 다룹니다. 프론트 테스트는 검색·영업시간·제보 가능 조건·폼·저장·프로필·쿠폰·포인트·통계 응답을 다룹니다. CI는 push·PR에서 Java 17 환경의 `backend/` Gradle 빌드를 실행합니다.

저장소 루트의 합성 체류 요청 도구:

```powershell
.\scripts\demo-request.ps1 -BaseUrl "http://localhost:8080"
```

합성 5분 관측을 전송하며 결과는 등록된 식당 좌표에 따라 달라집니다. `scripts/verify-dev-seed.ps1`은 시드 인증·혼잡도·차트·프로모션 응답을 확인합니다.

## 추가 문서

- [모바일 앱](frontend/README.md)
- [프론트·서버 연결](frontend/docs/BACKEND_INTEGRATION.md)
- [서버 연동 요구사항 기록](frontend/docs/BACKEND_REQUIREMENTS.md)
- [점주 UI](frontend/docs/OWNER_UI.md)
- [통합 작업 기록](INTEGRATION.md)
- [위치 추천 통합 참고](docs/INTEGRATION.md)
- [개발 시드](docs/DEV_FRONTEND_SEED.md)
- [기존 검증 기록](docs/VERIFICATION.md)

추가 문서는 작업 시점의 기록을 포함합니다. 현재 통합 코드의 실행 설정과 기능 연결 범위는 이 README를 기준으로 확인합니다.
