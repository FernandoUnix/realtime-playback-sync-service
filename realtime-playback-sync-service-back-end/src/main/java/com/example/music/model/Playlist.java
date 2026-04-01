package com.example.music.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "playlists")
public class Playlist {

    @Id
    private String id;
    private String name;
    private long createdAt;

    @ElementCollection
    @CollectionTable(name = "playlist_songs", joinColumns = @JoinColumn(name = "playlist_id"))
    @OrderColumn(name = "position")
    @Column(name = "song_id")
    private List<String> songIds = new ArrayList<>();

    public Playlist() {}

    public Playlist(String id, String name) {
        this.id = id;
        this.name = name;
        this.createdAt = System.currentTimeMillis();
        this.songIds = new ArrayList<>();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
    public List<String> getSongIds() { return songIds; }
    public void setSongIds(List<String> songIds) { this.songIds = songIds; }
}
