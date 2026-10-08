package bapjul.restaurant;

import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.dto.RestaurantResponse;
import bapjul.restaurant.repository.RestaurantRepository;
import bapjul.restaurant.service.RestaurantService;
import bapjul.user.domain.User;
import bapjul.user.domain.UserRole;
import bapjul.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RestaurantServiceTest {
    @Test
    void distanceSortKeepsUnknownCoordinatesLast() {
        RestaurantRepository repo = mock(RestaurantRepository.class);
        User owner = new User("owner@example.test", "hash", "Owner", UserRole.OWNER);
        Restaurant unknown = new Restaurant("unknown", "addr", null, null, owner);
        Restaurant far = new Restaurant("far", "addr", null, null, owner);
        far.updateLocation(37.01, 127.0, "2층");
        Restaurant near = new Restaurant("near", "addr", null, null, owner);
        near.updateLocation(37.001, 127.0, "1층");
        when(repo.findAll()).thenReturn(List.of(far, unknown, near));
        RestaurantService service = new RestaurantService(repo, mock(UserRepository.class));

        List<RestaurantResponse> result = service.getRestaurants(37.0, 127.0);
        assertEquals(List.of("near", "far", "unknown"), result.stream().map(RestaurantResponse::name).toList());
        assertTrue(result.get(0).distanceMeters() < result.get(1).distanceMeters());
        assertNull(result.get(2).distanceMeters());
        assertEquals("1층", result.get(0).floor());
    }

    @Test
    void rejectsIncompleteCoordinates() {
        RestaurantService service = new RestaurantService(mock(RestaurantRepository.class), mock(UserRepository.class));
        assertThrows(IllegalArgumentException.class, () -> service.getRestaurants(37.0, null));
    }
}
