package bapjul.restaurant.dto;

import java.time.LocalTime;

public record RestaurantResponse(
        Long id,
        String name,
        String address,
        LocalTime openingTime,
        LocalTime closingTime,
        Long ownerId
) {
}