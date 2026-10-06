package bapjul.crowd.controller;

import bapjul.crowd.dto.CrowdChartResponse;
import bapjul.crowd.dto.CrowdStatusResponse;
import bapjul.crowd.dto.CrowdStatusUpdateRequest;
import bapjul.crowd.service.CrowdService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

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

    /*
     * 혼잡도 제보
     *
     * POST /api/restaurants/1/crowd
     */
    @PostMapping("/{restaurantId}/crowd")
    public CrowdStatusResponse saveStatus(

            @PathVariable
            Long restaurantId,

            @Valid
            @RequestBody
            CrowdStatusUpdateRequest request
    ) {

        return crowdService.saveStatus(
                restaurantId,
                request
        );
    }

    /*
     * 현재 혼잡도 조회
     *
     * GET /api/restaurants/1/crowd
     */
    @GetMapping("/{restaurantId}/crowd")
    public CrowdStatusResponse getCurrentStatus(

            @PathVariable
            Long restaurantId
    ) {

        return crowdService
                .getCurrentStatus(
                        restaurantId
                );
    }

    /*
     * 혼잡도 차트 조회
     *
     * GET /api/restaurants/1/crowd/chart?hours=12
     */
    @GetMapping("/{restaurantId}/crowd/chart")
    public CrowdChartResponse getChart(

            @PathVariable
            Long restaurantId,

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