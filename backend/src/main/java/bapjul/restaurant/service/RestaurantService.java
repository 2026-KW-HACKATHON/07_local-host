package bapjul.restaurant.service;

import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.dto.RestaurantCreateRequest;
import bapjul.restaurant.dto.RestaurantResponse;
import bapjul.restaurant.dto.RestaurantUpdateRequest;
import bapjul.restaurant.exception.RestaurantAccessDeniedException;
import bapjul.restaurant.exception.RestaurantNotFoundException;
import bapjul.restaurant.repository.RestaurantRepository;
import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class RestaurantService {

    private final RestaurantRepository restaurantRepository;
    private final UserRepository userRepository;

    public RestaurantService(
            RestaurantRepository restaurantRepository,
            UserRepository userRepository
    ) {
        this.restaurantRepository = restaurantRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RestaurantResponse createRestaurant(
            RestaurantCreateRequest request,
            String ownerEmail
    ) {

        User owner = userRepository
                .findByEmail(ownerEmail)
                .orElseThrow(
                        () -> new RestaurantAccessDeniedException(
                                "사용자 정보를 찾을 수 없습니다."
                        )
                );

        Restaurant restaurant = new Restaurant(
                request.name(),
                request.address(),
                request.openingTime(),
                request.closingTime(),
                owner
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

    public RestaurantResponse getRestaurant(
            Long restaurantId
    ) {

        Restaurant restaurant =
                restaurantRepository
                        .findById(restaurantId)
                        .orElseThrow(
                                () ->
                                        new RestaurantNotFoundException(
                                                "식당을 찾을 수 없습니다."
                                        )
                        );

        return toResponse(restaurant);
    }

    @Transactional
    public RestaurantResponse updateRestaurant(
            Long restaurantId,
            RestaurantUpdateRequest request,
            String ownerEmail
    ) {

        Restaurant restaurant =
                restaurantRepository
                        .findById(restaurantId)
                        .orElseThrow(
                                () ->
                                        new RestaurantNotFoundException(
                                                "식당을 찾을 수 없습니다."
                                        )
                        );

        if (restaurant.getOwner() == null ||
        !restaurant.getOwner()
                .getEmail()
                .equals(ownerEmail)) {

                throw new RestaurantAccessDeniedException(
                        "자신의 식당 프로모션만 관리할 수 있습니다."
                );
                }

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
                restaurant.getOwner().getId()
        );
    }
}