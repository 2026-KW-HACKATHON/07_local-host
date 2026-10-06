package bapjul.auth.dto;

import bapjul.user.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SignupRequest(

        @NotBlank
        @Email
        String email,

        @NotBlank
        @Size(min = 8, max = 50)
        String password,

        @NotBlank
        @Size(min = 2, max = 30)
        String nickname,

        @NotNull
        UserRole role
) {
}