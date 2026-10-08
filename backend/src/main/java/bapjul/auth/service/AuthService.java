package bapjul.auth.service;

import bapjul.auth.dto.AuthResponse;
import bapjul.auth.dto.LoginRequest;
import bapjul.auth.dto.SignupRequest;
import bapjul.auth.dto.UserResponse;
import bapjul.auth.exception.DuplicateUserException;
import bapjul.auth.exception.InvalidCredentialsException;
import bapjul.security.JwtTokenProvider;
import bapjul.profile.UserConsent;
import bapjul.verification.EmailVerificationService;
import bapjul.profile.UserConsentRepository;
import org.springframework.beans.factory.annotation.Value;
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
    private final UserConsentRepository consents;
    private final EmailVerificationService emailVerification;
    @Value("${bapjul.consent.enforced:false}") private boolean consentEnforced;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,JwtTokenProvider jwtTokenProvider,UserConsentRepository consents,EmailVerificationService emailVerification
    ) {
        this.userRepository=userRepository;this.passwordEncoder=passwordEncoder;
        this.jwtTokenProvider=jwtTokenProvider;this.consents=consents;this.emailVerification=emailVerification;
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

        boolean provided=request.termsAgreed()!=null || request.privacyAgreed()!=null;
        if((consentEnforced || provided) && (!Boolean.TRUE.equals(request.termsAgreed()) || !Boolean.TRUE.equals(request.privacyAgreed())
            || request.termsVersion()==null || request.termsVersion().isBlank()
            || request.privacyVersion()==null || request.privacyVersion().isBlank()))
            throw new IllegalArgumentException("필수 약관 및 개인정보 처리 동의와 버전이 필요합니다.");
        if(request.termsVersion()!=null && request.termsVersion().length()>30) throw new IllegalArgumentException("약관 버전이 너무 깁니다.");
        if(request.privacyVersion()!=null && request.privacyVersion().length()>30) throw new IllegalArgumentException("개인정보 약관 버전이 너무 깁니다.");
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

        emailVerification.requireAndConsume(request.email());
        User saved =
                userRepository.save(user);

        if(provided || consentEnforced) consents.save(new UserConsent(saved,request.termsVersion(),request.privacyVersion(),
                Boolean.TRUE.equals(request.marketingAgreed())));
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
                user.getRole(),
                user.getPhotoKey()==null?null:"/api/auth/me/photo"
        );
    }
}