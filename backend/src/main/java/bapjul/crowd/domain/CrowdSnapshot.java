package bapjul.crowd.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "crowd_snapshot",
        indexes = {
                @Index(
                        name = "idx_crowd_restaurant_time",
                        columnList = "restaurant_id, observed_at"
                )
        }
)
public class CrowdSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CrowdLevel level;

    @Column(name = "observed_at", nullable = false)
    private LocalDateTime observedAt;

    protected CrowdSnapshot() {
    }

    public CrowdSnapshot(
            Long restaurantId,
            CrowdLevel level,
            LocalDateTime observedAt
    ) {
        this.restaurantId = restaurantId;
        this.level = level;
        this.observedAt = observedAt;
    }

    public static CrowdSnapshot create(
            Long restaurantId,
            CrowdLevel level
    ) {
        return new CrowdSnapshot(
                restaurantId,
                level,
                LocalDateTime.now()
        );
    }

    public Long getId() {
        return id;
    }

    public Long getRestaurantId() {
        return restaurantId;
    }

    public CrowdLevel getLevel() {
        return level;
    }

    public LocalDateTime getObservedAt() {
        return observedAt;
    }
}