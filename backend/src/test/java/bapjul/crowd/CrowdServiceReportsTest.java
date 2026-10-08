package bapjul.crowd;

import bapjul.crowd.domain.CrowdLevel;
import bapjul.crowd.domain.CrowdSnapshot;
import bapjul.crowd.repository.CrowdSnapshotRepository;
import bapjul.crowd.service.CrowdService;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.repository.RestaurantRepository;
import bapjul.user.domain.User;
import bapjul.user.domain.UserRole;
import bapjul.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CrowdServiceReportsTest {
    @Test
    void personalHistoryIsScopedToAuthenticatedUserId() {
        CrowdSnapshotRepository repo = mock(CrowdSnapshotRepository.class);
        RestaurantRepository restaurants = mock(RestaurantRepository.class);
        UserRepository users = mock(UserRepository.class);
        User reporter = new User("customer@example.test", "hash", "손님", UserRole.CUSTOMER);
        Restaurant shop = new Restaurant("식당", "주소", null, null,
                new User("owner@example.test", "hash", "점주", UserRole.OWNER));
        CrowdSnapshot snapshot = CrowdSnapshot.create(shop, reporter, CrowdLevel.AVAILABLE,
                LocalDateTime.of(2026, 10, 8, 12, 0));
        when(users.findByEmail("customer@example.test")).thenReturn(Optional.of(reporter));
        when(repo.findByReporter_IdOrderByObservedAtDescIdDesc(isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(snapshot)));
        CrowdService service = new CrowdService(repo, restaurants, users);

        var page = service.getMyReports("customer@example.test", 0, 20);
        assertEquals(1, page.getTotalElements());
        assertEquals("손님", page.getContent().get(0).reporterNickname());
        assertEquals("식당", page.getContent().get(0).restaurantName());
        verify(repo).findByReporter_IdOrderByObservedAtDescIdDesc(isNull(), any(Pageable.class));
    }
}
