package bapjul.restaurant.repository;

import bapjul.restaurant.domain.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RestaurantRepository
        extends JpaRepository<Restaurant, Long> {
    List<Restaurant> findByLatitudeIsNotNullAndLongitudeIsNotNull();
}