package bapjul.crowd.dto;

import bapjul.crowd.domain.CrowdLevel;
import java.time.LocalDateTime;

/** Public feed contains display nickname, never email, password, or JWT details. */
public record CrowdReportItem(
        Long id,
        Long restaurantId,
        String restaurantName,
        String reporterNickname,
        CrowdLevel level,
        String label,
        LocalDateTime reportedAt
) {}
