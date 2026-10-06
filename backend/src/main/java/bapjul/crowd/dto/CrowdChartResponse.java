package bapjul.crowd.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CrowdChartResponse(

        Long restaurantId,
        LocalDateTime start,
        LocalDateTime end,
        List<CrowdChartPoint> data

) {
}