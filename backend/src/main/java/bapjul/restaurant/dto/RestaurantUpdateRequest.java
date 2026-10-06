package bapjul.restaurant.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalTime;

public record RestaurantUpdateRequest(

        @NotBlank
        String name,

        @NotBlank
        String address,

        LocalTime openingTime,

        LocalTime closingTime
) {
}