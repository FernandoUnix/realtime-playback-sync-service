package com.example.music.controller;

import com.example.music.config.JwtUtil;
import com.example.music.model.User;
import com.example.music.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
@Tag(name = "Auth", description = "Login and registration")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String rawPass  = body.getOrDefault("password", "").trim();
        String email    = body.getOrDefault("email", "").trim();
        if (username.isEmpty() || rawPass.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        if (userRepository.existsByUsername(username))
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already taken"));
        User user = new User(UUID.randomUUID().toString(), username, passwordEncoder.encode(rawPass), email);
        userRepository.save(user);
        String token = jwtUtil.generate(username);
        return ResponseEntity.ok(Map.of("token", token, "user", safeUser(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String rawPass  = body.getOrDefault("password", "").trim();
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null || !passwordEncoder.matches(rawPass, user.getPassword()))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        String token = jwtUtil.generate(username);
        return ResponseEntity.ok(Map.of("token", token, "user", safeUser(user)));
    }

    private Map<String, Object> safeUser(User u) {
        return Map.of("id", u.getId(), "username", u.getUsername(),
                      "email", u.getEmail() != null ? u.getEmail() : "");
    }
}
