package bapjul.restaurant.domain;

import bapjul.user.domain.User;
import jakarta.persistence.*;

import java.time.LocalTime;

@Entity
@Table(name = "restaurant")
public class Restaurant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "opening_time")
    private LocalTime openingTime;

    @Column(name = "closing_time")
    private LocalTime closingTime;

    // Nullable for existing rows and older clients without geocoded coordinates.
    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "floor", length = 40)
    private String floor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    protected Restaurant() {
    }

    public Restaurant(
            String name,
            String address,
            LocalTime openingTime,
            LocalTime closingTime,
            User owner
    ) {
        this.name = name;
        this.address = address;
        this.openingTime = openingTime;
        this.closingTime = closingTime;
        this.owner = owner;
    }

    public void updateLocation(Double latitude, Double longitude, String floor) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("위도와 경도는 함께 제공해야 합니다.");
        }
        if (latitude != null && (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("위도 또는 경도의 범위가 올바르지 않습니다.");
        }
        this.latitude = latitude;
        this.longitude = longitude;
        this.floor = floor;
    }

    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getFloor() { return floor; }

    public void update(
            String name,
            String address,
            LocalTime openingTime,
            LocalTime closingTime
    ) {
        this.name = name;
        this.address = address;
        this.openingTime = openingTime;
        this.closingTime = closingTime;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public LocalTime getOpeningTime() {
        return openingTime;
    }

    public LocalTime getClosingTime() {
        return closingTime;
    }

    public User getOwner() {
        return owner;
    }
}