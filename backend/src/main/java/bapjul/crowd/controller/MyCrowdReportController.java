package bapjul.crowd.controller;

import bapjul.crowd.dto.CrowdReportItem;
import bapjul.crowd.service.CrowdService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/crowd/reports")
@Validated
public class MyCrowdReportController {
    private final CrowdService crowdService;
    public MyCrowdReportController(CrowdService crowdService) { this.crowdService = crowdService; }

    @GetMapping("/me")
    public Page<CrowdReportItem> getMyReports(Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return crowdService.getMyReports(authentication.getName(), page, size);
    }
}
