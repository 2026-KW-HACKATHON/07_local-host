package bapjul.auth.dto;

import bapjul.user.domain.UserRole;

public record UserResponse(
        Long id,
        String email,
        String nickname,
        UserRole role
) {
}