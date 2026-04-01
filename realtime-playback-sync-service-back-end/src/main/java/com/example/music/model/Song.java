package com.example.music.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "songs")
public class Song {

    @Id
    private String id;
    private String title;
    private String artist;
    private String album;
    private String genre;
    private int duration;
    private String streamUrl;
    private long uploadedAt;
    private boolean favorite;
    private String originalFilename;

    public Song() {}

    public Song(String id, String title, String streamUrl) {
        this.id = id;
        this.title = title;
        this.artist = "Unknown Artist";
        this.album = "Unknown Album";
        this.genre = "Unknown Genre";
        this.duration = 0;
        this.streamUrl = streamUrl;
        this.uploadedAt = System.currentTimeMillis();
        this.favorite = false;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }
    public String getAlbum() { return album; }
    public void setAlbum(String album) { this.album = album; }
    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }
    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }
    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }
    public long getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(long uploadedAt) { this.uploadedAt = uploadedAt; }
    public boolean isFavorite() { return favorite; }
    public void setFavorite(boolean favorite) { this.favorite = favorite; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
}
