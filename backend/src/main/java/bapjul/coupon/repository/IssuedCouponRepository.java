package bapjul.coupon.repository;
import bapjul.coupon.domain.IssuedCoupon;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface IssuedCouponRepository extends JpaRepository<IssuedCoupon,Long> {
    Optional<IssuedCoupon> findByUser_IdAndRequestId(Long userId,String requestId);
    List<IssuedCoupon> findByUser_IdAndOffer_IdOrderByDownloadedAtDescIdDesc(Long userId,Long offerId);
    List<IssuedCoupon> findByUser_IdOrderByDownloadedAtDescIdDesc(Long userId);
}
