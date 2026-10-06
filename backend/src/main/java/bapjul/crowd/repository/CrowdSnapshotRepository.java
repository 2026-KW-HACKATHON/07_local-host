package bapjul.crowd.repository;

import bapjul.crowd.domain.CrowdSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CrowdSnapshotRepository
        extends JpaRepository<CrowdSnapshot, Long> {

    Optional<CrowdSnapshot>
    findTopByRestaurantIdOrderByObservedAtDesc(
            Long restaurantId
    );

    List<CrowdSnapshot>
    findByRestaurantIdAndObservedAtBetweenOrderByObservedAtAsc(
            Long restaurantId,
            LocalDateTime start,
            LocalDateTime end
    );
}