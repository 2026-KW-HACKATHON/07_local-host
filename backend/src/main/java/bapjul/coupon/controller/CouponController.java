package bapjul.coupon.controller;
import bapjul.coupon.service.CouponService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
public class CouponController {
    private final CouponService coupons;
    public CouponController(CouponService coupons){this.coupons=coupons;}
    public record DownloadRequest(@NotBlank String requestId) {}
    @PostMapping("/api/restaurants/{id}/coupon-offers")
    public CouponService.OfferView issue(@PathVariable Long id,Authentication auth,@RequestBody CouponService.OfferRequest req){
        return coupons.issue(id,auth.getName(),req);
    }
    @GetMapping("/api/restaurants/{id}/coupon-offers")
    public List<CouponService.OfferView> active(@PathVariable Long id){return coupons.active(id);}
    @GetMapping("/api/restaurants/{id}/coupon-offers/manage")
    public List<CouponService.OfferView> manage(@PathVariable Long id,Authentication auth){return coupons.manage(id,auth.getName());}
    @DeleteMapping("/api/coupon-offers/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id,Authentication auth){coupons.cancel(id,auth.getName());return ResponseEntity.noContent().build();}
    @PostMapping("/api/coupon-offers/{id}/download")
    public CouponService.CouponView download(@PathVariable Long id,Authentication auth,@Valid @RequestBody DownloadRequest req){
        return coupons.download(id,auth.getName(),req.requestId());
    }
    @GetMapping("/api/coupons/me")
    public List<CouponService.CouponView> mine(Authentication auth){return coupons.mine(auth.getName());}
    @PostMapping("/api/coupons/{id}/use")
    public CouponService.CouponView use(@PathVariable Long id,Authentication auth){return coupons.use(id,auth.getName());}
}
