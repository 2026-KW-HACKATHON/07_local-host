package bapjul.location.api;

import bapjul.location.service.NearbyRestaurantService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class StayRecommendationController {
    private final NearbyRestaurantService service;
    public StayRecommendationController(NearbyRestaurantService service) { this.service = service; }

    @PostMapping("/api/v1/location/stays/recommendations")
    public ResponseEntity<NearbyResponse> recommend(@Valid @RequestBody StayRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.recommend(request));
    }

    @GetMapping("/health")
    public Map<String, String> health() { return Map.of("status", "ok"); }
}
