package bapjul.owner;
import bapjul.crowd.domain.*;
import bapjul.crowd.dto.CrowdReportItem;
import bapjul.crowd.repository.CrowdSnapshotRepository;
import bapjul.crowd.service.CrowdService;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.repository.RestaurantRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
@RestController @Validated @RequestMapping("/api/restaurants/{restaurantId}/owner")
public class OwnerAnalyticsController {
    private final RestaurantRepository restaurants;
    private final CrowdSnapshotRepository snapshots;
    private final CrowdService crowdService;
    public OwnerAnalyticsController(RestaurantRepository restaurants,CrowdSnapshotRepository snapshots,CrowdService crowdService){
        this.restaurants=restaurants;this.snapshots=snapshots;this.crowdService=crowdService;
    }
    private Restaurant own(Long id,Authentication auth){
        Restaurant r=restaurants.findById(id).orElseThrow(()->new IllegalArgumentException("식당을 찾을 수 없습니다."));
        if(!r.getOwner().getEmail().equals(auth.getName())) throw new org.springframework.security.access.AccessDeniedException("본인 식당만 조회할 수 있습니다.");
        return r;
    }
    public record DayStats(LocalDate date,Map<CrowdLevel,Long> counts){}
    public record Analytics(Long restaurantId,int days,long total,Map<CrowdLevel,Long> totals,List<DayStats> daily){}
    @GetMapping("/analytics")
    public Analytics analytics(@PathVariable Long restaurantId,Authentication auth,
            @RequestParam(defaultValue="28") @Min(1) @Max(28) int days){
        own(restaurantId,auth);
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Seoul"));
        LocalDate from=today.minusDays(days-1);
        var entries=snapshots.findByRestaurant_IdAndObservedAtGreaterThanEqualOrderByObservedAtDescIdDesc(restaurantId,from.atStartOfDay());
        Map<CrowdLevel,Long> totals=new EnumMap<>(CrowdLevel.class);
        Map<LocalDate,Map<CrowdLevel,Long>> byDay=new TreeMap<>();
        for(CrowdSnapshot s:entries){
            LocalDate d=s.getObservedAt().toLocalDate();
            if(d.isAfter(today)) continue;
            totals.merge(s.getLevel(),1L,Long::sum);
            byDay.computeIfAbsent(d,k->new EnumMap<>(CrowdLevel.class)).merge(s.getLevel(),1L,Long::sum);
        }
        List<DayStats> series=new ArrayList<>();
        for(int i=0;i<days;i++){LocalDate d=from.plusDays(i);series.add(new DayStats(d,byDay.getOrDefault(d,Map.of())));}
        return new Analytics(restaurantId,days,totals.values().stream().mapToLong(Long::longValue).sum(),totals,series);
    }
    @GetMapping("/reports")
    public Page<CrowdReportItem> reports(@PathVariable Long restaurantId,Authentication auth,
            @RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(100) int size){
        own(restaurantId,auth);return crowdService.getRestaurantReports(restaurantId,page,size);
    }
}
