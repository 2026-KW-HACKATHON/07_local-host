package bapjul.wallet.domain;
import bapjul.user.domain.User;
import jakarta.persistence.*;
@Entity @Table(name="point_wallet", uniqueConstraints=@UniqueConstraint(name="uk_point_wallet_user", columnNames="user_id"))
public class PointWallet {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(nullable=false) private long balance;
    protected PointWallet() {}
    public PointWallet(User user) { this.user=user; this.balance=0L; }
    public Long getId() {return id;}
    public long getBalance() {return balance;}
    public void add(long points) {
        if (points == 0 || (points < 0 && balance < -points) ||
            (points > 0 && balance > Long.MAX_VALUE - points)) throw new IllegalArgumentException("포인트 잔액 부족 또는 범위 오류");
        balance += points;
    }
}
