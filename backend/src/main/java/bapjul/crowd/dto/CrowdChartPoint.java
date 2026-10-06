package bapjul.crowd.dto;

import bapjul.crowd.domain.CrowdLevel;

import java.time.LocalDateTime;

public record CrowdChartPoint(

        LocalDateTime time,
        CrowdLevel level,
        String label,
        int score

) {
}