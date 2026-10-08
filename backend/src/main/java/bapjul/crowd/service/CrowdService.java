package bapjul.crowd.service;

import bapjul.crowd.domain.CrowdLevel;
import bapjul.user.domain.UserRole;
import bapjul.wallet.service.WalletService;
import bapjul.stay.proof.StayProofService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import bapjul.restaurant.exception.RestaurantAccessDeniedException;
import java.util.LinkedHashMap;
import bapjul.crowd.domain.CrowdSnapshot;
import bapjul.crowd.dto.CrowdChartPoint;
import bapjul.crowd.dto.CrowdChartResponse;
import bapjul.crowd.dto.CrowdReportResponse;
import bapjul.crowd.dto.CrowdReportItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final WalletService walletService;
    private final StayProofService stayProofService;
    @Value("${bapjul.stay-proof.enforced:false}") private boolean enforceProof;

    @Autowired
    public CrowdService(CrowdSnapshotRepository repository,RestaurantRepository restaurantRepository,
                        UserRepository userRepository,WalletService walletService,StayProofService stayProofService) {
        this.repository=repository;this.restaurantRepository=restaurantRepository;this.userRepository=userRepository;
        this.walletService=walletService;this.stayProofService=stayProofService;
    }
    // Retain existing unit-test constructor.
    public CrowdService(CrowdSnapshotRepository repository,RestaurantRepository restaurantRepository,UserRepository userRepository) {
        this(repository,restaurantRepository,userRepository,null,null);
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

        boolean qualified=false;
        boolean eligibleReward=false;
        if(reporter.getRole()==UserRole.CUSTOMER) {
            if(request.proofToken()!=null && !request.proofToken().isBlank()) {
                stayProofService.consume(request.proofToken(),reporterEmail,restaurantId);
                qualified=true;
                // Serialize reports per customer so only one reward per restaurant per 30 minutes.
                walletService.lockedCustomer(reporterEmail);
                eligibleReward=!repository.existsByReporter_IdAndRestaurant_IdAndObservedAtAfter(
                    reporter.getId(),restaurantId,LocalDateTime.now().minusMinutes(30));
            } else if(enforceProof) throw new InvalidCrowdReportException("제보하려면 서버 체류 증명이 필요합니다.");
        }
        CrowdSnapshot snapshot =
                CrowdSnapshot.create(
                        restaurant,
                        reporter,
                        request.level()
                );

        snapshot.setDescription(request.description());
        CrowdSnapshot saved=repository.saveAndFlush(snapshot);
        if(qualified && eligibleReward) walletService.rewardReport(reporterEmail,saved.getId());
        return toReportResponse(saved);
    }

    public Page<CrowdReportItem> getRestaurantReports(Long restaurantId, int page, int size) {
        if (!restaurantRepository.existsById(restaurantId)) {
            throw new RestaurantNotFoundException("식당을 찾을 수 없습니다.");
        }
        return repository.findByRestaurant_IdOrderByObservedAtDescIdDesc(restaurantId,
                PageRequest.of(page, size)).map(this::toReportItem);
    }

    public Page<CrowdReportItem> getMyReports(String reporterEmail, int page, int size) {
        User user = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new InvalidCrowdReportException("사용자 정보를 찾을 수 없습니다."));
        return repository.findByReporter_IdOrderByObservedAtDescIdDesc(user.getId(),
                PageRequest.of(page, size)).map(this::toReportItem);
    }

    private CrowdReportItem toReportItem(CrowdSnapshot snapshot) {
        return new CrowdReportItem(snapshot.getId(), snapshot.getRestaurant().getId(),
                snapshot.getRestaurant().getName(), snapshot.getReporter().getNickname(),
                snapshot.getLevel(), snapshot.getLevel().getLabel(), snapshot.getObservedAt(), snapshot.getDescription());
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