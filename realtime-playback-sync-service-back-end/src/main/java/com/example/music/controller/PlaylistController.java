package com.example.music.controller;

import com.example.music.model.Playlist;
import com.example.music.model.Song;
import com.example.music.service.MusicService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/playlists")
@CrossOrigin(origins = "*")
@Tag(name = "Playlists", description = "Create, edit and manage playlists")
public class PlaylistController {

    private static final Logger log = LoggerFactory.getLogger(PlaylistController.class);

    @Autowired
    private MusicService musicService;

    @Operation(summary = "Get all playlists")
    @GetMapping
    public ResponseEntity<List<Playlist>> getPlaylists() {
        return ResponseEntity.ok(musicService.getPlaylists());
    }

    @Operation(summary = "Create a new playlist")
    @PostMapping
    public ResponseEntity<Playlist> createPlaylist(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "New Playlist");
        return ResponseEntity.ok(musicService.createPlaylist(name));
    }

    @Operation(summary = "Rename a playlist")
    @PutMapping("/{id}")
    public ResponseEntity<?> renamePlaylist(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(musicService.renamePlaylist(id, body.getOrDefault("name", "")));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Delete a playlist")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlaylist(@PathVariable String id) {
        try {
            musicService.deletePlaylist(id);
            return ResponseEntity.ok().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get songs in a playlist")
    @GetMapping("/{id}/songs")
    public ResponseEntity<?> getPlaylistSongs(@PathVariable String id) {
        try {
            return ResponseEntity.ok(musicService.getPlaylistSongs(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Add a song to a playlist")
    @PostMapping("/{id}/songs/{songId}")
    public ResponseEntity<?> addSong(@PathVariable String id, @PathVariable String songId) {
        try {
            return ResponseEntity.ok(musicService.addSongToPlaylist(id, songId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Remove a song from a playlist")
    @DeleteMapping("/{id}/songs/{songId}")
    public ResponseEntity<?> removeSong(@PathVariable String id, @PathVariable String songId) {
        try {
            return ResponseEntity.ok(musicService.removeSongFromPlaylist(id, songId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
