package bapjul.stay.proof;
import bapjul.user.domain.User;
import bapjul.restaurant.domain.Restaurant;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="stay_proof",uniqueConstraints=@UniqueConstraint(name="uk_stay_proof_token",columnNames="token"))
public class StayProof {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=36,unique=true) private String token;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="restaurant_id",nullable=false) private Restaurant restaurant;
    @Column(name="issued_at",nullable=false) private Instant issuedAt;
    @Column(name="expires_at",nullable=false) private Instant expiresAt;
    @Column(name="used_at") private Instant usedAt;
    protected StayProof(){}
    public StayProof(String token,User user,Restaurant restaurant,Instant now){
        this.token=token;this.user=user;this.restaurant=restaurant;this.issuedAt=now;this.expiresAt=now.plusSeconds(120);
    }
    public String getToken(){return token;} public User getUser(){return user;} public Restaurant getRestaurant(){return restaurant;}
    public Instant getExpiresAt(){return expiresAt;} public Instant getUsedAt(){return usedAt;}
    public void consume(Instant now){if(usedAt!=null || !now.isBefore(expiresAt)) throw new IllegalArgumentException("체류 증명이 사용되었거나 만료되었습니다."); usedAt=now;}
}
