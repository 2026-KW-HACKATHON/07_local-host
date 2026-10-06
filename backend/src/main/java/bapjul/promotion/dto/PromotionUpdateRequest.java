package bapjul.promotion.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record PromotionUpdateRequest(

        @NotBlank
        @Size(max = 100)
        String title,

        @Size(max = 500)
        String description,

        @NotNull
        @Min(1)
        @Max(100)
        Integer discountPercent,

        @NotNull
        LocalDateTime startAt,

        @NotNull
        LocalDateTime endAt,

        @NotNull
        Boolean enabled
) {
}