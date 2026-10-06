package bapjul.promotion.service;

import bapjul.promotion.domain.Promotion;
import bapjul.promotion.dto.PromotionCreateRequest;
import bapjul.promotion.dto.PromotionResponse;
import bapjul.promotion.dto.PromotionUpdateRequest;
import bapjul.promotion.exception.InvalidPromotionException;
import bapjul.promotion.exception.PromotionNotFoundException;
import bapjul.promotion.repository.PromotionRepository;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.exception.RestaurantAccessDeniedException;
import bapjul.restaurant.exception.RestaurantNotFoundException;
import bapjul.restaurant.repository.RestaurantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final RestaurantRepository restaurantRepository;

    public PromotionService(
            PromotionRepository promotionRepository,
            RestaurantRepository restaurantRepository
    ) {
        this.promotionRepository = promotionRepository;
        this.restaurantRepository = restaurantRepository;
    }

    @Transactional
    public PromotionResponse createPromotion(
            Long restaurantId,
            PromotionCreateRequest request,
            String ownerEmail
    ) {

        Restaurant restaurant =
                getOwnedRestaurant(
                        restaurantId,
                        ownerEmail
                );

        validatePeriod(
                request.startAt(),
                request.endAt()
        );

        Promotion promotion =
                new Promotion(
                        restaurant,
                        request.title(),
                        request.description(),
                        request.discountPercent(),
                        request.startAt(),
                        request.endAt()
                );

        Promotion saved =
                promotionRepository.save(promotion);

        return toResponse(saved);
    }

    public List<PromotionResponse>
    getActivePromotions(
            Long restaurantId
    ) {

        if (!restaurantRepository.existsById(
                restaurantId
        )) {
            throw new RestaurantNotFoundException(
                    "식당을 찾을 수 없습니다."
            );
        }

        LocalDateTime now =
                LocalDateTime.now();

        return promotionRepository
                .findByRestaurant_IdAndEnabledTrueAndStartAtLessThanEqualAndEndAtGreaterThanEqualOrderByEndAtAsc(
                        restaurantId,
                        now,
                        now
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PromotionResponse>
    getManagementPromotions(
            Long restaurantId,
            String ownerEmail
    ) {

        getOwnedRestaurant(
                restaurantId,
                ownerEmail
        );

        return promotionRepository
                .findByRestaurant_IdOrderByStartAtDesc(
                        restaurantId
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PromotionResponse updatePromotion(
            Long restaurantId,
            Long promotionId,
            PromotionUpdateRequest request,
            String ownerEmail
    ) {

        getOwnedRestaurant(
                restaurantId,
                ownerEmail
        );

        Promotion promotion =
                promotionRepository
                        .findByIdAndRestaurant_Id(
                                promotionId,
                                restaurantId
                        )
                        .orElseThrow(
                                () ->
                                        new PromotionNotFoundException(
                                                "프로모션을 찾을 수 없습니다."
                                        )
                        );

        validatePeriod(
                request.startAt(),
                request.endAt()
        );

        promotion.update(
                request.title(),
                request.description(),
                request.discountPercent(),
                request.startAt(),
                request.endAt(),
                request.enabled()
        );

        return toResponse(promotion);
    }

    @Transactional
    public void deletePromotion(
            Long restaurantId,
            Long promotionId,
            String ownerEmail
    ) {

        getOwnedRestaurant(
                restaurantId,
                ownerEmail
        );

        Promotion promotion =
                promotionRepository
                        .findByIdAndRestaurant_Id(
                                promotionId,
                                restaurantId
                        )
                        .orElseThrow(
                                () ->
                                        new PromotionNotFoundException(
                                                "프로모션을 찾을 수 없습니다."
                                        )
                        );

        promotionRepository.delete(promotion);
    }

    private Restaurant getOwnedRestaurant(
            Long restaurantId,
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

        if (!restaurant.getOwner()
                .getEmail()
                .equals(ownerEmail)) {

            throw new RestaurantAccessDeniedException(
                    "자신의 식당 프로모션만 관리할 수 있습니다."
            );
        }

        return restaurant;
    }

    private void validatePeriod(
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {

        if (!endAt.isAfter(startAt)) {
            throw new InvalidPromotionException(
                    "프로모션 종료 시간은 시작 시간보다 뒤여야 합니다."
            );
        }
    }

    private PromotionResponse toResponse(
            Promotion promotion
    ) {

        LocalDateTime now =
                LocalDateTime.now();

        return new PromotionResponse(
                promotion.getId(),
                promotion.getRestaurant().getId(),
                promotion.getTitle(),
                promotion.getDescription(),
                promotion.getDiscountPercent(),
                promotion.getStartAt(),
                promotion.getEndAt(),
                promotion.isEnabled(),
                promotion.isActive(now)
        );
    }
}