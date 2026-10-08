package bapjul.push;
import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/push/devices")
public class DeviceTokenController {
    private final DeviceTokenRepository tokens;
    private final UserRepository users;
    public DeviceTokenController(DeviceTokenRepository tokens,UserRepository users){this.tokens=tokens;this.users=users;}
    public record Registration(String expoPushToken){}
    @PostMapping @Transactional
    public ResponseEntity<Void> register(Authentication auth,@RequestBody Registration req){
        if(req.expoPushToken()==null || !req.expoPushToken().matches("^(ExponentPushToken|ExpoPushToken)\\[[A-Za-z0-9_-]{10,220}\\]$"))
            throw new IllegalArgumentException("Expo Push Token 형식이 올바르지 않습니다.");
        User user=users.findByEmail(auth.getName()).orElseThrow(()->new IllegalArgumentException("계정을 찾을 수 없습니다."));
        DeviceToken token=tokens.findByToken(req.expoPushToken()).orElse(null);
        if(token==null) tokens.save(new DeviceToken(user,req.expoPushToken()));else token.transfer(user);
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping @Transactional
    public ResponseEntity<Void> unregister(Authentication auth,@RequestBody Registration req){
        tokens.findByToken(req.expoPushToken()).ifPresent(token->{
            if(!token.getUser().getEmail().equals(auth.getName())) throw new org.springframework.security.access.AccessDeniedException("본인 기기만 등록 해제할 수 있습니다.");
            tokens.delete(token);
        });
        return ResponseEntity.noContent().build();
    }
}
