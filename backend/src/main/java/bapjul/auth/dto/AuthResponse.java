package bapjul.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        UserResponse user
) {
}