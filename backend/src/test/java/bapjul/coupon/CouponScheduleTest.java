package bapjul.coupon;

import bapjul.coupon.service.CouponSchedule;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class CouponScheduleTest {
    @Test void midnightCrossingBelongsToStartDay() {
        String days=CouponSchedule.days(List.of(1));
        String windows=CouponSchedule.ranges(List.of("23:00-02:00"));
        assertTrue(CouponSchedule.allowed(Instant.parse("2026-10-05T15:00:00Z"),days,windows)); // Tue 00:00 KST
        assertTrue(CouponSchedule.allowed(Instant.parse("2026-10-05T16:59:59Z"),days,windows));
        assertFalse(CouponSchedule.allowed(Instant.parse("2026-10-05T17:00:00Z"),days,windows));
        assertFalse(CouponSchedule.allowed(Instant.parse("2026-10-06T15:00:00Z"),days,windows));
    }
    @Test void ordinarySlotEndExclusive() {
        String s=CouponSchedule.ranges(List.of("12:00-13:00"));
        assertTrue(CouponSchedule.allowed(Instant.parse("2026-10-08T03:00:00Z"),"",s));
        assertFalse(CouponSchedule.allowed(Instant.parse("2026-10-08T04:00:00Z"),"",s));
    }
    @Test void schedulesRejectBadValuesAndEndDateIsInclusive() {
        assertThrows(IllegalArgumentException.class,()->CouponSchedule.ranges(List.of("12:00-12:00")));
        assertThrows(IllegalArgumentException.class,()->CouponSchedule.days(List.of(0)));
        assertTrue(CouponSchedule.postOpen(LocalDate.of(2026,10,8),Instant.parse("2026-10-08T14:59:59Z")));
        assertFalse(CouponSchedule.postOpen(LocalDate.of(2026,10,8),Instant.parse("2026-10-08T15:00:00Z")));
    }
}
