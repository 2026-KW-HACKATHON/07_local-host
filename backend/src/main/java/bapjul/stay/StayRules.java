package bapjul.stay;

/** 20m는 체류 판정 범위이며, 서버의 식당 검색 반경 50m와 다른 값이다. */
public final class StayRules {
    public static final long REQUIRED_STAY_MILLIS = 300_000L;
    public static final long MAX_SAMPLE_GAP_MILLIS = 60_000L;
    public static final long MAX_LOCAL_SAMPLE_AGE_MILLIS = 30_000L;
    public static final int MAX_SAMPLES = 128;
    public static final double NUMERIC_EPSILON_METERS = 0.000001;
    public static final StayRules DEFAULT = new StayRules(20.0, 20.0);
    private final double stayRadiusMeters;
    private final double maxAccuracyMeters;

    public StayRules(double stayRadiusMeters, double maxAccuracyMeters) {
        if (!Double.isFinite(stayRadiusMeters) || stayRadiusMeters <= 0
                || !Double.isFinite(maxAccuracyMeters) || maxAccuracyMeters <= 0) {
            throw new IllegalArgumentException("체류 반경과 정확도 기준은 유한한 양수여야 합니다.");
        }
        this.stayRadiusMeters = stayRadiusMeters;
        this.maxAccuracyMeters = maxAccuracyMeters;
    }
    public double getStayRadiusMeters() { return stayRadiusMeters; }
    public double getMaxAccuracyMeters() { return maxAccuracyMeters; }
}
