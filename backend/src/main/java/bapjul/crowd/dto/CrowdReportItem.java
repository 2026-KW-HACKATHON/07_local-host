package bapjul.crowd.dto;
import bapjul.crowd.domain.CrowdLevel;
import java.time.LocalDateTime;
/** Public feed contains display nickname and optional note, never email or password. */
public record CrowdReportItem(Long id,Long restaurantId,String restaurantName,String reporterNickname,
        CrowdLevel level,String label,LocalDateTime reportedAt,String description) {
    public CrowdReportItem(Long id,Long restaurantId,String restaurantName,String reporterNickname,
                           CrowdLevel level,String label,LocalDateTime reportedAt){
        this(id,restaurantId,restaurantName,reporterNickname,level,label,reportedAt,null);
    }
}
