package bapjul.auth.controller;

import bapjul.auth.dto.AuthResponse;
import bapjul.auth.dto.LoginRequest;
import bapjul.auth.dto.SignupRequest;
import bapjul.auth.dto.UserResponse;
import bapjul.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(
            AuthService authService
    ) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public UserResponse signup(
            @Valid @RequestBody SignupRequest request
    ) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request
    ) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse getCurrentUser(
            Authentication authentication
    ) {
        return authService.getCurrentUser(
                authentication.getName()
        );
    }
}