package bapjul.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Public authentication routes. All other /api/auth endpoints require JWT.
                        .requestMatchers(HttpMethod.POST,"/api/auth/email/send","/api/auth/email/verify").permitAll()
                        .requestMatchers("/api/wallet/**","/api/coupons/**","/api/stay-proofs","/api/push/**").authenticated()
                        .requestMatchers(HttpMethod.POST,"/api/coupon-offers/*/download").hasRole("CUSTOMER")
                        .requestMatchers(HttpMethod.DELETE,"/api/coupon-offers/*").hasRole("OWNER")
                        .requestMatchers(HttpMethod.POST,"/api/restaurants/*/coupon-offers").hasRole("OWNER")
                        .requestMatchers("/api/coupon-offers/**").authenticated()
                        .requestMatchers(HttpMethod.GET,"/api/external/naver/places").authenticated()
                        .requestMatchers(HttpMethod.GET,"/api/restaurants/*/coupon-offers/manage").hasRole("OWNER")
                        .requestMatchers("/api/restaurants/*/owner/**").hasRole("OWNER")
                        // 회원가입 / 로그인
                        .requestMatchers(
                                "/api/auth/signup",
                                "/api/auth/login"
                        ).permitAll()
                        .requestMatchers("/api/auth/**").authenticated()

                        // 개인 제보 내역은 반드시 인증 후 조회
                        .requestMatchers(HttpMethod.GET, "/api/crowd/reports/me").authenticated()

                        // 내 정보
                        .requestMatchers(
                                "/api/auth/me"
                        ).authenticated()

                        // 프로모션 관리 조회
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/restaurants/*/promotions/manage"
                        ).hasRole("OWNER")

                        // 프로모션 생성
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/restaurants/*/promotions"
                        ).hasRole("OWNER")

                        // 프로모션 수정
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/restaurants/*/promotions/*"
                        ).hasRole("OWNER")

                        // 프로모션 삭제
                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/restaurants/*/promotions/*"
                        ).hasRole("OWNER")

                        // 혼잡도 제보
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/restaurants/*/crowd"
                        ).authenticated()

                        // 식당 / 혼잡도 / 프로모션 조회
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/restaurants/**"
                        ).permitAll()

                        // 식당 생성
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/restaurants"
                        ).hasRole("OWNER")

                        // 식당 수정
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/restaurants/**"
                        ).hasRole("OWNER")

                        .anyRequest().permitAll()
                )

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}