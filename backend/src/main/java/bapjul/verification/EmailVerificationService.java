package bapjul.verification;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.SecureRandom;
import java.time.Instant;
@Service
public class EmailVerificationService {
    private static final SecureRandom RNG=new SecureRandom();
    private final EmailVerificationRepository records;
    private final PasswordEncoder encoder;
    private final ObjectProvider<JavaMailSender> sender;
    @Value("${bapjul.email.enabled:false}") private boolean enabled;
    @Value("${bapjul.email.from:}") private String from;
    public EmailVerificationService(EmailVerificationRepository records,PasswordEncoder encoder,ObjectProvider<JavaMailSender> sender){
        this.records=records;this.encoder=encoder;this.sender=sender;
    }
    private void enabled(){if(!enabled) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"SMTP 이메일 인증이 설정되지 않았습니다.");}
    private String canonical(String email){
        if(email==null || email.length()>100 || !email.matches("^[^ @]+@[^ @]+\\.[^ @]+$")) throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }
    @Transactional
    public void send(String rawEmail){
        enabled();String email=canonical(rawEmail);Instant now=Instant.now();
        EmailVerification item=records.lockByEmail(email).orElse(null);
        if(item!=null && now.isBefore(item.getSentAt().plusSeconds(60))) throw new IllegalArgumentException("1분 후 재전송할 수 있습니다.");
        String code=String.format("%06d",RNG.nextInt(1_000_000));String hash=encoder.encode(code);
        if(item==null) item=new EmailVerification(email,hash,now);else item.renew(hash,now);
        JavaMailSender mail=sender.getIfAvailable();
        if(mail==null || from.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"SMTP 발송 설정이 필요합니다.");
        SimpleMailMessage msg=new SimpleMailMessage();
        msg.setFrom(from);msg.setTo(email);msg.setSubject("[밥줄] 이메일 인증번호");
        msg.setText("인증번호: "+code+"\n유효기간: 5분");
        mail.send(msg);
        records.save(item);
    }
    @Transactional(noRollbackFor=IllegalArgumentException.class)
    public void verify(String rawEmail,String code){
        enabled();if(code==null || !code.matches("[0-9]{6}")) throw new IllegalArgumentException("6자리 인증번호를 입력해 주세요.");
        EmailVerification item=records.lockByEmail(canonical(rawEmail)).orElseThrow(()->new IllegalArgumentException("인증번호를 먼저 요청해 주세요."));
        item.verify(code,encoder,Instant.now());
    }
    @Transactional
    public void requireAndConsume(String rawEmail){
        if(!enabled) return;
        EmailVerification item=records.lockByEmail(canonical(rawEmail)).orElseThrow(()->new IllegalArgumentException("이메일 인증을 완료해 주세요."));
        if(!item.verified(Instant.now())) throw new IllegalArgumentException("이메일 인증을 완료해 주세요.");
        item.consume();
    }
}
