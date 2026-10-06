package bapjul.promotion.controller;

import bapjul.promotion.dto.PromotionCreateRequest;
import bapjul.promotion.dto.PromotionResponse;
import bapjul.promotion.dto.PromotionUpdateRequest;
import bapjul.promotion.service.PromotionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants/{restaurantId}/promotions")
public class PromotionController {

    private final PromotionService promotionService;

    public PromotionController(
            PromotionService promotionService
    ) {
        this.promotionService = promotionService;
    }

    @PostMapping
    public PromotionResponse createPromotion(
            @PathVariable Long restaurantId,
            @Valid
            @RequestBody
            PromotionCreateRequest request,
            Authentication authentication
    ) {

        return promotionService.createPromotion(
                restaurantId,
                request,
                authentication.getName()
        );
    }

    @GetMapping
    public List<PromotionResponse>
    getActivePromotions(
            @PathVariable Long restaurantId
    ) {

        return promotionService
                .getActivePromotions(
                        restaurantId
                );
    }

    @GetMapping("/manage")
    public List<PromotionResponse>
    getManagementPromotions(
            @PathVariable Long restaurantId,
            Authentication authentication
    ) {

        return promotionService
                .getManagementPromotions(
                        restaurantId,
                        authentication.getName()
                );
    }

    @PutMapping("/{promotionId}")
    public PromotionResponse updatePromotion(
            @PathVariable Long restaurantId,
            @PathVariable Long promotionId,
            @Valid
            @RequestBody
            PromotionUpdateRequest request,
            Authentication authentication
    ) {

        return promotionService.updatePromotion(
                restaurantId,
                promotionId,
                request,
                authentication.getName()
        );
    }

    @DeleteMapping("/{promotionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePromotion(
            @PathVariable Long restaurantId,
            @PathVariable Long promotionId,
            Authentication authentication
    ) {

        promotionService.deletePromotion(
                restaurantId,
                promotionId,
                authentication.getName()
        );
    }
}