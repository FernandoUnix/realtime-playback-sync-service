package com.example.music.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    // Base64-encoded 32-byte key (same as application.properties)
    private static final String SECRET =
            "bXVzaWNTdHJlYW1pbmdTZWNyZXRLZXkyMDI2U3VwZXJTZWN1cmVLZXlGb3JITU1BQ1NIQS0yNTY=";
    private static final long EXPIRY_MS = 86_400_000L;

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET, EXPIRY_MS);
    }

    @Test
    void generate_shouldReturnNonEmptyToken() {
        String token = jwtUtil.generate("alice");
        assertThat(token).isNotBlank();
    }

    @Test
    void extractUsername_shouldReturnSubjectFromToken() {
        String token = jwtUtil.generate("alice");
        assertThat(jwtUtil.extractUsername(token)).isEqualTo("alice");
    }

    @Test
    void validate_validToken_shouldReturnTrue() {
        String token = jwtUtil.generate("bob");
        assertThat(jwtUtil.validate(token)).isTrue();
    }

    @Test
    void validate_tamperedToken_shouldReturnFalse() {
        String token = jwtUtil.generate("carol") + "tampered";
        assertThat(jwtUtil.validate(token)).isFalse();
    }

    @Test
    void validate_emptyString_shouldReturnFalse() {
        assertThat(jwtUtil.validate("")).isFalse();
    }

    @Test
    void validate_expiredToken_shouldReturnFalse() {
        JwtUtil shortLived = new JwtUtil(SECRET, -1L); // expiry in the past
        String token = shortLived.generate("dave");
        assertThat(jwtUtil.validate(token)).isFalse();
    }
}
