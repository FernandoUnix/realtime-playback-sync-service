package com.example.music.controller;

import com.example.music.model.HistoryEntry;
import com.example.music.model.Song;
import com.example.music.service.MusicService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

@RestController
@RequestMapping("/music")
@CrossOrigin(origins = "*")
@Tag(name = "Music", description = "Song library, favorites, history, and metadata")
public class MusicController {

    private static final Logger log = LoggerFactory.getLogger(MusicController.class);
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("title", "uploadedAt", "duration", "artist", "album");

    @Autowired
    private MusicService musicService;

    @Operation(summary = "Upload an audio file and convert to HLS")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMusic(@RequestParam("file") MultipartFile file) {
        log.info("Upload: '{}' ({} bytes)", file.getOriginalFilename(), file.getSize());
        try {
            Song song = musicService.processUpload(file);
            return ResponseEntity.ok(song);
        } catch (Exception e) {
            log.error("Upload failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get a single song by ID")
    @GetMapping("/songs/{id}")
    public ResponseEntity<?> getSong(@PathVariable String id) {
        try {
            return ResponseEntity.ok(musicService.getSong(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Search songs — filter by search text, artist, album, genre, favorite; paginated and sortable")
    @GetMapping("/songs")
    public ResponseEntity<Page<Song>> getSongs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String artist,
            @RequestParam(required = false) String album,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) Boolean favorite,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "20")  int size,
            @RequestParam(defaultValue = "uploadedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        String safeSortBy = ALLOWED_SORT_FIELDS.contains(sortBy) ? sortBy : "uploadedAt";
        Sort sort = "asc".equalsIgnoreCase(sortDir)
                ? Sort.by(Sort.Direction.ASC, safeSortBy)
                : Sort.by(Sort.Direction.DESC, safeSortBy);
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), sort);
        return ResponseEntity.ok(musicService.getSongs(search, artist, album, genre, favorite, pageable));
    }

    @Operation(summary = "Get all distinct artists")
    @GetMapping("/artists")
    public ResponseEntity<List<String>> getArtists() {
        return ResponseEntity.ok(musicService.getArtists());
    }

    @Operation(summary = "Get all distinct albums")
    @GetMapping("/albums")
    public ResponseEntity<List<String>> getAlbums() {
        return ResponseEntity.ok(musicService.getAlbums());
    }

    @Operation(summary = "Get all distinct genres")
    @GetMapping("/genres")
    public ResponseEntity<List<String>> getGenres() {
        return ResponseEntity.ok(musicService.getGenres());
    }

    @Operation(summary = "Delete a song and all its files")
    @DeleteMapping("/songs/{id}")
    public ResponseEntity<?> deleteSong(@PathVariable String id) {
        try {
            musicService.deleteSong(id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Delete failed for song {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Toggle favorite on a song")
    @PutMapping("/songs/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable String id) {
        try {
            return ResponseEntity.ok(musicService.toggleFavorite(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get all favorited songs")
    @GetMapping("/favorites")
    public ResponseEntity<List<Song>> getFavorites() {
        return ResponseEntity.ok(musicService.getFavorites());
    }

    @Operation(summary = "Record a song play in history")
    @PostMapping("/history/{songId}")
    public ResponseEntity<Void> addToHistory(@PathVariable String songId) {
        musicService.addToHistory(songId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Get playback history (newest first, max 50)")
    @GetMapping("/history")
    public ResponseEntity<List<HistoryEntry>> getHistory() {
        return ResponseEntity.ok(musicService.getHistory());
    }

    @Operation(summary = "Download the original audio file")
    @GetMapping("/songs/{id}/download")
    public ResponseEntity<?> downloadSong(@PathVariable String id) {
        try {
            Song song = musicService.getSong(id);
            Path filePath = Paths.get("storage", id, song.getOriginalFilename()).toAbsolutePath();
            Resource resource = new FileSystemResource(filePath);
            if (!resource.exists()) return ResponseEntity.notFound().build();
            String filename = song.getOriginalFilename();
            log.info("Download requested: '{}'", filename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, "audio/mpeg")
                    .body(resource);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Service health check")
    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> status() {
        return ResponseEntity.ok(Map.of("status", "running"));
    }
}
