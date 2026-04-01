package com.example.music.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id private String id;
    @Column(unique = true, nullable = false) private String username;
    @Column(nullable = false) private String encodedPass;
    private String email;
    private long createdAt;

    public User() {}
    public User(String id, String username, String encodedPass, String email) {
        this.id = id;
        this.username = username;
        this.encodedPass = encodedPass;
        this.email = email;
        this.createdAt = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return encodedPass; }
    public void setPassword(String encodedPass) { this.encodedPass = encodedPass; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
}
