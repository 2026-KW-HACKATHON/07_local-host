package bapjul.restaurant.controller;

import bapjul.restaurant.dto.RestaurantCreateRequest;
import bapjul.restaurant.dto.RestaurantResponse;
import bapjul.restaurant.dto.RestaurantUpdateRequest;
import bapjul.restaurant.service.RestaurantService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {

    private final RestaurantService restaurantService;

    public RestaurantController(
            RestaurantService restaurantService
    ) {
        this.restaurantService = restaurantService;
    }

    @PostMapping
    public RestaurantResponse createRestaurant(
            @Valid @RequestBody RestaurantCreateRequest request
    ) {
        return restaurantService.createRestaurant(request);
    }

    @GetMapping
    public List<RestaurantResponse> getRestaurants() {
        return restaurantService.getRestaurants();
    }

    @GetMapping("/{restaurantId}")
    public RestaurantResponse getRestaurant(
            @PathVariable Long restaurantId
    ) {
        return restaurantService.getRestaurant(restaurantId);
    }

    @PutMapping("/{restaurantId}")
    public RestaurantResponse updateRestaurant(
            @PathVariable Long restaurantId,
            @Valid @RequestBody RestaurantUpdateRequest request
    ) {
        return restaurantService.updateRestaurant(
                restaurantId,
                request
        );
    }
}