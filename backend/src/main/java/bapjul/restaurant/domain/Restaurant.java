package bapjul.restaurant.domain;

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

    @Column(name = "owner_id")
    private Long ownerId;

    protected Restaurant() {
    }

    public Restaurant(
            String name,
            String address,
            LocalTime openingTime,
            LocalTime closingTime,
            Long ownerId
    ) {
        this.name = name;
        this.address = address;
        this.openingTime = openingTime;
        this.closingTime = closingTime;
        this.ownerId = ownerId;
    }

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

    public Long getOwnerId() {
        return ownerId;
    }
}