package bapjul.security;

import bapjul.user.domain.User;
import bapjul.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter
        extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository
    ) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorization =
                request.getHeader("Authorization");

        if (authorization != null
                && authorization.startsWith("Bearer ")) {

            String token =
                    authorization.substring(7);

            if (jwtTokenProvider.validateToken(token)) {

                String email =
                        jwtTokenProvider.getEmail(token);

                userRepository.findByEmail(email)
                        .ifPresent(user -> {

                            SimpleGrantedAuthority authority =
                                    new SimpleGrantedAuthority(
                                            "ROLE_" +
                                            user.getRole().name()
                                    );

                            UsernamePasswordAuthenticationToken
                                    authentication =
                                    new UsernamePasswordAuthenticationToken(
                                            user.getEmail(),
                                            null,
                                            List.of(authority)
                                    );

                            SecurityContextHolder
                                    .getContext()
                                    .setAuthentication(authentication);
                        });
            }
        }

        filterChain.doFilter(request, response);
    }
}