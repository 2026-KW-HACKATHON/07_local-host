package bapjul.auth.dto;
import bapjul.user.domain.UserRole;
public record UserResponse(Long id,String email,String nickname,UserRole role,String photoUrl){
    public UserResponse(Long id,String email,String nickname,UserRole role){this(id,email,nickname,role,null);}
}
