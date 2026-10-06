package bapjul.crowd.dto;

import bapjul.crowd.domain.CrowdLevel;

import java.time.LocalDateTime;

public record CrowdStatusResponse(

        Long restaurantId,
        CrowdLevel level,
        String label,
        int score,
        LocalDateTime updatedAt

) {
}