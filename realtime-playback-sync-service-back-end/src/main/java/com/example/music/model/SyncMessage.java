package com.example.music.model;

public class SyncMessage {
    private String action;    // PLAY, PAUSE, SEEK, STOP, LOAD
    private double position;
    private long timestamp;
    private String songId;    // used with LOAD action
    private String clientId;  // sender tab ID — receivers ignore messages from themselves

    public SyncMessage() {}

    public SyncMessage(String action, double position, long timestamp) {
        this.action = action;
        this.position = position;
        this.timestamp = timestamp;
    }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public double getPosition() { return position; }
    public void setPosition(double position) { this.position = position; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    public String getSongId() { return songId; }
    public void setSongId(String songId) { this.songId = songId; }
    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }
}
