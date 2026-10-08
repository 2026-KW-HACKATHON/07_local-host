package bapjul.verification;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="email_verification",uniqueConstraints=@UniqueConstraint(name="uk_email_verification_email",columnNames="email"))
public class EmailVerification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=100) private String email;
    @Column(name="code_hash",nullable=false,length=100) private String codeHash;
    @Column(name="sent_at",nullable=false) private Instant sentAt;
    @Column(name="expires_at",nullable=false) private Instant expiresAt;
    @Column(name="verified_at") private Instant verifiedAt;
    @Column(nullable=false) private int attempts;
    protected EmailVerification() {}
    public EmailVerification(String email,String codeHash,Instant now){
        this.email=email;renew(codeHash,now);
    }
    public void renew(String hash,Instant now){codeHash=hash;sentAt=now;expiresAt=now.plusSeconds(300);verifiedAt=null;attempts=0;}
    public Instant getSentAt(){return sentAt;}
    public void verify(String raw,org.springframework.security.crypto.password.PasswordEncoder encoder,Instant now){
        if(verifiedAt!=null) return;
        if(!now.isBefore(expiresAt) || attempts>=5) throw new IllegalArgumentException("인증번호가 만료되었거나 시도 횟수를 초과했습니다.");
        attempts++;
        if(!encoder.matches(raw,codeHash)) throw new IllegalArgumentException("인증번호가 올바르지 않습니다.");
        verifiedAt=now;
    }
    public boolean verified(Instant now){return verifiedAt!=null && now.isBefore(expiresAt);}
    public void consume(){verifiedAt=null;}
}
