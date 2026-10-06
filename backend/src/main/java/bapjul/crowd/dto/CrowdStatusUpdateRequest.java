package bapjul.crowd.dto;

import bapjul.crowd.domain.CrowdLevel;
import jakarta.validation.constraints.NotNull;

public record CrowdStatusUpdateRequest(

        @NotNull
        CrowdLevel level

) {
}