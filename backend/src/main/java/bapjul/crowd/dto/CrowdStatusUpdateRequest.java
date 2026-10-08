package bapjul.crowd.dto;
import bapjul.crowd.domain.CrowdLevel;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record CrowdStatusUpdateRequest(@NotNull CrowdLevel level,
    @Size(max=500) String description,String proofToken) {
    public CrowdStatusUpdateRequest(CrowdLevel level){this(level,null,null);}
}
