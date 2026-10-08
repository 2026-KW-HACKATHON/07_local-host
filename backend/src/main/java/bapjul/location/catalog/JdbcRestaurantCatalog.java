package bapjul.location.catalog;

import bapjul.restaurant.repository.RestaurantRepository;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class JdbcRestaurantCatalog implements RestaurantCatalog {
    private final JdbcTemplate jdbc;
    private final RestaurantRepository restaurants;

    public JdbcRestaurantCatalog(JdbcTemplate jdbc, RestaurantRepository restaurants) {
        this.jdbc = jdbc;
        this.restaurants = restaurants;
    }

    @Override
    public List<Restaurant> findActiveRestaurants() {
        List<Restaurant> result = new ArrayList<>();
        // Registered shops are now discoverable under their actual numeric restaurant ID.
        for (bapjul.restaurant.domain.Restaurant r : restaurants.findByLatitudeIsNotNullAndLongitudeIsNotNull()) {
            result.add(new Restaurant(String.valueOf(r.getId()), r.getName(), r.getAddress(),
                    r.getFloor() == null ? "" : r.getFloor(), r.getLatitude(), r.getLongitude()));
        }
        // Keep isolated location demo/test records compatible with the existing GPS API.
        // The legacy table may not exist on a MySQL installation configured with init.mode=embedded.
        try {
            result.addAll(jdbc.query(
                    "SELECT id, name, address, floor, latitude, longitude FROM bapjul_location_restaurants WHERE active = TRUE",
                    (rs, row) -> new Restaurant(rs.getString("id"), rs.getString("name"),
                            rs.getString("address"), rs.getString("floor"),
                            rs.getDouble("latitude"), rs.getDouble("longitude"))));
        } catch (BadSqlGrammarException e) {
            // Only the known missing legacy table is optional; do not silence other SQL errors.
            if (!e.getMessage().toLowerCase(java.util.Locale.ROOT).contains("bapjul_location_restaurants")) {
                throw e;
            }
        }
        return result;
    }
}

