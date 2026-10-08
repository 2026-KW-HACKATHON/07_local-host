package bapjul.auth.dto;
import bapjul.user.domain.UserRole;
import jakarta.validation.constraints.*;
public record SignupRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min=8,max=50) String password,
    @NotBlank @Size(min=2,max=30) String nickname,
    @NotNull UserRole role,
    Boolean termsAgreed,Boolean privacyAgreed,Boolean marketingAgreed,
    String termsVersion,String privacyVersion
) {
    public SignupRequest(String email,String password,String nickname,UserRole role){
        this(email,password,nickname,role,null,null,null,null,null);
    }
}
