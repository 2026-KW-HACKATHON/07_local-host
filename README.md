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
