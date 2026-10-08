package bapjul.crowd.repository;

import bapjul.crowd.domain.CrowdSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface CrowdSnapshotRepository
        extends JpaRepository<CrowdSnapshot, Long> {

    @EntityGraph(attributePaths = {"reporter", "restaurant"})
    Page<CrowdSnapshot> findByRestaurant_IdOrderByObservedAtDescIdDesc(Long restaurantId, Pageable pageable);

    @EntityGraph(attributePaths = {"reporter", "restaurant"})
    Page<CrowdSnapshot> findByReporter_IdOrderByObservedAtDescIdDesc(Long reporterId, Pageable pageable);

    List<CrowdSnapshot>
    findByRestaurant_IdAndObservedAtBetweenOrderByObservedAtAsc(
            Long restaurantId,
            LocalDateTime start,
            LocalDateTime end
    );
}