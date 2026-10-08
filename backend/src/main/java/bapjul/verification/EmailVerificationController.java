package bapjul.verification;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
@RestController @RequestMapping("/api/auth/email")
public class EmailVerificationController {
    private final EmailVerificationService service;
    public EmailVerificationController(EmailVerificationService service){this.service=service;}
    public record EmailRequest(String email){}
    public record ConfirmRequest(String email,String code){}
    @PostMapping("/send") public ResponseEntity<Void> send(@RequestBody EmailRequest req){service.send(req.email());return ResponseEntity.accepted().build();}
    @PostMapping("/verify") public ResponseEntity<Void> verify(@RequestBody ConfirmRequest req){service.verify(req.email(),req.code());return ResponseEntity.noContent().build();}
}
