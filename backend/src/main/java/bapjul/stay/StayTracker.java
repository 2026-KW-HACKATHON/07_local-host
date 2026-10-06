package bapjul.stay;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 휴대폰 한 대의 위치 콜백에서 사용하는 객체. 사용자 간 공유하거나 서버 singleton으로 쓰지 않는다.
 * 고정된 첫 관측점을 기준으로 비교하여 조금씩 이동하는 사용자를 계속 정지 중으로 보지 않는다.
 */
public final class StayTracker {
    private final StayRules rules;
    private final List<GeoSample> samples = new ArrayList<>();
    private GeoSample anchor;
    private long lastElapsed;
    private boolean emitted;

    public StayTracker() { this(StayRules.DEFAULT); }
    public StayTracker(StayRules rules) { this.rules = rules; }

    public synchronized Optional<StayWindow> observe(GeoSample sample, long nowElapsedRealtimeMillis) {
        if (sample == null || nowElapsedRealtimeMillis < sample.getElapsedRealtimeMillis()
                || nowElapsedRealtimeMillis - sample.getElapsedRealtimeMillis() > StayRules.MAX_LOCAL_SAMPLE_AGE_MILLIS
                || sample.getAccuracyMeters() > rules.getMaxAccuracyMeters()) {
            reset();
            return Optional.empty();
        }
        if (anchor != null && sample.getElapsedRealtimeMillis() <= lastElapsed) {
            return Optional.empty(); // 중복/역순 콜백으로 시간을 늘리지 않는다.
        }
        if (anchor == null
                || sample.getElapsedRealtimeMillis() - lastElapsed > StayRules.MAX_SAMPLE_GAP_MILLIS
                || GeoDistance.meters(anchor, sample) > rules.getStayRadiusMeters() + StayRules.NUMERIC_EPSILON_METERS) {
            startAt(sample);
            return Optional.empty();
        }
        lastElapsed = sample.getElapsedRealtimeMillis();
        if (emitted) return Optional.empty(); // 한 체류 구간당 한 번만 추천 요청
        if (samples.size() >= StayRules.MAX_SAMPLES) {
            startAt(sample);
            return Optional.empty();
        }
        samples.add(sample);
        if (lastElapsed - anchor.getElapsedRealtimeMillis() >= StayRules.REQUIRED_STAY_MILLIS) {
            StayWindow window = new StayWindowValidator(rules).validate(samples);
            emitted = true;
            return Optional.of(window);
        }
        return Optional.empty();
    }

    private void startAt(GeoSample sample) {
        reset();
        anchor = sample;
        lastElapsed = sample.getElapsedRealtimeMillis();
        samples.add(sample);
    }

    /** 앱 추적 중단/권한 취소/재시작 시 호출. 이전 체류 시간은 승계하지 않는다. */
    public synchronized void reset() {
        anchor = null;
        samples.clear();
        lastElapsed = 0L;
        emitted = false;
    }
}
