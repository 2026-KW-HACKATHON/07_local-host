package bapjul.location.api;

import java.util.List;

public record NearbyResponse(double radiusMeters, int limit, int count, long dwellDurationMillis, List<Option> restaurants) {
    public record Option(String id, String name, String address, String floor, double latitude, double longitude, double distanceMeters) {}
}
