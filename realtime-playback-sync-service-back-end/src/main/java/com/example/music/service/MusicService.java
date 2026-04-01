package com.example.music.service;

import com.example.music.model.HistoryEntry;
import com.example.music.model.Playlist;
import com.example.music.model.Song;
import com.example.music.repository.HistoryEntryRepository;
import com.example.music.repository.PlaylistRepository;
import com.example.music.repository.SongRepository;
import com.example.music.repository.SongSpecification;
import com.mpatric.mp3agic.ID3v1;
import com.mpatric.mp3agic.ID3v2;
import com.mpatric.mp3agic.Mp3File;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@Transactional
public class MusicService {

    private static final Logger log = LoggerFactory.getLogger(MusicService.class);
    private static final String STORAGE_DIR = "storage";

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Autowired private SongRepository songRepository;
    @Autowired private PlaylistRepository playlistRepository;
    @Autowired private HistoryEntryRepository historyEntryRepository;

    // ── Upload ────────────────────────────────────────────────────────────────

    public Song processUpload(MultipartFile file) throws IOException, InterruptedException {
        String id = UUID.randomUUID().toString();
        String originalFilename = file.getOriginalFilename();
        String title = originalFilename != null
                ? originalFilename.replaceAll("\\.[^.]+$", "") : id;

        Path songDir = Paths.get(STORAGE_DIR, id).toAbsolutePath();
        Files.createDirectories(songDir);
        log.info("Created song directory: {}", songDir);

        Path inputPath = songDir.resolve(originalFilename);
        Files.copy(file.getInputStream(), inputPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Saved uploaded file: {} ({} bytes)", inputPath, file.getSize());

        String streamUrl = "/" + id + "/stream.m3u8";
        Song song = new Song(id, title, streamUrl);
        song.setOriginalFilename(originalFilename);
        extractMetadata(song, inputPath);

        runFFmpeg(inputPath.toString(), songDir.toString());

        Song saved = songRepository.save(song);
        log.info("Song persisted: id='{}', title='{}', artist='{}'", id, saved.getTitle(), saved.getArtist());
        return saved;
    }

    // ── Metadata ──────────────────────────────────────────────────────────────

    private void extractMetadata(Song song, Path inputPath) {
        if (!inputPath.toString().toLowerCase().endsWith(".mp3")) return;
        try {
            Mp3File mp3 = new Mp3File(inputPath.toString());
            song.setDuration((int) mp3.getLengthInSeconds());
            if (mp3.hasId3v2Tag()) {
                ID3v2 tag = mp3.getId3v2Tag();
                if (notBlank(tag.getTitle()))            song.setTitle(tag.getTitle());
                if (notBlank(tag.getArtist()))           song.setArtist(tag.getArtist());
                if (notBlank(tag.getAlbum()))            song.setAlbum(tag.getAlbum());
                if (notBlank(tag.getGenreDescription())) song.setGenre(tag.getGenreDescription());
            } else if (mp3.hasId3v1Tag()) {
                ID3v1 tag = mp3.getId3v1Tag();
                if (notBlank(tag.getTitle()))  song.setTitle(tag.getTitle());
                if (notBlank(tag.getArtist())) song.setArtist(tag.getArtist());
                if (notBlank(tag.getAlbum()))  song.setAlbum(tag.getAlbum());
            }
        } catch (Exception e) {
            log.warn("Could not extract metadata from {}: {}", inputPath.getFileName(), e.getMessage());
        }
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }

    // ── Library queries ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Song getSong(String id) {
        return songRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Song not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<Song> getSongs(String search, String artist, String album, String genre, Boolean favorite, Pageable pageable) {
        return songRepository.findAll(
                SongSpecification.withFilters(search, artist, album, genre, favorite),
                pageable);
    }

    @Transactional(readOnly = true)
    public List<String> getArtists() { return songRepository.findDistinctArtists(); }

    @Transactional(readOnly = true)
    public List<String> getAlbums() { return songRepository.findDistinctAlbums(); }

    @Transactional(readOnly = true)
    public List<String> getGenres() { return songRepository.findDistinctGenres(); }

    // ── Delete ────────────────────────────────────────────────────────────────

    public void deleteSong(String id) {
        Song song = getSong(id);

        // Remove from all playlists
        playlistRepository.findAll().forEach(p -> {
            if (p.getSongIds().remove(id)) playlistRepository.save(p);
        });

        // Remove history entries for this song
        historyEntryRepository.deleteBySongId(id);

        // Delete song record
        songRepository.deleteById(id);

        // Delete storage directory (HLS segments + original file)
        Path songDir = Paths.get(STORAGE_DIR, id).toAbsolutePath();
        try {
            if (Files.exists(songDir)) {
                Files.walk(songDir)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
                log.info("Deleted storage directory: {}", songDir);
            }
        } catch (IOException e) {
            log.warn("Could not fully delete storage directory {}: {}", songDir, e.getMessage());
        }

        log.info("Song deleted: id='{}', title='{}'", id, song.getTitle());
    }

    // ── Favorites ─────────────────────────────────────────────────────────────

    public Song toggleFavorite(String songId) {
        Song song = getSong(songId);
        song.setFavorite(!song.isFavorite());
        Song saved = songRepository.save(song);
        log.info("Song '{}' favorite={}", saved.getTitle(), saved.isFavorite());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Song> getFavorites() {
        return songRepository.findByFavoriteTrueOrderByUploadedAtDesc();
    }

    // ── History ───────────────────────────────────────────────────────────────

    public void addToHistory(String songId) {
        songRepository.findById(songId).ifPresent(song -> {
            historyEntryRepository.save(new HistoryEntry(songId, song.getTitle(), song.getArtist()));
            log.debug("History updated: '{}' by '{}'", song.getTitle(), song.getArtist());
        });
    }

    @Transactional(readOnly = true)
    public List<HistoryEntry> getHistory() {
        return historyEntryRepository.findTop50ByOrderByPlayedAtDesc();
    }

    // ── Playlists ─────────────────────────────────────────────────────────────

    public Playlist createPlaylist(String name) {
        Playlist p = playlistRepository.save(new Playlist(UUID.randomUUID().toString(), name));
        log.info("Playlist created: '{}'", p.getName());
        return p;
    }

    public Playlist renamePlaylist(String id, String name) {
        Playlist p = playlistRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Playlist not found: " + id));
        p.setName(name);
        return playlistRepository.save(p);
    }

    public void deletePlaylist(String id) {
        if (!playlistRepository.existsById(id))
            throw new NoSuchElementException("Playlist not found: " + id);
        playlistRepository.deleteById(id);
        log.info("Playlist deleted: {}", id);
    }

    @Transactional(readOnly = true)
    public List<Playlist> getPlaylists() {
        return playlistRepository.findAllByOrderByCreatedAtDesc();
    }

    public Playlist addSongToPlaylist(String playlistId, String songId) {
        Playlist p = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new NoSuchElementException("Playlist not found: " + playlistId));
        if (!songRepository.existsById(songId))
            throw new NoSuchElementException("Song not found: " + songId);
        if (!p.getSongIds().contains(songId)) p.getSongIds().add(songId);
        return playlistRepository.save(p);
    }

    public Playlist removeSongFromPlaylist(String playlistId, String songId) {
        Playlist p = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new NoSuchElementException("Playlist not found: " + playlistId));
        p.getSongIds().remove(songId);
        return playlistRepository.save(p);
    }

    @Transactional(readOnly = true)
    public List<Song> getPlaylistSongs(String playlistId) {
        Playlist p = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new NoSuchElementException("Playlist not found: " + playlistId));
        return p.getSongIds().stream()
                .map(sid -> songRepository.findById(sid).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    // ── FFmpeg ────────────────────────────────────────────────────────────────

    private void runFFmpeg(String inputFilePath, String outputDir) throws IOException, InterruptedException {
        String outputM3u8 = outputDir + File.separator + "stream.m3u8";
        log.info("Starting FFmpeg: '{}' -> '{}'", inputFilePath, outputM3u8);
        log.info("Using FFmpeg executable: {}", ffmpegPath);

        ProcessBuilder pb = new ProcessBuilder(
            ffmpegPath, "-y", "-i", inputFilePath,
            "-c:a", "aac", "-b:a", "128k",
            "-start_number", "0", "-hls_time", "10",
            "-hls_list_size", "0", "-f", "hls", outputM3u8
        );
        pb.redirectErrorStream(true);
        pb.inheritIO();

        long start = System.currentTimeMillis();
        int exit = pb.start().waitFor();
        long elapsed = System.currentTimeMillis() - start;

        if (exit != 0) {
            log.error("FFmpeg failed (exit={}) after {}ms", exit, elapsed);
            throw new RuntimeException("FFmpeg process failed with exit code: " + exit);
        }
        log.info("FFmpeg completed in {}ms", elapsed);
    }
}
