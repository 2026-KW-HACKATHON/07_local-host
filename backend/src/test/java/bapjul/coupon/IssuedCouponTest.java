package bapjul.coupon;
import bapjul.coupon.domain.*;
import bapjul.restaurant.domain.Restaurant;
import bapjul.user.domain.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
class IssuedCouponTest {
    @Test void exactly72HoursAndCancelDoesNotRevokeExistingCoupon() {
        User owner=new User("owner@test", "hash", "점주",UserRole.OWNER);
        User customer=new User("customer@test", "hash", "손님",UserRole.CUSTOMER);
        Restaurant restaurant=new Restaurant("식당","주소",null,null,owner);
        CouponOffer offer=new CouponOffer(restaurant,2,"음료 서비스",1500,"1,2,3,4,5","12:00-15:00",null);
        Instant time=Instant.parse("2026-10-08T06:00:00Z");
        IssuedCoupon coupon=new IssuedCoupon(customer,offer,"retry-key1",time);
        offer.cancel();
        assertTrue(coupon.isActive(time.plusSeconds(72*3600-1)));
        assertFalse(coupon.isActive(time.plusSeconds(72*3600)));
        assertEquals("음료 서비스",coupon.getBenefit());
        assertEquals(1500,coupon.getCost());
    }
}
