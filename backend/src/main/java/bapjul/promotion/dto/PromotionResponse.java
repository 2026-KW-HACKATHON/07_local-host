package bapjul.promotion.dto;

import java.time.LocalDateTime;

public record PromotionResponse(
        Long id,
        Long restaurantId,
        String title,
        String description,
        Integer discountPercent,
        LocalDateTime startAt,
        LocalDateTime endAt,
        boolean enabled,
        boolean active
) {
}