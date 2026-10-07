# 밥줄 손님 프론트 개발 시드

## 범위

이 시드는 손님 프론트 검증을 위한 개발 전용 데이터입니다. GPS 후보 데이터는 이번 요청에서 제외했습니다.

- 계정: 7개 (CUSTOMER 4, OWNER 3)
- 식당: 8개
- 혼잡도 제보: 114개
- 프로모션: 6개
- 기존 사용자/식당 데이터 삭제 또는 덮어쓰기 없음
- 시간 민감한 혼잡도/프로모션은 `dev_seed_manifest`에 기록된 **이 시드 소유 행만** 지우고 재생성
- `local` 프로필 + `bapjul.dev-seed.enabled=true`를 둘 다 만족할 때만 실행

## 실행

백엔드 폴더에서:

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local --bapjul.dev-seed.enabled=true"
```

JAR 실행이면:

```powershell
java -jar build/libs/bapjul-0.0.1-SNAPSHOT.jar `
  --spring.profiles.active=local `
  --bapjul.dev-seed.enabled=true
```

최근 30분 혼잡도는 시간이 지나면 만료됩니다. 같은 명령으로 서버를 다시 실행하면 기존 시드 사용자/식당은 유지하고 **시드가 만든 혼잡도 114개와 프로모션 6개만** 현재 서버 시각 기준으로 다시 만듭니다.

일반 실행에서는 시드 옵션을 빼세요.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

## 대표 로그인

| 이메일 | 비밀번호 | 닉네임 | 역할 |
|---|---|---|---|
| customer1@example.test | Demo1234! | 밥줄손님 | CUSTOMER |

모든 개발용 계정 비밀번호는 `Demo1234!`이며 실제 `PasswordEncoder`(BCrypt)로 저장됩니다.

## 전체 계정

| 이메일 | 닉네임 | 역할 |
|---|---|---|
| customer1@example.test | 밥줄손님 | CUSTOMER |
| customer2@example.test | 한끼탐험가 | CUSTOMER |
| customer3@example.test | 공강맛집러 | CUSTOMER |
| customer4@example.test | 점심메이트 | CUSTOMER |
| owner1@example.test | 광운점주 | OWNER |
| owner2@example.test | 월계점주 | OWNER |
| owner3@example.test | 동네점주 | OWNER |

## 식당과 예상 현재 혼잡도

| 식당 | 점주 | 예상 상태 | 비고 |
|---|---|---|---|
| 국밥집 | owner1 | AVAILABLE | `국밥` 검색, 활성 프로모션, 24시간 그래프 |
| 월계한상 | owner2 | AVAILABLE | 만료 프로모션, 24시간 그래프 |
| 오늘김밥 | owner3 | FEW_SEATS | 긴 주소, 활성 프로모션, 24시간 그래프 |
| 광운대앞든든한집밥그리고제육볶음 | owner1 | FEW_SEATS | 긴 이름, 예정 프로모션, 24시간 그래프 |
| 면 | owner2 | LONG_WAIT | 매우 짧은 이름, 활성 프로모션 |
| 매운닭갈비연구소 | owner3 | LONG_WAIT | disabled 프로모션 |
| 소담 | owner1 | UNKNOWN | 제보 0건 |
| 밤샘분식과따뜻한우동 | owner2 | UNKNOWN | 과거 제보 4건, 최근 30분 0건 |

상태가 있는 6개 식당은 실행 시점 기준 최근 14분 이내에 3개씩의 제보를 갖습니다. 목표 상태가 2표, 다른 상태가 1표이므로 현재 집계가 위 표대로 나옵니다.

## 24시간 그래프

앞의 4개 식당은 이전 23개 시간대에 한 건씩, 현재 시간대에 최근 제보를 넣어 총 24개 시간 버킷이 생기도록 구성했습니다. 이전 시간대 상태는 AVAILABLE → FEW_SEATS → LONG_WAIT 패턴을 순환시킵니다.

현재 백엔드 차트는 데이터가 있는 시간만 `groupingBy`해서 반환하므로 **제보가 없는 시간 버킷은 생략됩니다. `UNKNOWN` 버킷을 자동 생성하지 않습니다.**

## 프로모션 6개

| 식당 | 제목 | 상태 |
|---|---|---|
| 국밥집 | 점심 10% 할인 | 활성 |
| 오늘김밥 | 공강 타임 15% 할인 | 활성 |
| 면 | 면데이 20% 할인 | 활성 |
| 월계한상 | 어제 한정 12% 할인 | 만료 |
| 광운대앞든든한집밥그리고제육볶음 | 저녁 예정 18% 할인 | 예정 |
| 매운닭갈비연구소 | 비공개 테스트 25% 할인 | 기간 유효 + disabled |

손님용 `GET /api/restaurants/{id}/promotions`에는 활성 3개만 노출되어야 합니다.

## 검증

서버가 실행 중일 때 저장소 루트에서:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-dev-seed.ps1
```

스크립트는 다음을 확인합니다.

- 대표 손님 로그인과 `/api/auth/me` 닉네임
- 시드 식당 8개
- 식당별 AVAILABLE/FEW_SEATS/LONG_WAIT/UNKNOWN 상태
- `국밥` 이름 존재
- 4개 식당의 24시간 차트 24개 버킷 + 세 상태 패턴
- 손님 API에 노출되는 활성 프로모션 총 3개

## 프론트 서버 주소

- Android 에뮬레이터: `http://10.0.2.2:8080`
- iOS 시뮬레이터: `http://localhost:8080`
- PC에서 검증 스크립트: `http://localhost:8080`
- 실제 휴대폰: `EXPO_PUBLIC_API_BASE_URL=http://<개발PC-LAN-IP>:8080`

## 데이터만으로 확인 가능한 화면

- 로그인 성공 / 가입 닉네임 표시
- 식당 8개 표시
- 이름·주소 검색 및 `국밥` 검색
- AVAILABLE / FEW_SEATS / LONG_WAIT / UNKNOWN 네 상태 표시
- 여유순 정렬 (프론트 로컬 정렬)
- 활성 프로모션 식당만 필터
- 식당 상세 영업시간
- 현재 혼잡도와 최근 제보 수
- 여러 시간대 24시간 그래프
- 활성 프로모션 3개 노출 및 비활성/예정/만료 미노출

## 시드만으로 완료되지 않는 기능

현재 계약상 별도 API가 필요한 항목입니다.

- 식당별 개별 제보자 목록
- 재로그인 후에도 유지되는 내 전체 제보 내역
- 포인트 잔액/적립/차감
- 쿠폰 발급/보유/사용/만료
- 프로필 수정
- 이메일 인증번호 발송/검증
- Google/네이버 소셜 로그인

현재 `내 제보 보기`는 앱 실행 중 성공적으로 POST한 응답을 메모리에 쌓는 방식이므로, DB 시드에 과거 제보를 넣어도 자동으로 표시되지 않습니다.

## GPS

이번 요청에 따라 GPS 후보 좌표/추천 데이터와 실제 5분 체류 검증은 구현·검증 범위에서 제외했습니다.
