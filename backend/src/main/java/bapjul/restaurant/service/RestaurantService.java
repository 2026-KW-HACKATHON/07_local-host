package bapjul.restaurant.service;

import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.dto.RestaurantCreateRequest;
import bapjul.restaurant.dto.RestaurantResponse;
import bapjul.restaurant.dto.RestaurantUpdateRequest;
import bapjul.restaurant.exception.RestaurantNotFoundException;
import bapjul.restaurant.repository.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;

    public RestaurantService(
            RestaurantRepository restaurantRepository
    ) {
        this.restaurantRepository = restaurantRepository;
    }

    @Transactional
    public RestaurantResponse createRestaurant(
            RestaurantCreateRequest request
    ) {

        Restaurant restaurant = new Restaurant(
                request.name(),
                request.address(),
                request.openingTime(),
                request.closingTime(),
                request.ownerId()
        );

        Restaurant saved =
                restaurantRepository.save(restaurant);

        return toResponse(saved);
    }

    public List<RestaurantResponse> getRestaurants() {

        return restaurantRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public RestaurantResponse getRestaurant(Long restaurantId) {

        Restaurant restaurant =
                restaurantRepository.findById(restaurantId)
                        .orElseThrow(
                                () -> new RestaurantNotFoundException(
                                        "식당을 찾을 수 없습니다."
                                )
                        );

        return toResponse(restaurant);
    }

    @Transactional
    public RestaurantResponse updateRestaurant(
            Long restaurantId,
            RestaurantUpdateRequest request
    ) {

        Restaurant restaurant =
                restaurantRepository.findById(restaurantId)
                        .orElseThrow(
                                () -> new RestaurantNotFoundException(
                                        "식당을 찾을 수 없습니다."
                                )
                        );

        restaurant.update(
                request.name(),
                request.address(),
                request.openingTime(),
                request.closingTime()
        );

        return toResponse(restaurant);
    }

    private RestaurantResponse toResponse(
            Restaurant restaurant
    ) {

        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getAddress(),
                restaurant.getOpeningTime(),
                restaurant.getClosingTime(),
                restaurant.getOwnerId()
        );
    }
}