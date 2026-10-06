package bapjul.stay;

/** 한 번의 위치 관측. 시간은 Android Location.getElapsedRealtimeNanos()/1_000_000L. */
public final class GeoSample {
    private final double latitude;
    private final double longitude;
    private final double accuracyMeters;
    private final long elapsedRealtimeMillis;

    public GeoSample(double latitude, double longitude, double accuracyMeters, long elapsedRealtimeMillis) {
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180
                || !Double.isFinite(accuracyMeters) || accuracyMeters < 0 || elapsedRealtimeMillis < 0) {
            throw new IllegalArgumentException("잘못된 위치 관측값입니다.");
        }
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracyMeters = accuracyMeters;
        this.elapsedRealtimeMillis = elapsedRealtimeMillis;
    }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public double getAccuracyMeters() { return accuracyMeters; }
    public long getElapsedRealtimeMillis() { return elapsedRealtimeMillis; }
}
