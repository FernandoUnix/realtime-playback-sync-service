package com.example.music.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) { this.jwtAuthFilter = jwtAuthFilter; }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Auth endpoints — always public
                .requestMatchers("/auth/**").permitAll()
                // Users — require auth (checked first so GET /** below doesn't override)
                .requestMatchers("/users/**").authenticated()
                // Room mutations require auth
                .requestMatchers(HttpMethod.POST, "/rooms").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/rooms/**").authenticated()
                // WebSocket handshake, Swagger, H2 console — public
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/api-docs/**", "/h2-console/**").permitAll()
                // All GET requests are public (covers /music/**, /rooms, /rooms/listeners,
                // and the static HLS files served at /{songId}/stream.m3u8 + /{songId}/*.ts)
                .requestMatchers(HttpMethod.GET, "/**").permitAll()
                // Everything else (PUT /music/songs/{id}/favorite etc.) — public too
                .requestMatchers("/music/**").permitAll()
                // Remaining mutations require auth
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        // Allow H2 console frames
        http.headers(h -> h.frameOptions(f -> f.sameOrigin()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
