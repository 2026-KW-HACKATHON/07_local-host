package bapjul.auth.service;

import bapjul.auth.dto.AuthResponse;
import bapjul.auth.dto.LoginRequest;
import bapjul.auth.dto.SignupRequest;
import bapjul.auth.dto.UserResponse;
import bapjul.auth.exception.DuplicateUserException;
import bapjul.auth.exception.InvalidCredentialsException;
import bapjul.security.JwtTokenProvider;
import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public UserResponse signup(
            SignupRequest request
    ) {

        if (userRepository.existsByEmail(request.email())) {
            throw new DuplicateUserException(
                    "이미 사용 중인 이메일입니다."
            );
        }

        if (userRepository.existsByNickname(
                request.nickname()
        )) {
            throw new DuplicateUserException(
                    "이미 사용 중인 닉네임입니다."
            );
        }

        String encodedPassword =
                passwordEncoder.encode(
                        request.password()
                );

        User user = new User(
                request.email(),
                encodedPassword,
                request.nickname(),
                request.role()
        );

        User saved =
                userRepository.save(user);

        return toUserResponse(saved);
    }

    public AuthResponse login(
            LoginRequest request
    ) {

        User user =
                userRepository.findByEmail(
                        request.email()
                ).orElseThrow(
                        () -> new InvalidCredentialsException(
                                "이메일 또는 비밀번호가 올바르지 않습니다."
                        )
                );

        if (!passwordEncoder.matches(
                request.password(),
                user.getPassword()
        )) {
            throw new InvalidCredentialsException(
                    "이메일 또는 비밀번호가 올바르지 않습니다."
            );
        }

        String token =
                jwtTokenProvider.createToken(user);

        return new AuthResponse(
                token,
                "Bearer",
                toUserResponse(user)
        );
    }

    public UserResponse getCurrentUser(
            String email
    ) {

        User user =
                userRepository.findByEmail(email)
                        .orElseThrow(
                                () -> new InvalidCredentialsException(
                                        "사용자를 찾을 수 없습니다."
                                )
                        );

        return toUserResponse(user);
    }

    private UserResponse toUserResponse(
            User user
    ) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole()
        );
    }
}