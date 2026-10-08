package bapjul.stay.proof;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
@RestController
public class StayProofController {
    private final StayProofService service;
    public StayProofController(StayProofService service){this.service=service;}
    @PostMapping("/api/stay-proofs")
    public ResponseEntity<StayProofService.ProofView> issue(Authentication auth,@RequestBody StayProofService.ProofRequest request){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.create(auth.getName(),request));
    }
}
