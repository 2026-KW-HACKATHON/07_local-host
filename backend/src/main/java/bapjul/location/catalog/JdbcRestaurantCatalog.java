package bapjul.location.catalog;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class JdbcRestaurantCatalog implements RestaurantCatalog {
    private final JdbcTemplate jdbc;
    public JdbcRestaurantCatalog(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override
    public List<Restaurant> findActiveRestaurants() {
        return jdbc.query("SELECT id, name, address, floor, latitude, longitude FROM bapjul_location_restaurants WHERE active = TRUE",
            (rs, row) -> new Restaurant(rs.getString("id"), rs.getString("name"),
                rs.getString("address"), rs.getString("floor"), rs.getDouble("latitude"), rs.getDouble("longitude")));
    }
}
