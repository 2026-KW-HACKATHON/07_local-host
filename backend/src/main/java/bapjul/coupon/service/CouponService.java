package bapjul.coupon.service;
import bapjul.coupon.domain.*;
import bapjul.coupon.repository.*;
import bapjul.restaurant.domain.Restaurant;
import bapjul.restaurant.repository.RestaurantRepository;
import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import bapjul.wallet.domain.PointWallet;
import bapjul.wallet.service.WalletService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import org.springframework.http.HttpStatus;
import java.util.*;
@Service
public class CouponService {
    private final RestaurantRepository restaurants;
    private final UserRepository users;
    private final CouponOfferRepository offers;
    private final IssuedCouponRepository coupons;
    private final WalletService wallets;
    public CouponService(RestaurantRepository restaurants,UserRepository users,CouponOfferRepository offers,
                         IssuedCouponRepository coupons,WalletService wallets){
        this.restaurants=restaurants;this.users=users;this.offers=offers;this.coupons=coupons;this.wallets=wallets;
    }
    public record OfferRequest(int stage,String benefit,int cost,List<Integer> useDays,List<String> timeRanges,LocalDate endDate) {}
    public record OfferView(Long id,Long restaurantId,int stage,String benefit,int cost,List<Integer> useDays,
                            List<String> timeRanges,LocalDate endDate,boolean active,long version) {}
    public record CouponView(Long id,Long offerId,Long restaurantId,String benefit,int cost,List<Integer> useDays,
        List<String> timeRanges,Instant downloadedAt,Instant expiresAt,Instant usedAt,String status) {}
    private Restaurant own(Long restaurantId,String email) {
        Restaurant r=restaurants.findById(restaurantId).orElseThrow(()->new IllegalArgumentException("식당을 찾을 수 없습니다."));
        if(!r.getOwner().getEmail().equals(email)) throw new org.springframework.security.access.AccessDeniedException("본인 식당만 관리할 수 있습니다.");
        return r;
    }
    private static List<Integer> decodeDays(String s) {return s==null || s.isBlank()?List.of():Arrays.stream(s.split(",")).map(Integer::parseInt).toList();}
    private static List<String> decodeRanges(String s){return s==null || s.isBlank()?List.of():List.of(s.split(";"));}
    private OfferView view(CouponOffer o){return new OfferView(o.getId(),o.getRestaurant().getId(),o.getStage(),o.getBenefit(),o.getCost(),
        decodeDays(o.getUseDays()),decodeRanges(o.getTimeRanges()),o.getEndDate(),o.isActive(),o.getVersion());}
    private CouponView view(IssuedCoupon c,Instant now){
        String status=c.getUsedAt()!=null?"USED":!now.isBefore(c.getExpiresAt())?"EXPIRED":"ACTIVE";
        return new CouponView(c.getId(),c.getOffer().getId(),c.getOffer().getRestaurant().getId(),c.getBenefit(),c.getCost(),
            decodeDays(c.getUseDays()),decodeRanges(c.getTimeRanges()),c.getDownloadedAt(),c.getExpiresAt(),c.getUsedAt(),status);
    }
    @Transactional
    public OfferView issue(Long restaurantId,String email,OfferRequest req) {
        Restaurant r=own(restaurantId,email);
        if(req.stage()<1 || req.stage()>3) throw new IllegalArgumentException("발행 단계는 1~3입니다.");
        if(req.benefit()==null || req.benefit().isBlank() || req.benefit().length()>300) throw new IllegalArgumentException("혜택 문구는 1~300자입니다.");
        if(req.cost()<500 || req.cost()%500!=0) throw new IllegalArgumentException("비용은 최소 500P, 500P 단위입니다.");
        if(req.endDate()!=null && req.endDate().isBefore(LocalDate.now(ZoneId.of("Asia/Seoul"))))
            throw new IllegalArgumentException("게시 종료일은 과거일 수 없습니다.");
        CouponOffer o=new CouponOffer(r,req.stage(),req.benefit().trim(),req.cost(),
            CouponSchedule.days(req.useDays()),CouponSchedule.ranges(req.timeRanges()),req.endDate());
        return view(offers.save(o));
    }
    @Transactional(readOnly=true)
    public List<OfferView> active(Long restaurantId){
        if(!restaurants.existsById(restaurantId)) throw new IllegalArgumentException("식당을 찾을 수 없습니다.");
        Instant now=Instant.now();
        return offers.findByRestaurant_IdOrderByIdDesc(restaurantId).stream()
            .filter(o->o.isActive() && CouponSchedule.postOpen(o.getEndDate(),now)).map(this::view).toList();
    }
    @Transactional(readOnly=true)
    public List<OfferView> manage(Long restaurantId,String email){
        own(restaurantId,email);
        return offers.findByRestaurant_IdOrderByIdDesc(restaurantId).stream().map(this::view).toList();
    }
    @Transactional
    public void cancel(Long offerId,String email){
        CouponOffer o=offers.lockById(offerId).orElseThrow(()->new IllegalArgumentException("발행 정보를 찾을 수 없습니다."));
        own(o.getRestaurant().getId(),email);o.cancel();
    }
    @Transactional
    public CouponView download(Long offerId,String email,String requestId) {
        if(requestId==null || !requestId.matches("[A-Za-z0-9_-]{8,80}")) throw new IllegalArgumentException("requestId는 8~80자의 재시도 방지 키여야 합니다.");
        // User row lock serializes same-customer downloads and wallet updates.
        User user=wallets.lockedCustomer(email);
        PointWallet wallet=wallets.walletFor(user);
        Optional<IssuedCoupon> prior=coupons.findByUser_IdAndRequestId(user.getId(),requestId);
        if(prior.isPresent()) {
            if(!prior.get().getOffer().getId().equals(offerId)) throw new IllegalArgumentException("requestId는 다른 발행에 재사용할 수 없습니다.");
            return view(prior.get(),Instant.now());
        }
        CouponOffer offer=offers.lockById(offerId).orElseThrow(()->new IllegalArgumentException("발행 정보를 찾을 수 없습니다."));
        Instant now=Instant.now();
        if(!offer.isActive()) throw new CouponProblem("OFFER_CANCELLED","게시가 취소된 쿠폰입니다.",HttpStatus.CONFLICT);
        if(!CouponSchedule.postOpen(offer.getEndDate(),now)) throw new CouponProblem("OFFER_ENDED","게시가 종료되었습니다.",HttpStatus.CONFLICT);
        for(IssuedCoupon c:coupons.findByUser_IdAndOffer_IdOrderByDownloadedAtDescIdDesc(user.getId(),offerId)) {
            if(c.isActive(now)) return view(c,now);
        }
        if(wallet.getBalance()<offer.getCost()) throw new CouponProblem("INSUFFICIENT_POINTS","포인트 잔액이 부족합니다.",HttpStatus.CONFLICT);
        IssuedCoupon issued=coupons.saveAndFlush(new IssuedCoupon(user,offer,requestId,now));
        wallets.change(user,wallet,"DOWNLOAD:"+issued.getId(),-offer.getCost());
        return view(issued,now);
    }
    @Transactional(readOnly=true)
    public List<CouponView> mine(String email){
        User user=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        Instant now=Instant.now();
        return coupons.findByUser_IdOrderByDownloadedAtDescIdDesc(user.getId()).stream().map(c->view(c,now)).toList();
    }
    @Transactional
    public CouponView use(Long couponId,String email) {
        User user=wallets.lockedCustomer(email);
        IssuedCoupon coupon=coupons.findById(couponId).orElseThrow(()->new IllegalArgumentException("쿠폰을 찾을 수 없습니다."));
        if(!coupon.getUser().getId().equals(user.getId())) throw new org.springframework.security.access.AccessDeniedException("본인 쿠폰만 사용할 수 있습니다.");
        Instant now=Instant.now();
        if(coupon.getUsedAt()!=null) throw new CouponProblem("COUPON_USED","이미 사용한 쿠폰입니다.",HttpStatus.CONFLICT);
        if(!now.isBefore(coupon.getExpiresAt())) throw new CouponProblem("COUPON_EXPIRED","만료된 쿠폰입니다.",HttpStatus.CONFLICT);
        if(!CouponSchedule.allowed(now,coupon.getUseDays(),coupon.getTimeRanges())) throw new CouponProblem("OUTSIDE_USE_WINDOW","사용 가능한 요일 또는 시간이 아닙니다.",HttpStatus.CONFLICT);
        // Demo self-confirmation only. Merchant acceptance and payments are NOT verified.
        coupon.markUsed(now);
        return view(coupon,now);
    }
}
