package bapjul.coupon.domain;
import bapjul.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="issued_coupon", uniqueConstraints=@UniqueConstraint(name="uk_coupon_user_request",columnNames={"user_id","request_id"}),
    indexes={@Index(name="idx_coupon_user_offer",columnList="user_id,offer_id")})
public class IssuedCoupon {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="offer_id",nullable=false) private CouponOffer offer;
    @Column(name="request_id",nullable=false,length=80) private String requestId;
    @Column(nullable=false,length=300) private String benefit;
    @Column(nullable=false) private int cost;
    @Column(name="use_days",length=40) private String useDays;
    @Column(name="time_ranges",length=500) private String timeRanges;
    @Column(name="downloaded_at",nullable=false) private Instant downloadedAt;
    @Column(name="expires_at",nullable=false) private Instant expiresAt;
    @Column(name="used_at") private Instant usedAt;
    protected IssuedCoupon() {}
    public IssuedCoupon(User user,CouponOffer offer,String requestId,Instant now) {
        this.user=user;this.offer=offer;this.requestId=requestId;this.benefit=offer.getBenefit();this.cost=offer.getCost();
        this.useDays=offer.getUseDays();this.timeRanges=offer.getTimeRanges();this.downloadedAt=now;
        this.expiresAt=now.plusSeconds(72*3600);
    }
    public Long getId(){return id;} public User getUser(){return user;}
    public CouponOffer getOffer(){return offer;} public String getRequestId(){return requestId;}
    public String getBenefit(){return benefit;} public int getCost(){return cost;}
    public String getUseDays(){return useDays;} public String getTimeRanges(){return timeRanges;}
    public Instant getDownloadedAt(){return downloadedAt;} public Instant getExpiresAt(){return expiresAt;}
    public Instant getUsedAt(){return usedAt;} public void markUsed(Instant now){this.usedAt=now;}
    public boolean isActive(Instant now) {return usedAt==null && now.isBefore(expiresAt);}
}
