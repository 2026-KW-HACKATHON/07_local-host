package bapjul.promotion.domain;

import bapjul.restaurant.domain.Restaurant;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "promotion",
        indexes = {
                @Index(
                        name = "idx_promotion_restaurant",
                        columnList = "restaurant_id"
                )
        }
)
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "restaurant_id",
            nullable = false
    )
    private Restaurant restaurant;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(
            name = "discount_percent",
            nullable = false
    )
    private Integer discountPercent;

    @Column(
            name = "start_at",
            nullable = false
    )
    private LocalDateTime startAt;

    @Column(
            name = "end_at",
            nullable = false
    )
    private LocalDateTime endAt;

    @Column(nullable = false)
    private boolean enabled;

    protected Promotion() {
    }

    public Promotion(
            Restaurant restaurant,
            String title,
            String description,
            Integer discountPercent,
            LocalDateTime startAt,
            LocalDateTime endAt
    ) {
        this.restaurant = restaurant;
        this.title = title;
        this.description = description;
        this.discountPercent = discountPercent;
        this.startAt = startAt;
        this.endAt = endAt;
        this.enabled = true;
    }

    public void update(
            String title,
            String description,
            Integer discountPercent,
            LocalDateTime startAt,
            LocalDateTime endAt,
            boolean enabled
    ) {
        this.title = title;
        this.description = description;
        this.discountPercent = discountPercent;
        this.startAt = startAt;
        this.endAt = endAt;
        this.enabled = enabled;
    }

    public boolean isActive(LocalDateTime now) {
        return enabled
                && !now.isBefore(startAt)
                && !now.isAfter(endAt);
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public LocalDateTime getEndAt() {
        return endAt;
    }

    public boolean isEnabled() {
        return enabled;
    }
}