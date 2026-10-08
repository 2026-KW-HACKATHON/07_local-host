package bapjul.profile;
import bapjul.auth.dto.UserResponse;
import org.springframework.security.core.Authentication;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/auth/me")
public class ProfileController {
    private final ProfileService profiles;
    public ProfileController(ProfileService profiles){this.profiles=profiles;}
    public record NicknameRequest(String nickname){}
    public record MarketingRequest(boolean marketing){}
    @PatchMapping("/nickname") public UserResponse nickname(Authentication auth,@RequestBody NicknameRequest request){
        return profiles.nickname(auth.getName(),request.nickname());
    }
    @PostMapping(value="/photo",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse photoUpload(Authentication auth,@RequestParam("file") MultipartFile file){return profiles.upload(auth.getName(),file);}
    @GetMapping("/photo") public ResponseEntity<byte[]> photo(Authentication auth){return profiles.photo(auth.getName());}
    @GetMapping("/consents") public ProfileService.ConsentView consents(Authentication auth){return profiles.consent(auth.getName());}
    @PatchMapping("/consents/marketing") public ProfileService.ConsentView marketing(Authentication auth,@RequestBody MarketingRequest req){
        return profiles.marketing(auth.getName(),req.marketing());
    }
}
