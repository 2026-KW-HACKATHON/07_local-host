package bapjul.location.service;

import bapjul.location.api.NearbyResponse;
import bapjul.location.api.StayRequest;
import bapjul.location.catalog.Restaurant;
import bapjul.location.catalog.RestaurantCatalog;
import bapjul.stay.*;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class NearbyRestaurantService {
    public static final double SEARCH_RADIUS_METERS = 20.0;
    public static final int MAX_RESULTS = 3;
    private final RestaurantCatalog catalog;
    private final Clock clock;
    private final StayWindowValidator validator = new StayWindowValidator(StayRules.DEFAULT);

    public NearbyRestaurantService(RestaurantCatalog catalog, Clock clock) {
        this.catalog = catalog;
        this.clock = clock;
    }

    public NearbyResponse recommend(StayRequest request) {
        Instant now = clock.instant();
        // capturedAt은 마지막 GPS 관측의 UTC 시각이다. 요청 전송 시각으로 바꾸지 않는다.
        if (request.capturedAt().isBefore(now.minusSeconds(120)) || request.capturedAt().isAfter(now.plusSeconds(30))) {
            throw new IllegalArgumentException("마지막 위치가 오래되었거나 휴대폰 시각이 맞지 않습니다.");
        }
        StayWindow window = validator.validate(request.samples().stream().map(StayRequest.Sample::toGeoSample).toList());
        GeoSample position = window.getLatest();
        List<NearbyResponse.Option> options = catalog.findActiveRestaurants().stream()
            .map(r -> new Candidate(r, GeoDistance.meters(position.getLatitude(), position.getLongitude(), r.latitude(), r.longitude())))
            .filter(c -> Double.isFinite(c.distance()) && c.distance() <= SEARCH_RADIUS_METERS + StayRules.NUMERIC_EPSILON_METERS)
            .sorted(Comparator.comparingDouble(Candidate::distance).thenComparing(c -> c.restaurant().id()))
            .limit(MAX_RESULTS)
            .map(c -> new NearbyResponse.Option(c.restaurant().id(), c.restaurant().name(), c.restaurant().address(),
                c.restaurant().floor(), c.restaurant().latitude(), c.restaurant().longitude(), Math.round(c.distance() * 10.0) / 10.0))
            .toList();
        return new NearbyResponse(SEARCH_RADIUS_METERS, MAX_RESULTS, options.size(), window.getDurationMillis(), options);
    }
    private record Candidate(Restaurant restaurant, double distance) {}
}
