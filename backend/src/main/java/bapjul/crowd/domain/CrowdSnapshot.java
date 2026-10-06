package bapjul.crowd.domain;

import bapjul.restaurant.domain.Restaurant;
import bapjul.user.domain.User;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "restaurant_id",
            nullable = false
    )
    private Restaurant restaurant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "reporter_id",
            nullable = false
    )
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CrowdLevel level;

    @Column(
            name = "observed_at",
            nullable = false
    )
    private LocalDateTime observedAt;

    protected CrowdSnapshot() {
    }

    public CrowdSnapshot(
            Restaurant restaurant,
            User reporter,
            CrowdLevel level,
            LocalDateTime observedAt
    ) {
        this.restaurant = restaurant;
        this.reporter = reporter;
        this.level = level;
        this.observedAt = observedAt;
    }

    public static CrowdSnapshot create(
            Restaurant restaurant,
            User reporter,
            CrowdLevel level
    ) {
        return new CrowdSnapshot(
                restaurant,
                reporter,
                level,
                LocalDateTime.now()
        );
    }

    public Long getId() {
        return id;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public User getReporter() {
        return reporter;
    }

    public CrowdLevel getLevel() {
        return level;
    }

    public LocalDateTime getObservedAt() {
        return observedAt;
    }
}