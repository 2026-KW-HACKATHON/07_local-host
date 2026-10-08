package bapjul.restaurant.controller;

import bapjul.restaurant.dto.RestaurantCreateRequest;
import bapjul.restaurant.dto.RestaurantResponse;
import bapjul.restaurant.dto.RestaurantUpdateRequest;
import bapjul.restaurant.service.RestaurantService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
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
            @Valid @RequestBody RestaurantCreateRequest request,
            Authentication authentication
    ) {
        return restaurantService.createRestaurant(
                request,
                authentication.getName()
        );
    }

    @GetMapping
    public List<RestaurantResponse> getRestaurants(
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude
    ) {
        return restaurantService.getRestaurants(latitude, longitude);
    }

    @GetMapping("/{restaurantId}")
    public RestaurantResponse getRestaurant(
            @PathVariable Long restaurantId
    ) {
        return restaurantService.getRestaurant(
                restaurantId
        );
    }

    @PutMapping("/{restaurantId}")
    public RestaurantResponse updateRestaurant(
            @PathVariable Long restaurantId,
            @Valid @RequestBody RestaurantUpdateRequest request,
            Authentication authentication
    ) {
        return restaurantService.updateRestaurant(
                restaurantId,
                request,
                authentication.getName()
        );
    }
}