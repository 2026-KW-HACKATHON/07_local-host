package bapjul.crowd.dto;

import bapjul.crowd.domain.CrowdLevel;

import java.time.LocalDateTime;

public record CrowdReportResponse(
        Long id,
        Long restaurantId,
        Long reporterId,
        CrowdLevel level,
        String label,
        LocalDateTime reportedAt
) {
}