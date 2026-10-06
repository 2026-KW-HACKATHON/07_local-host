package bapjul.stay;

import java.util.List;

/** 서버에서 앱이 전송한 측정 구간을 재검사한다. 좌표의 진위까지 인증하지는 않는다. */
public final class StayWindowValidator {
    private final StayRules rules;
    public StayWindowValidator(StayRules rules) { this.rules = rules; }

    public StayWindow validate(List<GeoSample> samples) {
        if (samples == null || samples.size() < 2 || samples.size() > StayRules.MAX_SAMPLES) {
            throw new IllegalArgumentException("위치 관측값은 2~128개여야 합니다.");
        }
        GeoSample anchor = samples.get(0);
        if (anchor == null) throw new IllegalArgumentException("위치 관측값이 누락되었습니다.");
        GeoSample previous = null;
        for (GeoSample sample : samples) {
            if (sample == null || sample.getAccuracyMeters() > rules.getMaxAccuracyMeters()) {
                throw new IllegalArgumentException("위치 정확도가 체류 확인 기준을 충족하지 못합니다.");
            }
            if (GeoDistance.meters(anchor, sample) > rules.getStayRadiusMeters() + StayRules.NUMERIC_EPSILON_METERS) {
                throw new IllegalArgumentException("체류 구간 중 처음 위치의 허용 반경을 벗어났습니다.");
            }
            if (previous != null) {
                long gap = sample.getElapsedRealtimeMillis() - previous.getElapsedRealtimeMillis();
                if (gap <= 0 || gap > StayRules.MAX_SAMPLE_GAP_MILLIS) {
                    throw new IllegalArgumentException("관측 시각이 중복/역전되었거나 60초 넘게 끊겼습니다.");
                }
            }
            previous = sample;
        }
        StayWindow window = new StayWindow(samples);
        if (window.getDurationMillis() < StayRules.REQUIRED_STAY_MILLIS) {
            throw new IllegalArgumentException("같은 곳에서 5분 이상 관측되어야 합니다.");
        }
        return window;
    }
}
