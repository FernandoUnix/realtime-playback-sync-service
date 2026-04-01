package com.example.music.model;

import jakarta.persistence.*;

@Entity
@Table(name = "history_entries")
public class HistoryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String songId;
    private String title;
    private String artist;
    private long playedAt;

    public HistoryEntry() {}

    public HistoryEntry(String songId, String title, String artist) {
        this.songId = songId;
        this.title = title;
        this.artist = artist;
        this.playedAt = System.currentTimeMillis();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSongId() { return songId; }
    public void setSongId(String songId) { this.songId = songId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public long getPlayedAt() { return playedAt; }
    public void setPlayedAt(long playedAt) { this.playedAt = playedAt; }
}
