package bapjul.restaurant.service;

import bapjul.restaurant.domain.Restaurant;
import bapjul.stay.GeoDistance;
import java.util.Comparator;
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

        checkCoordinates(request.latitude(), request.longitude());
        restaurant.updateLocation(request.latitude(), request.longitude(), request.floor());

        Restaurant saved =
                restaurantRepository.save(restaurant);

        return toResponse(saved);
    }

    public List<RestaurantResponse> getRestaurants(Double latitude, Double longitude) {
        checkCoordinates(latitude, longitude);
        // Unknown coordinates stay at the end, rather than receiving an invented distance.
        return restaurantRepository.findAll().stream()
                .map(restaurant -> toResponse(restaurant, latitude, longitude))
                .sorted(latitude == null ? Comparator.comparing(RestaurantResponse::id) :
                        Comparator.comparing(RestaurantResponse::distanceMeters,
                                Comparator.nullsLast(Double::compareTo))
                                .thenComparing(RestaurantResponse::id))
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

        checkCoordinates(request.latitude(), request.longitude());
        // Backwards-compatible PUT: when omitted, preserve existing location fields.
        if (request.latitude() != null) {
            restaurant.updateLocation(request.latitude(), request.longitude(),
                    request.floor() == null ? restaurant.getFloor() : request.floor());
        } else if (request.floor() != null) {
            restaurant.updateLocation(restaurant.getLatitude(), restaurant.getLongitude(), request.floor());
        }

        restaurant.update(
                request.name(),
                request.address(),
                request.openingTime(),
                request.closingTime()
        );

        return toResponse(restaurant);
    }

    private void checkCoordinates(Double latitude, Double longitude) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("위도와 경도는 함께 제공해야 합니다.");
        }
        if (latitude != null && (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("위도 또는 경도의 범위가 올바르지 않습니다.");
        }
    }

    private RestaurantResponse toResponse(Restaurant restaurant) {
        return toResponse(restaurant, null, null);
    }

    private RestaurantResponse toResponse(Restaurant restaurant, Double latitude, Double longitude) {
        Double distance = latitude != null && restaurant.getLatitude() != null && restaurant.getLongitude() != null
                ? GeoDistance.meters(latitude, longitude,
                        restaurant.getLatitude(), restaurant.getLongitude())
                : null;
        return new RestaurantResponse(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getAddress(),
                restaurant.getOpeningTime(),
                restaurant.getClosingTime(),
                restaurant.getOwner().getId(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                restaurant.getFloor(),
                distance
        );
    }
}