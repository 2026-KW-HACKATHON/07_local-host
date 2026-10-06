# 실행 확인 결과

확인일: 2026-10-06. JDK 17.0.20.1, Maven 3.9.11, Spring Boot 3.5.16.

요청한 `07_local-host/backend` 구조로 재배치한 뒤 다시 검증했습니다. `backend`를 작업 폴더로 Maven `verify`를 실행했고, `bapjul.BapjulApplication`을 진입점으로 하는 새 JAR와 `application-demo.properties` 설정을 사용했습니다.

| 검증 | 결과 |
| --- | --- |
| Maven `verify` | 성공, 실행 가능한 Spring Boot JAR 생성 |
| Java 패키지와 디렉터리 대응 | 모든 main/test Java 파일 일치 |
| 체류 공통 코어 | 14개 통과 |
| Spring Boot + H2 API | 17개 통과 |
| 실제 JAR의 `/health` 호출 | HTTP 200 |
| 실제 JAR에 5분 체류 관측 전송 | HTTP 200, 12m·24m·38m 3곳 반환 |
| 4분 59초 관측 전송 | HTTP 400 |
| 중간 관측점 이탈 | HTTP 400 |
| 제공한 `DemoRequest.java`로 호출 | HTTP 200 |
| Git 소스 공백/충돌 마커 검사 | `git diff --cached --check` 통과 |

자동 테스트는 체류 시작/초기화, 300초 경계, 누적 이동, 오래된 위치, 관측 공백, 정확도 부족, 중복/역순 시각, 50m 경계, 거리순/동률 정렬, 0~2개 결과, 입력 오류, 조회 반경 변경 시도를 다룹니다. 실제 5분을 기다리지 않고 관측값의 단조 증가 시각을 바꿔 검사합니다.

검증하지 않은 범위: 밥줄 원본 저장소·실제 운영 DB·기존 로그인 연동, Android 앱 빌드 및 실제 기기의 GPS/화면 꺼짐 동작, GitHub 원격 CI 실행. 이들은 원본 프로젝트에 연결한 다음 확인해야 합니다. Windows PowerShell 스크립트는 포함했지만 Windows 환경에서 실행하지 않았습니다.
