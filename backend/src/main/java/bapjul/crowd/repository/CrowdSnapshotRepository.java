package bapjul.crowd.repository;

import bapjul.crowd.domain.CrowdSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CrowdSnapshotRepository
        extends JpaRepository<CrowdSnapshot, Long> {

    List<CrowdSnapshot>
    findByRestaurant_IdAndObservedAtBetweenOrderByObservedAtAsc(
            Long restaurantId,
            LocalDateTime start,
            LocalDateTime end
    );
}