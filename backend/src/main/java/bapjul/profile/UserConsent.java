package bapjul.profile;
import bapjul.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="user_consent",uniqueConstraints=@UniqueConstraint(name="uk_consent_user",columnNames="user_id"))
public class UserConsent {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
    @Column(nullable=false,length=30) private String termsVersion;
    @Column(nullable=false,length=30) private String privacyVersion;
    @Column(nullable=false) private boolean marketing;
    @Column(name="agreed_at",nullable=false) private Instant agreedAt;
    protected UserConsent() {}
    public UserConsent(User user,String termsVersion,String privacyVersion,boolean marketing){
        this.user=user;this.termsVersion=termsVersion;this.privacyVersion=privacyVersion;
        this.marketing=marketing;this.agreedAt=Instant.now();
    }
    public String getTermsVersion(){return termsVersion;} public String getPrivacyVersion(){return privacyVersion;}
    public boolean isMarketing(){return marketing;} public Instant getAgreedAt(){return agreedAt;}
    public void setMarketing(boolean m){this.marketing=m;}
}
