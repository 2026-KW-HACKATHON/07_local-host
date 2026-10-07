package bapjul.stay;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** 한 체류 구간의 불변 복사본. DB에 저장하기 위한 이동 이력 객체가 아니다. */
public final class StayWindow {
    private final List<GeoSample> samples;
    StayWindow(List<GeoSample> samples) {
        this.samples = Collections.unmodifiableList(new ArrayList<>(samples));
    }
    public List<GeoSample> getSamples() { return samples; }
    public GeoSample getLatest() { return samples.get(samples.size() - 1); }
    public long getDurationMillis() {
        return getLatest().getElapsedRealtimeMillis() - samples.get(0).getElapsedRealtimeMillis();
    }
}
