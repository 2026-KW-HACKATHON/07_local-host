# 팀의 07_local-host 프로젝트에 연결

사진의 폴더 구조에 맞춰 서버 코드를 `backend/src/main/java/bapjul`에 모았습니다. 실행 클래스는 `bapjul.BapjulApplication`, 설정은 `application.properties`입니다. 프로젝트는 Spring Boot 3 / Java 17 기준입니다. 원본 서버·앱 코드를 받지 못했으므로 기존 ORM, 인증, Android 생명주기와의 실제 통합은 아직 확인하지 않았습니다. 서버가 Spring Boot 2 또는 Java 11이라면 `jakarta.validation`과 Java record 등도 기존 환경에 맞게 변경해야 합니다.

## 1. 백엔드

기존 저장소의 기능 브랜치에서 작업하세요. 기존 `pom.xml`, 실행 클래스, 인증 설정, DB 설정을 통째로 덮어쓰지 마세요.

1. 새 기능 폴더 `backend/src/main/java/bapjul/stay/`와 `backend/src/main/java/bapjul/location/`을 기존 서버의 동일 경로에 넣습니다. `stay-core` 별도 모듈은 없습니다.
2. 기존 빌드에 `net.sf.geographiclib:GeographicLib-Java:2.1`, Spring Web, Validation을 추가합니다. JDBC 예제를 그대로 사용하면 Spring JDBC와 사용할 DB 드라이버도 필요합니다. 사진에는 Maven/Gradle 정보가 없으므로 이미 팀의 `build.gradle`이 있다면 그 파일에 의존성을 추가하고 새 Maven 설정으로 바꾸지 마세요.
3. `application.properties`의 필요한 항목만 기존 설정에 합칩니다. 기존 식당 저장소를 연결할 때는 `JdbcRestaurantCatalog`와 독립 실행용 `schema.sql`을 제외합니다. H2 및 demo 설정은 독립 테스트에 사용하세요.
4. `RestaurantCatalog`를 구현하는 Bean 하나를 만듭니다. 기존 식당 엔티티의 ID·이름·주소·층·위도·경도를 `Restaurant` record로 변환하세요. 운영 가능한 식당만 반환합니다. DTO용 `Restaurant`은 JPA 엔티티가 아닙니다.
5. `Clock.systemUTC()` Bean을 등록합니다. 기존 Clock Bean이 있으면 재사용하고 중복 등록하지 마세요.
6. 기존 `bapjul.BapjulApplication`이 있으면 그대로 사용합니다. 이 ZIP의 실행 클래스에는 Clock Bean 외에 특별한 설정이 없으므로 필요한 Bean만 기존 클래스 또는 설정 클래스에 합칩니다. 새 기능도 `bapjul` 하위에 있어 기본 component scan에 포함됩니다.
7. 기존 인증 필터에 새 POST 경로를 연결하세요. `StayApiClient`의 토큰은 기존 로그인 토큰을 전달할 자리를 제공할 뿐이며, 이 독립 실행 서버는 토큰을 검증하지 않습니다.

좌표의 순서는 항상 `latitude`(위도), `longitude`(경도)입니다. 식당 중심점 또는 출입구 좌표 중 하나를 서비스 전체에서 일관되게 사용하세요.

이 API는 조회입니다. 나중에 혼잡도 제보를 저장할 때는 서버에서 제보 시점의 위치·식당 거리와 로그인 사용자를 다시 확인하세요. 추천 목록에 한 번 포함되었다는 사실을 영구적인 제보 권한으로 취급하지 않습니다.

## 2. Android Java 앱

`android-integration/AndroidStayWatcher.java`, `StayApiClient.java`를 Android 앱의 Java 소스 폴더에 복사하고 패키지를 맞춥니다. 이 두 파일은 Android API 26 이상을 기준으로 작성했습니다. 앱 Gradle에 `google()` / `mavenCentral()` 저장소가 있어야 합니다.

공통 체류 코어를 연결하는 가장 단순한 방법은 `backend/src/main/java/bapjul/stay/`도 앱의 Java 소스 폴더에 복사하는 것입니다. 이 패키지는 Android에서 사용할 수 있는 일반 Java 소스입니다. 앱과 서버의 정책이 달라지지 않게 함께 관리하세요. 별도 공통 모듈이나 내부 Maven 저장소로 관리해도 됩니다.

```groovy
dependencies {
    implementation 'com.google.android.gms:play-services-location:21.4.0'
    implementation 'net.sf.geographiclib:GeographicLib-Java:2.1'
}
```

이번 구조에서는 별도 `stay-core.jar`를 만들지 않습니다. Android 앱에는 위의 일반 Java 소스와 두 어댑터 예제를 연결하세요. 서버의 실행 가능한 Spring Boot JAR는 Android 의존성으로 넣지 않습니다.

Manifest에는 인터넷 권한과 위치 권한을 선언합니다. `ACCESS_COARSE_LOCATION`과 `ACCESS_FINE_LOCATION`은 앱에서 런타임 권한을 요청하고 승인 여부를 확인해야 합니다.

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

Activity 또는 기존 foreground service에서 연결하는 예시입니다. `showRestaurants`, `showError`, `currentAccessToken`은 밥줄 앱에 있는 UI/인증 코드로 교체합니다. `BASE_URL`은 실제 HTTPS 서버 주소를 사용하세요.

```java
private StayApiClient stayApi;
private AndroidStayWatcher stayWatcher;

// 메인 스레드에서, 정확한 위치 권한이 승인된 다음 호출
private void startStayObservation() {
    stayApi = new StayApiClient(BASE_URL);
    stayWatcher = new AndroidStayWatcher(this, new AndroidStayWatcher.Listener() {
        @Override
        public void onStayDetected(StayWindow window, long capturedAtEpochMillis) {
            stayApi.fetch(window, capturedAtEpochMillis, currentAccessToken(),
                new StayApiClient.Callback() {
                    @Override public void onSuccess(JSONObject response) {
                        showRestaurants(response.optJSONArray("restaurants"));
                    }
                    @Override public void onError(Exception error) {
                        showError(error);
                    }
                });
        }
        @Override public void onError(Exception error) { showError(error); }
    });
    stayWatcher.start();
}

// 관측을 실제로 중단하는 생명주기 지점에서 호출
private void stopStayObservation() {
    if (stayWatcher != null) stayWatcher.stop();
    if (stayApi != null) stayApi.close();
}
```

필요한 import: `bapjul.stay.StayWindow`, `bapjul.location.android.AndroidStayWatcher`, `bapjul.location.android.StayApiClient`, `org.json.JSONObject`. UI 콜백은 메인 스레드로 전달됩니다. Activity의 화면 회전 시 객체를 중복 생성하지 않도록 기존 앱의 생명주기에 연결하세요.

통신 실패 시 같은 `window`를 잠시 보관했다가 재전송할 수 있습니다. 이 조회 API는 DB를 변경하지 않습니다. 단, 원래 `capturedAtEpochMillis`를 유지해야 하며 서버의 120초 유효 기간이 지나면 새 위치 관측이 필요합니다. 새 5분 체류를 시작하려면 `stayWatcher.restartObservation()`을 호출합니다.

## 3. 화면이 꺼진 동안

Activity만으로 추적하면 앱이 백그라운드로 갈 때 위치 콜백이 제한될 수 있습니다. 화면이 꺼져도 관측을 이어가려면 기존 앱에서 사용자에게 보이는 알림을 갖춘 `location` foreground service를 구현하고 그 안에서 `AndroidStayWatcher`를 사용하세요. 해당 서비스 구현·알림·권한 UI는 이 백엔드 모듈에 포함하지 않았습니다.

현행 Android 요구사항에 맞춰 `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, 서비스의 `android:foregroundServiceType="location"` 등을 설정하고, 필요한 위치 권한을 받은 뒤 보이는 화면에서 서비스를 시작하는 흐름에 연결합니다. 백그라운드에서 임의로 서비스를 시작할 수 있다고 가정하면 안 됩니다. [공식 foreground service 유형 안내](https://developer.android.com/develop/background-work/services/fgs/service-types#location)를 확인하세요.

휴대폰 전원 자체가 꺼졌거나 위치 권한이 취소된 상태에서는 이 기능이 관측을 이어갈 수 없습니다. GPS 오차가 크거나 콜백이 60초 넘게 끊기면 새 5분 구간을 시작합니다. 따라서 모든 기기에서 정확히 5분 정각에 추천된다고 보장하지 않습니다.

## 4. 실제 연동 확인

권한 승인 후 5분 체류, 체류 도중 20m 밖 이동, GPS 차단 후 복귀, 화면 꺼짐, 통신 재시도, 같은 건물의 여러 식당을 실제 기기에서 확인하세요. GPS의 정확도 값은 오차의 보장값이 아니므로 50m 경계는 실제 사용자 경험을 보고 조정할 대상입니다.

에뮬레이터에서 개발 PC는 보통 `10.0.2.2`로 접근합니다. 실제 폰의 `localhost`는 개발 PC가 아닙니다. 로컬 HTTP 허용은 개발 빌드 설정에서만 처리하고, 배포 서버는 HTTPS 주소를 사용하세요.

Google Play services 의존성은 [공식 설정 문서](https://developers.google.com/android/guides/setup)를 기준으로 지정했습니다.
