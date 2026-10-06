package bapjul.location.android;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Looper;
import android.os.SystemClock;
import bapjul.stay.GeoSample;
import bapjul.stay.StayTracker;
import bapjul.stay.StayWindow;
import com.google.android.gms.location.*;
import java.util.Optional;

/** Android 앱에 넣는 어댑터. Java 서버의 src/main/java에는 넣지 않는다. API 26+ 예제. */
public final class AndroidStayWatcher {
    public interface Listener {
        void onStayDetected(StayWindow window, long capturedAtEpochMillis);
        void onError(Exception error);
    }
    private final Context context;
    private final FusedLocationProviderClient locations;
    private final StayTracker tracker = new StayTracker();
    private final Listener listener;
    private boolean active;

    public AndroidStayWatcher(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.locations = LocationServices.getFusedLocationProviderClient(this.context);
        this.listener = listener;
    }

    private final LocationCallback callback = new LocationCallback() {
        @Override public void onLocationResult(LocationResult result) {
            if (!active) return;
            for (Location location : result.getLocations()) {
                if (!location.hasAccuracy()) { tracker.reset(); continue; }
                try {
                    GeoSample sample = new GeoSample(location.getLatitude(), location.getLongitude(),
                        location.getAccuracy(), location.getElapsedRealtimeNanos() / 1_000_000L);
                    Optional<StayWindow> event = tracker.observe(sample, SystemClock.elapsedRealtime());
                    if (event.isPresent()) {
                        // 서버로 보낼 UTC 시각도 마지막 위치의 측정 시각을 사용한다.
                        listener.onStayDetected(event.get(), location.getTime());
                    }
                } catch (IllegalArgumentException ex) {
                    tracker.reset();
                    listener.onError(ex);
                }
            }
        }
    };

    /** 위치 권한을 받은 후, 보이는 Activity 또는 실행 중인 location foreground service에서 호출. */
    public void start() {
        if (active) return;
        if (context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            listener.onError(new SecurityException("정확한 위치 권한이 필요합니다."));
            return;
        }
        tracker.reset();
        active = true;
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15_000L)
            .setMinUpdateIntervalMillis(10_000L)
            .setMaxUpdateDelayMillis(0L)
            .setWaitForAccurateLocation(true)
            .build();
        try {
            locations.requestLocationUpdates(request, callback, Looper.getMainLooper())
                .addOnFailureListener(error -> { active = false; tracker.reset(); listener.onError(error); });
        } catch (SecurityException error) {
            active = false;
            tracker.reset();
            listener.onError(error);
        }
    }

    public void stop() {
        active = false;
        locations.removeLocationUpdates(callback);
        tracker.reset();
    }

    /** 사용자가 재시도를 선택했을 때 새 5분 관측을 시작한다. */
    public void restartObservation() { tracker.reset(); }
}
