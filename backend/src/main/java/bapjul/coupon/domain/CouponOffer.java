package bapjul.coupon.domain;
import bapjul.restaurant.domain.Restaurant;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.data.repository.query.Param;

@Entity @Table(name="coupon_offer",indexes=@Index(name="idx_offer_restaurant",columnList="restaurant_id"))
public class CouponOffer {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="restaurant_id",nullable=false) private Restaurant restaurant;
    @Version private long version;
    @Column(nullable=false) private int stage;
    @Column(nullable=false,length=300) private String benefit;
    @Column(nullable=false) private int cost;
    @Column(name="use_days",length=40) private String useDays;
    @Column(name="time_ranges",length=500) private String timeRanges;
    @Column(name="end_date") private LocalDate endDate;
    @Column(nullable=false) private boolean active;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected CouponOffer() {}
    public CouponOffer(Restaurant restaurant,int stage,String benefit,int cost,String days,String ranges,LocalDate endDate){
        this.restaurant=restaurant;this.stage=stage;this.benefit=benefit;this.cost=cost;this.useDays=days;this.timeRanges=ranges;
        this.endDate=endDate;this.active=true;this.createdAt=Instant.now();
    }
    public Long getId(){return id;} public Restaurant getRestaurant(){return restaurant;}
    public long getVersion(){return version;} public int getStage(){return stage;}
    public String getBenefit(){return benefit;} public int getCost(){return cost;}
    public String getUseDays(){return useDays;} public String getTimeRanges(){return timeRanges;}
    public LocalDate getEndDate(){return endDate;} public boolean isActive(){return active;}
    public Instant getCreatedAt(){return createdAt;}
    public void cancel(){active=false;}
}
