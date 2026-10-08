package bapjul.push;
import bapjul.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="device_push_token",uniqueConstraints=@UniqueConstraint(name="uk_device_token",columnNames="token"))
public class DeviceToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(nullable=false,length=255) private String token;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    protected DeviceToken() {}
    public DeviceToken(User user,String token){this.user=user;this.token=token;this.updatedAt=Instant.now();}
    public void transfer(User user){this.user=user;this.updatedAt=Instant.now();}
    public User getUser(){return user;}
}
