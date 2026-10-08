package bapjul.owner;

import bapjul.crowd.domain.CrowdLevel;
import bapjul.crowd.domain.CrowdSnapshot;
import bapjul.crowd.repository.CrowdSnapshotRepository;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.repository.RestaurantRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/** Weekday + hour breakdown of actual stored crowd reports, excluding today. */
@RestController
@Validated
@RequestMapping("/api/restaurants/{restaurantId}/owner")
public class OwnerWeekdayHourlyController {
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private final RestaurantRepository restaurants;
    private final CrowdSnapshotRepository snapshots;

    public OwnerWeekdayHourlyController(RestaurantRepository restaurants,
                                        CrowdSnapshotRepository snapshots) {
        this.restaurants = restaurants;
        this.snapshots = snapshots;
    }

    public record HourCount(int hour, long available, long fewSeats,
                            long longWait, long unknown, long total) {}
    // weekday: ISO-8601, Monday = 1 ... Sunday = 7
    public record WeekdayCount(int weekday, long total, List<HourCount> hours) {}
    public record AnalyticsResponse(Long restaurantId, int days, LocalDate from,
                                    LocalDate through, long total,
                                    List<WeekdayCount> weekdays) {}

    @GetMapping("/analytics/weekday-hourly")
    public AnalyticsResponse getWeekdayHourly(@PathVariable Long restaurantId,
                                             Authentication authentication,
                                             @RequestParam(defaultValue = "28")
                                             @Min(1) @Max(28) int days) {
        Restaurant restaurant = restaurants.findById(restaurantId)
                .orElseThrow(() -> new IllegalArgumentException("식당을 찾을 수 없습니다."));
        if (authentication == null || !restaurant.getOwner().getEmail().equals(authentication.getName())) {
            throw new AccessDeniedException("본인 식당만 조회할 수 있습니다.");
        }

        // The demo SQL writes the completed 28 days (yesterday back to 28 days ago).
        LocalDate today = LocalDate.now(KOREA);
        LocalDate from = today.minusDays(days);
        LocalDateTime fromInclusive = from.atStartOfDay();
        LocalDateTime toExclusive = today.atStartOfDay();
        long[][][] counts = new long[8][24][4]; // weekday 1..7; 0..23 hour; level

        for (CrowdSnapshot s : snapshots
                .findByRestaurant_IdAndObservedAtGreaterThanEqualOrderByObservedAtDescIdDesc(
                        restaurantId, fromInclusive)) {
            LocalDateTime observedAt = s.getObservedAt();
            if (observedAt == null || observedAt.isBefore(fromInclusive)
                    || !observedAt.isBefore(toExclusive)) {
                continue;
            }
            int weekday = observedAt.getDayOfWeek().getValue();
            int hour = observedAt.getHour();
            CrowdLevel level = s.getLevel();
            int category = switch (level) {
                case AVAILABLE -> 0;
                case FEW_SEATS -> 1;
                case LONG_WAIT -> 2;
                case UNKNOWN -> 3;
            };
            counts[weekday][hour][category]++;
        }

        List<WeekdayCount> weekdays = new ArrayList<>();
        long grandTotal = 0;
        for (int weekday = 1; weekday <= 7; weekday++) {
            List<HourCount> hours = new ArrayList<>();
            long weekdayTotal = 0;
            for (int hour = 0; hour < 24; hour++) {
                long[] c = counts[weekday][hour];
                long total = c[0] + c[1] + c[2] + c[3];
                hours.add(new HourCount(hour, c[0], c[1], c[2], c[3], total));
                weekdayTotal += total;
            }
            weekdays.add(new WeekdayCount(weekday, weekdayTotal, hours));
            grandTotal += weekdayTotal;
        }
        return new AnalyticsResponse(restaurantId, days, from,
                today.minusDays(1), grandTotal, weekdays);
    }
}
