package com.example.music.controller;

import com.example.music.model.User;
import com.example.music.repository.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "*")
@Tag(name = "Users", description = "User management")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(this::safeUser).collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(safeUser(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id,
                                    @RequestBody Map<String, String> body,
                                    Principal principal) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        // Only the user themselves can edit their own account
        if (!user.getUsername().equals(principal.getName()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You can only edit your own account"));

        String newUsername = body.get("username");
        String newEmail    = body.get("email");
        String newRawPass  = body.get("password");

        if (newUsername != null && !newUsername.trim().isEmpty()) {
            String trimmed = newUsername.trim();
            if (!trimmed.equals(user.getUsername()) && userRepository.existsByUsername(trimmed))
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already taken"));
            user.setUsername(trimmed);
        }
        if (newEmail != null) user.setEmail(newEmail.trim());
        if (newRawPass != null && !newRawPass.trim().isEmpty())
            user.setPassword(passwordEncoder.encode(newRawPass.trim()));

        userRepository.save(user);
        return ResponseEntity.ok(safeUser(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();
        if (!user.getUsername().equals(principal.getName()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> safeUser(User u) {
        return Map.of("id", u.getId(), "username", u.getUsername(),
                      "email", u.getEmail() != null ? u.getEmail() : "",
                      "createdAt", u.getCreatedAt());
    }
}
