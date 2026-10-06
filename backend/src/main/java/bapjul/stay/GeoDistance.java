package bapjul.stay;

import net.sf.geographiclib.Geodesic;

public final class GeoDistance {
    private GeoDistance() {}
    public static double meters(double lat1, double lon1, double lat2, double lon2) {
        return Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2).s12;
    }
    public static double meters(GeoSample a, GeoSample b) {
        return meters(a.getLatitude(), a.getLongitude(), b.getLatitude(), b.getLongitude());
    }
}
