package bapjul.crowd.service;

import bapjul.crowd.domain.CrowdLevel;
import bapjul.crowd.domain.CrowdSnapshot;
import bapjul.crowd.dto.CrowdChartPoint;
import bapjul.crowd.dto.CrowdChartResponse;
import bapjul.crowd.dto.CrowdReportResponse;
import bapjul.crowd.dto.CrowdStatusResponse;
import bapjul.crowd.dto.CrowdStatusUpdateRequest;
import bapjul.crowd.exception.InvalidCrowdReportException;
import bapjul.crowd.repository.CrowdSnapshotRepository;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.exception.RestaurantNotFoundException;
import bapjul.restaurant.repository.RestaurantRepository;
import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CrowdService {

    private static final int RECENT_MINUTES = 30;

    private final CrowdSnapshotRepository repository;
    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;

    public CrowdService(
            CrowdSnapshotRepository repository,
            RestaurantRepository restaurantRepository,
            UserRepository userRepository
    ) {
        this.repository = repository;
        this.restaurantRepository = restaurantRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CrowdReportResponse saveStatus(
            Long restaurantId,
            CrowdStatusUpdateRequest request,
            String reporterEmail
    ) {

        if (request.level() == CrowdLevel.UNKNOWN) {
            throw new InvalidCrowdReportException(
                    "UNKNOWN 상태는 직접 제보할 수 없습니다."
            );
        }

        Restaurant restaurant =
                restaurantRepository.findById(restaurantId)
                        .orElseThrow(
                                () -> new RestaurantNotFoundException(
                                        "식당을 찾을 수 없습니다."
                                )
                        );

        User reporter =
                userRepository.findByEmail(reporterEmail)
                        .orElseThrow(
                                () -> new InvalidCrowdReportException(
                                        "사용자 정보를 찾을 수 없습니다."
                                )
                        );

        CrowdSnapshot snapshot =
                CrowdSnapshot.create(
                        restaurant,
                        reporter,
                        request.level()
                );

        CrowdSnapshot saved =
                repository.save(snapshot);

        return toReportResponse(saved);
    }

    public CrowdStatusResponse getCurrentStatus(
            Long restaurantId
    ) {

        if (!restaurantRepository.existsById(restaurantId)) {
            throw new RestaurantNotFoundException(
                    "식당을 찾을 수 없습니다."
            );
        }

        LocalDateTime end = LocalDateTime.now();

        LocalDateTime start =
                end.minusMinutes(RECENT_MINUTES);

        List<CrowdSnapshot> snapshots =
                repository
                        .findByRestaurant_IdAndObservedAtBetweenOrderByObservedAtAsc(
                                restaurantId,
                                start,
                                end
                        );

        if (snapshots.isEmpty()) {

            CrowdLevel unknown =
                    CrowdLevel.UNKNOWN;

            return new CrowdStatusResponse(
                    restaurantId,
                    unknown,
                    unknown.getLabel(),
                    unknown.getScore(),
                    0,
                    null
            );
        }

        CrowdLevel representative =
                findRepresentativeLevel(snapshots);

        LocalDateTime latestTime =
                snapshots.get(
                        snapshots.size() - 1
                ).getObservedAt();

        return new CrowdStatusResponse(
                restaurantId,
                representative,
                representative.getLabel(),
                representative.getScore(),
                snapshots.size(),
                latestTime
        );
    }

    public CrowdChartResponse getChart(
            Long restaurantId,
            int hours
    ) {

        if (!restaurantRepository.existsById(restaurantId)) {
            throw new RestaurantNotFoundException(
                    "식당을 찾을 수 없습니다."
            );
        }

        LocalDateTime end =
                LocalDateTime.now();

        LocalDateTime start =
                end.minusHours(hours);

        List<CrowdSnapshot> snapshots =
                repository
                        .findByRestaurant_IdAndObservedAtBetweenOrderByObservedAtAsc(
                                restaurantId,
                                start,
                                end
                        );

        Map<LocalDateTime, List<CrowdSnapshot>>
                groupedByHour =
                snapshots.stream()
                        .collect(
                                Collectors.groupingBy(
                                        snapshot ->
                                                snapshot
                                                        .getObservedAt()
                                                        .truncatedTo(
                                                                ChronoUnit.HOURS
                                                        ),
                                        TreeMap::new,
                                        Collectors.toList()
                                )
                        );

        List<CrowdChartPoint> chartPoints =
                groupedByHour.entrySet()
                        .stream()
                        .map(entry -> {

                            CrowdLevel representative =
                                    findRepresentativeLevel(
                                            entry.getValue()
                                    );

                            return new CrowdChartPoint(
                                    entry.getKey(),
                                    representative,
                                    representative.getLabel(),
                                    representative.getScore()
                            );
                        })
                        .toList();

        return new CrowdChartResponse(
                restaurantId,
                start,
                end,
                chartPoints
        );
    }

    private CrowdLevel findRepresentativeLevel(
            List<CrowdSnapshot> snapshots
    ) {

        Map<CrowdLevel, Long> countMap =
                snapshots.stream()
                        .collect(
                                Collectors.groupingBy(
                                        CrowdSnapshot::getLevel,
                                        () ->
                                                new EnumMap<>(
                                                        CrowdLevel.class
                                                ),
                                        Collectors.counting()
                                )
                        );

        long maxCount =
                countMap.values()
                        .stream()
                        .max(Long::compareTo)
                        .orElse(0L);

        return snapshots.stream()
                .sorted(
                        Comparator.comparing(
                                CrowdSnapshot::getObservedAt
                        ).reversed()
                )
                .map(CrowdSnapshot::getLevel)
                .filter(
                        level ->
                                countMap.getOrDefault(
                                        level,
                                        0L
                                ) == maxCount
                )
                .findFirst()
                .orElseThrow();
    }

    private CrowdReportResponse toReportResponse(
            CrowdSnapshot snapshot
    ) {

        CrowdLevel level =
                snapshot.getLevel();

        return new CrowdReportResponse(
                snapshot.getId(),
                snapshot.getRestaurant().getId(),
                snapshot.getReporter().getId(),
                level,
                level.getLabel(),
                snapshot.getObservedAt()
        );
    }
}