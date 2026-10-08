package bapjul.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record RestaurantCreateRequest(

        @NotBlank
        String name,

        @NotBlank
        String address,

        LocalTime openingTime,

        LocalTime closingTime,

        @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
        @Size(max = 40) String floor
) {
}