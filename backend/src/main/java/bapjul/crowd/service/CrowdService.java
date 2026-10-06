package bapjul.crowd.service;

import bapjul.crowd.domain.CrowdLevel;
import bapjul.crowd.domain.CrowdSnapshot;
import bapjul.crowd.dto.CrowdChartPoint;
import bapjul.crowd.dto.CrowdChartResponse;
import bapjul.crowd.dto.CrowdStatusResponse;
import bapjul.crowd.dto.CrowdStatusUpdateRequest;
import bapjul.crowd.exception.CrowdDataNotFoundException;
import bapjul.crowd.repository.CrowdSnapshotRepository;

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

    private final CrowdSnapshotRepository repository;

    public CrowdService(
            CrowdSnapshotRepository repository
    ) {
        this.repository = repository;
    }

    /*
     * 혼잡도 제보 저장
     */
    @Transactional
    public CrowdStatusResponse saveStatus(
            Long restaurantId,
            CrowdStatusUpdateRequest request
    ) {

        CrowdSnapshot snapshot =
                CrowdSnapshot.create(
                        restaurantId,
                        request.level()
                );

        CrowdSnapshot saved =
                repository.save(snapshot);

        return toStatusResponse(saved);
    }

    /*
     * 가장 최근 혼잡도 조회
     */
    public CrowdStatusResponse getCurrentStatus(
            Long restaurantId
    ) {

        CrowdSnapshot snapshot =
                repository
                        .findTopByRestaurantIdOrderByObservedAtDesc(
                                restaurantId
                        )
                        .orElseThrow(
                                () -> new CrowdDataNotFoundException(
                                        "해당 식당의 혼잡도 정보가 없습니다."
                                )
                        );

        return toStatusResponse(snapshot);
    }

    /*
     * 최근 N시간의 차트 데이터 조회
     */
    public CrowdChartResponse getChart(
            Long restaurantId,
            int hours
    ) {

        LocalDateTime end =
                LocalDateTime.now();

        LocalDateTime start =
                end.minusHours(hours);

        List<CrowdSnapshot> snapshots =
                repository
                        .findByRestaurantIdAndObservedAtBetweenOrderByObservedAtAsc(
                                restaurantId,
                                start,
                                end
                        );

        /*
         * 같은 시간대에 들어온 데이터를
         * 시간별로 묶음
         */
        Map<LocalDateTime, List<CrowdSnapshot>> groupedByHour =
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

        /*
         * 각 시간대별 대표 혼잡도를 선정
         */
        List<CrowdChartPoint> chartPoints =
                groupedByHour
                        .entrySet()
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

    /*
     * 한 시간 동안 가장 많이 제보된 상태를
     * 대표 혼잡도로 선택
     *
     * 동률이라면 가장 최근 제보를 사용
     */
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
                        Comparator
                                .comparing(
                                        CrowdSnapshot::getObservedAt
                                )
                                .reversed()
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

    private CrowdStatusResponse toStatusResponse(
            CrowdSnapshot snapshot
    ) {

        CrowdLevel level =
                snapshot.getLevel();

        return new CrowdStatusResponse(
                snapshot.getRestaurantId(),
                level,
                level.getLabel(),
                level.getScore(),
                snapshot.getObservedAt()
        );
    }
}