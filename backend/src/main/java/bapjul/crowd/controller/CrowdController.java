package bapjul.crowd.controller;

import bapjul.crowd.dto.CrowdChartResponse;
import bapjul.crowd.dto.CrowdReportResponse;
import bapjul.crowd.dto.CrowdReportItem;
import org.springframework.data.domain.Page;
import bapjul.crowd.dto.CrowdStatusResponse;
import bapjul.crowd.dto.CrowdStatusUpdateRequest;
import bapjul.crowd.service.CrowdService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/restaurants")
@Validated
public class CrowdController {

    private final CrowdService crowdService;

    public CrowdController(
            CrowdService crowdService
    ) {
        this.crowdService = crowdService;
    }

    @PostMapping("/{restaurantId}/crowd")
    public CrowdReportResponse saveStatus(
            @PathVariable Long restaurantId,
            @Valid
            @RequestBody
            CrowdStatusUpdateRequest request,
            Authentication authentication
    ) {
        return crowdService.saveStatus(
                restaurantId,
                request,
                authentication.getName()
        );
    }

    @GetMapping("/{restaurantId}/crowd")
    public CrowdStatusResponse getCurrentStatus(
            @PathVariable Long restaurantId
    ) {
        return crowdService.getCurrentStatus(
                restaurantId
        );
    }

    @GetMapping("/{restaurantId}/crowd/reports")
    public Page<CrowdReportItem> getRestaurantReports(
            @PathVariable Long restaurantId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return crowdService.getRestaurantReports(restaurantId, page, size);
    }

    @GetMapping("/{restaurantId}/crowd/chart")
    public CrowdChartResponse getChart(
            @PathVariable Long restaurantId,
            @RequestParam(defaultValue = "12")
            @Min(1)
            @Max(168)
            int hours
    ) {
        return crowdService.getChart(
                restaurantId,
                hours
        );
    }
}