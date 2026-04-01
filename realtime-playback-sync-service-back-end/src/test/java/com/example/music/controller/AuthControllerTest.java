package com.example.music.controller;

import com.example.music.config.JwtUtil;
import com.example.music.model.User;
import com.example.music.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;

    @InjectMocks
    private AuthController authController;

    @Test
    void register_validCredentials_shouldReturnTokenAndUser() {
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtil.generate(anyString())).thenReturn("mock-token");

        ResponseEntity<?> response = authController.register(
                Map.of("username", "alice", "password", "secret", "email", "a@b.com"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body).containsKey("token");
        assertThat(body).containsKey("user");
    }

    @Test
    void register_missingUsername_shouldReturnBadRequest() {
        ResponseEntity<?> response = authController.register(
                Map.of("username", "", "password", "secret"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void register_duplicateUsername_shouldReturnConflict() {
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        ResponseEntity<?> response = authController.register(
                Map.of("username", "alice", "password", "secret"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void login_validCredentials_shouldReturnToken() {
        User user = new User("id-1", "alice", "hashed", "a@b.com");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "hashed")).thenReturn(true);
        when(jwtUtil.generate(anyString())).thenReturn("mock-token");

        ResponseEntity<?> response = authController.login(
                Map.of("username", "alice", "password", "secret"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertThat(body.get("token")).isEqualTo("mock-token");
    }

    @Test
    void login_unknownUser_shouldReturnUnauthorized() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        ResponseEntity<?> response = authController.login(
                Map.of("username", "unknown", "password", "pass"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_wrongCredentials_shouldReturnUnauthorized() {
        User user = new User("id-1", "alice", "hashed", "a@b.com");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        ResponseEntity<?> response = authController.login(
                Map.of("username", "alice", "password", "wrong"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
