package bapjul.promotion.repository;

import bapjul.promotion.domain.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PromotionRepository
        extends JpaRepository<Promotion, Long> {

    Optional<Promotion>
    findByIdAndRestaurant_Id(
            Long promotionId,
            Long restaurantId
    );

    List<Promotion>
    findByRestaurant_IdOrderByStartAtDesc(
            Long restaurantId
    );

    List<Promotion>
    findByRestaurant_IdAndEnabledTrueAndStartAtLessThanEqualAndEndAtGreaterThanEqualOrderByEndAtAsc(
            Long restaurantId,
            LocalDateTime startAt,
            LocalDateTime endAt
    );
}