package bapjul.devseed;

import bapjul.crowd.domain.CrowdLevel;
import bapjul.crowd.domain.CrowdSnapshot;
import bapjul.crowd.repository.CrowdSnapshotRepository;
import bapjul.promotion.domain.Promotion;
import bapjul.promotion.repository.PromotionRepository;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.repository.RestaurantRepository;
import bapjul.user.domain.User;
import bapjul.user.domain.UserRole;
import bapjul.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Component
@Profile("local")
@ConditionalOnProperty(
        prefix = "bapjul.dev-seed",
        name = "enabled",
        havingValue = "true"
)
public class DevFrontendSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevFrontendSeedRunner.class);

    private static final String DEMO_PASSWORD = "Demo1234!";
    private static final String TYPE_USER = "USER";
    private static final String TYPE_RESTAURANT = "RESTAURANT";
    private static final String TYPE_CROWD = "CROWD";
    private static final String TYPE_PROMOTION = "PROMOTION";

    private static final List<UserSeed> USER_SEEDS = List.of(
            new UserSeed("user.customer1", "customer1@example.test", "밥줄손님", UserRole.CUSTOMER),
            new UserSeed("user.customer2", "customer2@example.test", "한끼탐험가", UserRole.CUSTOMER),
            new UserSeed("user.customer3", "customer3@example.test", "공강맛집러", UserRole.CUSTOMER),
            new UserSeed("user.customer4", "customer4@example.test", "점심메이트", UserRole.CUSTOMER),
            new UserSeed("user.owner1", "owner1@example.test", "광운점주", UserRole.OWNER),
            new UserSeed("user.owner2", "owner2@example.test", "월계점주", UserRole.OWNER),
            new UserSeed("user.owner3", "owner3@example.test", "동네점주", UserRole.OWNER)
    );

    private static final List<RestaurantSeed> RESTAURANT_SEEDS = List.of(
            new RestaurantSeed(
                    "restaurant.r1", "국밥집", "서울특별시 노원구 광운로 20 1층",
                    LocalTime.of(8, 0), LocalTime.of(22, 0), "user.owner1"
            ),
            new RestaurantSeed(
                    "restaurant.r2", "월계한상", "서울특별시 노원구 석계로7길 14",
                    LocalTime.of(10, 30), LocalTime.of(21, 0), "user.owner2"
            ),
            new RestaurantSeed(
                    "restaurant.r3", "오늘김밥", "서울특별시 노원구 광운로12길 25 광운대학교 동해문화예술관 맞은편 1층",
                    LocalTime.of(7, 30), LocalTime.of(20, 30), "user.owner3"
            ),
            new RestaurantSeed(
                    "restaurant.r4", "광운대앞든든한집밥그리고제육볶음", "서울특별시 노원구 초안산로2라길 26 상가동 2층 203호",
                    LocalTime.of(11, 0), LocalTime.of(22, 0), "user.owner1"
            ),
            new RestaurantSeed(
                    "restaurant.r5", "면", "서울특별시 노원구 월계로44길 23",
                    LocalTime.of(11, 0), LocalTime.of(23, 0), "user.owner2"
            ),
            new RestaurantSeed(
                    "restaurant.r6", "매운닭갈비연구소", "서울특별시 노원구 광운로 54-3 지하1층",
                    LocalTime.of(11, 30), LocalTime.of(22, 30), "user.owner3"
            ),
            new RestaurantSeed(
                    "restaurant.r7", "소담", "서울특별시 노원구 월계동 411-8",
                    LocalTime.of(9, 0), LocalTime.of(19, 30), "user.owner1"
            ),
            new RestaurantSeed(
                    "restaurant.r8", "밤샘분식과따뜻한우동", "서울특별시 노원구 광운로19가길 6 청년주택 상가 1층 108호",
                    LocalTime.of(17, 0), LocalTime.of(2, 0), "user.owner2"
            )
    );

    private static final CrowdLevel[] CHART_PATTERN = {
            CrowdLevel.AVAILABLE,
            CrowdLevel.FEW_SEATS,
            CrowdLevel.LONG_WAIT
    };

    private final UserRepository userRepository;
    private final RestaurantRepository restaurantRepository;
    private final CrowdSnapshotRepository crowdRepository;
    private final PromotionRepository promotionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final Environment environment;

    public DevFrontendSeedRunner(
            UserRepository userRepository,
            RestaurantRepository restaurantRepository,
            CrowdSnapshotRepository crowdRepository,
            PromotionRepository promotionRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            Environment environment
    ) {
        this.userRepository = userRepository;
        this.restaurantRepository = restaurantRepository;
        this.crowdRepository = crowdRepository;
        this.promotionRepository = promotionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        rejectProductionProfile();
        ensureManifestTable();

        Map<String, User> users = seedUsers();
        Map<String, Restaurant> restaurants = seedRestaurants(users);

        // 시간 민감 데이터는 이 시더가 만든 행만 지우고 다시 생성한다.
        // 기존 사용자/식당 및 다른 데이터는 삭제하거나 덮어쓰지 않는다.
        removeRecordedTransientRows();

        LocalDateTime now = LocalDateTime.now().withNano(0);
        int crowdCount = seedCrowdReports(restaurants, users, now);
        int promotionCount = seedPromotions(restaurants, now);

        log.info(
                "[DEV-SEED] complete: users={}, restaurants={}, crowdReports={}, promotions={}, serverNow={}",
                users.size(), restaurants.size(), crowdCount, promotionCount, now
        );
        log.info("[DEV-SEED] representative login: customer1@example.test / {}", DEMO_PASSWORD);
        log.info("[DEV-SEED] rerun with the same local + bapjul.dev-seed.enabled=true options to refresh 30-minute crowd data.");
    }

    private void rejectProductionProfile() {
        boolean production = Arrays.stream(environment.getActiveProfiles())
                .map(String::toLowerCase)
                .anyMatch(profile -> profile.equals("prod") || profile.equals("production"));

        if (production) {
            throw new IllegalStateException("개발 시드는 prod/production 프로필에서 실행할 수 없습니다.");
        }
    }

    private Map<String, User> seedUsers() {
        Map<String, User> result = new LinkedHashMap<>();
        for (UserSeed seed : USER_SEEDS) {
            result.put(seed.key(), ensureUser(seed));
        }
        return result;
    }

    private User ensureUser(UserSeed seed) {
        Optional<Long> recordedId = findManifestId(seed.key());
        if (recordedId.isPresent()) {
            User user = userRepository.findById(recordedId.get())
                    .orElseThrow(() -> new IllegalStateException(
                            "시드 사용자 marker는 있지만 사용자 행이 없습니다: " + seed.key()
                    ));
            validateSeedUser(seed, user);
            return user;
        }

        if (userRepository.existsByEmail(seed.email())) {
            throw new IllegalStateException(
                    "기존 이메일을 시드가 덮어쓰지 않습니다. 충돌 이메일: " + seed.email()
            );
        }
        if (userRepository.existsByNickname(seed.nickname())) {
            throw new IllegalStateException(
                    "기존 닉네임을 시드가 덮어쓰지 않습니다. 충돌 닉네임: " + seed.nickname()
            );
        }

        User saved = userRepository.save(new User(
                seed.email(),
                passwordEncoder.encode(DEMO_PASSWORD),
                seed.nickname(),
                seed.role()
        ));
        putManifest(seed.key(), TYPE_USER, saved.getId());
        return saved;
    }

    private void validateSeedUser(UserSeed seed, User user) {
        boolean valid = Objects.equals(seed.email(), user.getEmail())
                && Objects.equals(seed.nickname(), user.getNickname())
                && seed.role() == user.getRole()
                && passwordEncoder.matches(DEMO_PASSWORD, user.getPassword());

        if (!valid) {
            throw new IllegalStateException(
                    "기존 시드 사용자 값이 변경되어 있어 자동 덮어쓰기를 중단합니다: " + seed.key()
            );
        }
    }

    private Map<String, Restaurant> seedRestaurants(Map<String, User> users) {
        Map<String, Restaurant> result = new LinkedHashMap<>();
        for (RestaurantSeed seed : RESTAURANT_SEEDS) {
            User owner = require(users, seed.ownerKey());
            result.put(seed.key(), ensureRestaurant(seed, owner));
        }
        return result;
    }

    private Restaurant ensureRestaurant(RestaurantSeed seed, User owner) {
        Optional<Long> recordedId = findManifestId(seed.key());
        if (recordedId.isPresent()) {
            Restaurant restaurant = restaurantRepository.findById(recordedId.get())
                    .orElseThrow(() -> new IllegalStateException(
                            "시드 식당 marker는 있지만 식당 행이 없습니다: " + seed.key()
                    ));
            validateSeedRestaurant(seed, owner, restaurant);
            return restaurant;
        }

        boolean collision = restaurantRepository.findAll().stream()
                .anyMatch(existing -> Objects.equals(existing.getName(), seed.name())
                        && Objects.equals(existing.getAddress(), seed.address()));
        if (collision) {
            throw new IllegalStateException(
                    "동일 이름/주소의 기존 식당을 시드가 덮어쓰지 않습니다: " + seed.name()
            );
        }

        Restaurant saved = restaurantRepository.save(new Restaurant(
                seed.name(),
                seed.address(),
                seed.openingTime(),
                seed.closingTime(),
                owner
        ));
        putManifest(seed.key(), TYPE_RESTAURANT, saved.getId());
        return saved;
    }

    private void validateSeedRestaurant(RestaurantSeed seed, User owner, Restaurant restaurant) {
        boolean valid = Objects.equals(seed.name(), restaurant.getName())
                && Objects.equals(seed.address(), restaurant.getAddress())
                && Objects.equals(seed.openingTime(), restaurant.getOpeningTime())
                && Objects.equals(seed.closingTime(), restaurant.getClosingTime())
                && restaurant.getOwner() != null
                && Objects.equals(owner.getId(), restaurant.getOwner().getId());

        if (!valid) {
            throw new IllegalStateException(
                    "기존 시드 식당 값이 변경되어 있어 자동 덮어쓰기를 중단합니다: " + seed.key()
            );
        }
    }

    private void removeRecordedTransientRows() {
        List<Long> promotionIds = manifestIds(TYPE_PROMOTION);
        for (Long id : promotionIds) {
            if (promotionRepository.existsById(id)) {
                promotionRepository.deleteById(id);
            }
        }
        promotionRepository.flush();
        deleteManifestType(TYPE_PROMOTION);

        List<Long> crowdIds = manifestIds(TYPE_CROWD);
        for (Long id : crowdIds) {
            if (crowdRepository.existsById(id)) {
                crowdRepository.deleteById(id);
            }
        }
        crowdRepository.flush();
        deleteManifestType(TYPE_CROWD);
    }

    private int seedCrowdReports(
            Map<String, Restaurant> restaurants,
            Map<String, User> users,
            LocalDateTime now
    ) {
        List<User> reporters = List.of(
                require(users, "user.customer1"),
                require(users, "user.customer2"),
                require(users, "user.customer3"),
                require(users, "user.customer4")
        );

        int count = 0;

        // r1~r4: 23개 과거 시간 버킷 + 최근 제보 3개 = 식당당 26건.
        // 현재 시간 버킷까지 합쳐 최근 24시간에 24개 시간 버킷이 생긴다.
        count += seedFullDayRestaurant(
                "r1", require(restaurants, "restaurant.r1"), CrowdLevel.AVAILABLE, 0, reporters, now
        );
        count += seedFullDayRestaurant(
                "r2", require(restaurants, "restaurant.r2"), CrowdLevel.AVAILABLE, 1, reporters, now
        );
        count += seedFullDayRestaurant(
                "r3", require(restaurants, "restaurant.r3"), CrowdLevel.FEW_SEATS, 2, reporters, now
        );
        count += seedFullDayRestaurant(
                "r4", require(restaurants, "restaurant.r4"), CrowdLevel.FEW_SEATS, 0, reporters, now
        );

        // r5~r6: 현재 혼잡도 검증용 최근 제보 3개씩.
        count += seedRecentMajority(
                "r5", require(restaurants, "restaurant.r5"), CrowdLevel.LONG_WAIT, reporters, now
        );
        count += seedRecentMajority(
                "r6", require(restaurants, "restaurant.r6"), CrowdLevel.LONG_WAIT, reporters, now
        );

        // r7: 의도적으로 제보를 전혀 넣지 않는다 -> UNKNOWN.

        // r8: 과거 제보는 있지만 최근 30분에는 없음 -> UNKNOWN.
        Restaurant r8 = require(restaurants, "restaurant.r8");
        count += saveCrowd("crowd.r8.old.1", r8, reporters.get(0), CrowdLevel.AVAILABLE, now.minusHours(2));
        count += saveCrowd("crowd.r8.old.2", r8, reporters.get(1), CrowdLevel.FEW_SEATS, now.minusHours(5));
        count += saveCrowd("crowd.r8.old.3", r8, reporters.get(2), CrowdLevel.LONG_WAIT, now.minusHours(9));
        count += saveCrowd("crowd.r8.old.4", r8, reporters.get(3), CrowdLevel.AVAILABLE, now.minusHours(16));

        if (count != 114) {
            throw new IllegalStateException("예상 혼잡도 시드 수 114와 다릅니다: " + count);
        }
        return count;
    }

    private int seedFullDayRestaurant(
            String shortKey,
            Restaurant restaurant,
            CrowdLevel expectedCurrent,
            int patternPhase,
            List<User> reporters,
            LocalDateTime now
    ) {
        int count = 0;
        LocalDateTime currentHour = now.truncatedTo(ChronoUnit.HOURS);

        for (int hoursAgo = 1; hoursAgo <= 23; hoursAgo++) {
            CrowdLevel level = CHART_PATTERN[(hoursAgo + patternPhase) % CHART_PATTERN.length];
            LocalDateTime observedAt = currentHour
                    .minusHours(hoursAgo)
                    .plusMinutes(20 + (patternPhase * 5L));
            User reporter = reporters.get(hoursAgo % reporters.size());
            count += saveCrowd(
                    "crowd." + shortKey + ".hour." + hoursAgo,
                    restaurant,
                    reporter,
                    level,
                    observedAt
            );
        }

        count += seedRecentMajority(shortKey, restaurant, expectedCurrent, reporters, now);
        return count;
    }

    private int seedRecentMajority(
            String shortKey,
            Restaurant restaurant,
            CrowdLevel target,
            List<User> reporters,
            LocalDateTime now
    ) {
        CrowdLevel alternate = switch (target) {
            case AVAILABLE -> CrowdLevel.FEW_SEATS;
            case FEW_SEATS -> CrowdLevel.AVAILABLE;
            case LONG_WAIT -> CrowdLevel.FEW_SEATS;
            case UNKNOWN -> throw new IllegalArgumentException("UNKNOWN은 직접 제보할 수 없습니다.");
        };

        int count = 0;
        count += saveCrowd(
                "crowd." + shortKey + ".recent.1",
                restaurant,
                reporters.get(0),
                alternate,
                now.minusMinutes(14)
        );
        count += saveCrowd(
                "crowd." + shortKey + ".recent.2",
                restaurant,
                reporters.get(1),
                target,
                now.minusMinutes(7)
        );
        count += saveCrowd(
                "crowd." + shortKey + ".recent.3",
                restaurant,
                reporters.get(2),
                target,
                now.withSecond(0).withNano(0)
        );
        return count;
    }

    private int saveCrowd(
            String key,
            Restaurant restaurant,
            User reporter,
            CrowdLevel level,
            LocalDateTime observedAt
    ) {
        if (level == CrowdLevel.UNKNOWN) {
            throw new IllegalArgumentException("UNKNOWN은 시드 제보에도 직접 저장하지 않습니다.");
        }
        CrowdSnapshot saved = crowdRepository.save(CrowdSnapshot.create(
                restaurant,
                reporter,
                level,
                observedAt
        ));
        putManifest(key, TYPE_CROWD, saved.getId());
        return 1;
    }

    private int seedPromotions(Map<String, Restaurant> restaurants, LocalDateTime now) {
        int count = 0;

        count += savePromotion(
                "promotion.active.r1",
                require(restaurants, "restaurant.r1"),
                "점심 10% 할인",
                "오늘 점심은 가볍게 10% 할인!",
                10,
                now.minusHours(2),
                now.plusHours(4),
                true
        );
        count += savePromotion(
                "promotion.active.r3",
                require(restaurants, "restaurant.r3"),
                "공강 타임 15% 할인",
                "수업 사이 공강 시간에 방문하는 학생을 위한 할인입니다. 주문 전에 화면의 프로모션을 직원에게 보여 주세요.",
                15,
                now.minusMinutes(40),
                now.plusHours(3),
                true
        );
        count += savePromotion(
                "promotion.active.r5",
                require(restaurants, "restaurant.r5"),
                "면데이 20% 할인",
                "오늘만 20% 할인",
                20,
                now.minusMinutes(10),
                now.plusHours(2),
                true
        );
        count += savePromotion(
                "promotion.expired.r2",
                require(restaurants, "restaurant.r2"),
                "어제 한정 12% 할인",
                "이미 종료된 프로모션 노출 여부를 확인하기 위한 데이터입니다.",
                12,
                now.minusDays(2),
                now.minusDays(1),
                true
        );
        count += savePromotion(
                "promotion.future.r4",
                require(restaurants, "restaurant.r4"),
                "저녁 예정 18% 할인",
                "아직 시작하지 않은 프로모션입니다. 시작 시간이 되기 전에는 손님 화면에 보이면 안 됩니다.",
                18,
                now.plusHours(3),
                now.plusHours(8),
                true
        );
        count += savePromotion(
                "promotion.disabled.r6",
                require(restaurants, "restaurant.r6"),
                "비공개 테스트 25% 할인",
                "기간은 유효하지만 점주가 비활성화한 프로모션입니다.",
                25,
                now.minusHours(1),
                now.plusHours(5),
                false
        );

        if (count != 6) {
            throw new IllegalStateException("예상 프로모션 시드 수 6과 다릅니다: " + count);
        }
        return count;
    }

    private int savePromotion(
            String key,
            Restaurant restaurant,
            String title,
            String description,
            int discountPercent,
            LocalDateTime startAt,
            LocalDateTime endAt,
            boolean enabled
    ) {
        Promotion promotion = new Promotion(
                restaurant,
                title,
                description,
                discountPercent,
                startAt,
                endAt
        );
        if (!enabled) {
            promotion.update(
                    title,
                    description,
                    discountPercent,
                    startAt,
                    endAt,
                    false
            );
        }
        Promotion saved = promotionRepository.save(promotion);
        putManifest(key, TYPE_PROMOTION, saved.getId());
        return 1;
    }

    private void ensureManifestTable() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS dev_seed_manifest (
                    seed_key VARCHAR(120) PRIMARY KEY,
                    entity_type VARCHAR(32) NOT NULL,
                    entity_id BIGINT NOT NULL
                )
                """);
    }

    private Optional<Long> findManifestId(String seedKey) {
        List<Long> ids = jdbcTemplate.query(
                "SELECT entity_id FROM dev_seed_manifest WHERE seed_key = ?",
                (rs, rowNum) -> rs.getLong("entity_id"),
                seedKey
        );
        return ids.stream().findFirst();
    }

    private List<Long> manifestIds(String entityType) {
        return jdbcTemplate.query(
                "SELECT entity_id FROM dev_seed_manifest WHERE entity_type = ?",
                (rs, rowNum) -> rs.getLong("entity_id"),
                entityType
        );
    }

    private void putManifest(String seedKey, String entityType, Long entityId) {
        int updated = jdbcTemplate.update(
                "UPDATE dev_seed_manifest SET entity_type = ?, entity_id = ? WHERE seed_key = ?",
                entityType,
                entityId,
                seedKey
        );
        if (updated == 0) {
            jdbcTemplate.update(
                    "INSERT INTO dev_seed_manifest(seed_key, entity_type, entity_id) VALUES (?, ?, ?)",
                    seedKey,
                    entityType,
                    entityId
            );
        }
    }

    private void deleteManifestType(String entityType) {
        jdbcTemplate.update(
                "DELETE FROM dev_seed_manifest WHERE entity_type = ?",
                entityType
        );
    }

    private static <T> T require(Map<String, T> map, String key) {
        T value = map.get(key);
        if (value == null) {
            throw new IllegalStateException("시드 참조를 찾을 수 없습니다: " + key);
        }
        return value;
    }

    private record UserSeed(
            String key,
            String email,
            String nickname,
            UserRole role
    ) {
    }

    private record RestaurantSeed(
            String key,
            String name,
            String address,
            LocalTime openingTime,
            LocalTime closingTime,
            String ownerKey
    ) {
    }
}
