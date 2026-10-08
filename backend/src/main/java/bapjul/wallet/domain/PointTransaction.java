package bapjul.wallet.domain;
import bapjul.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="point_transaction",uniqueConstraints=@UniqueConstraint(name="uk_point_tx_key",columnNames="idempotency_key"))
public class PointTransaction {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(name="idempotency_key",nullable=false,length=150) private String key;
    @Column(nullable=false) private long amount;
    @Column(name="balance_after",nullable=false) private long balanceAfter;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    protected PointTransaction() {}
    public PointTransaction(User user,String key,long amount,long balanceAfter,Instant createdAt) {
        this.user=user;this.key=key;this.amount=amount;this.balanceAfter=balanceAfter;this.createdAt=createdAt;
    }
    public Long getId(){return id;}
    public String getKey(){return key;}
    public long getAmount(){return amount;}
    public long getBalanceAfter(){return balanceAfter;}
    public Instant getCreatedAt(){return createdAt;}
}
