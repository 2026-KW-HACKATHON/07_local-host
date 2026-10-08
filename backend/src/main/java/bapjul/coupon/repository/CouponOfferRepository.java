package bapjul.coupon.repository;
import org.springframework.data.repository.query.Param;
import bapjul.coupon.domain.CouponOffer;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface CouponOfferRepository extends JpaRepository<CouponOffer,Long> {
    List<CouponOffer> findByRestaurant_IdOrderByIdDesc(Long restaurantId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from CouponOffer c where c.id=:id")
    Optional<CouponOffer> lockById(@Param("id") Long id);
}
