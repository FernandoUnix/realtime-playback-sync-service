package com.example.music.controller;

import com.example.music.model.Song;
import com.example.music.service.MusicService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MusicControllerTest {

    @Mock
    private MusicService musicService;

    @InjectMocks
    private MusicController musicController;

    @Test
    void uploadMusic_shouldReturnSongOnSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.mp3", "audio/mpeg", "test".getBytes());
        Song song = new Song("abc-123", "test", "/abc-123/stream.m3u8");
        when(musicService.processUpload(file)).thenReturn(song);

        ResponseEntity<?> response = musicController.uploadMusic(file);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isInstanceOf(Song.class);
        assertThat(((Song) response.getBody()).getId()).isEqualTo("abc-123");
    }

    @Test
    void uploadMusic_shouldReturnErrorOnException() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.mp3", "audio/mpeg", "test".getBytes());
        when(musicService.processUpload(file)).thenThrow(new RuntimeException("FFmpeg not found"));

        ResponseEntity<?> response = musicController.uploadMusic(file);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isInstanceOf(Map.class);
        assertThat(((Map<?, ?>) response.getBody()).containsKey("error")).isTrue();
    }

    @Test
    void getSongs_shouldReturnPage() {
        List<Song> songs = List.of(new Song("1", "Song A", "/1/stream.m3u8"));
        Page<Song> page = new PageImpl<>(songs);
        when(musicService.getSongs(isNull(), isNull(), isNull(), isNull(), isNull(), any(Pageable.class))).thenReturn(page);

        ResponseEntity<Page<Song>> response = musicController.getSongs(null, null, null, null, null, 0, 20, "uploadedAt", "desc");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getContent()).hasSize(1);
    }

    @Test
    void getSongs_withSearch_shouldPassQueryToService() {
        when(musicService.getSongs(eq("rock"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(Page.empty());

        musicController.getSongs("rock", null, null, null, null, 0, 20, "uploadedAt", "desc");

        verify(musicService).getSongs(eq("rock"), isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void getSongs_withArtistFilter_shouldPassToService() {
        when(musicService.getSongs(isNull(), eq("Beatles"), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(Page.empty());

        musicController.getSongs(null, "Beatles", null, null, null, 0, 20, "uploadedAt", "desc");

        verify(musicService).getSongs(isNull(), eq("Beatles"), isNull(), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void status_shouldReturnRunning() {
        ResponseEntity<Map<String, String>> response = musicController.status();

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().get("status")).isEqualTo("running");
    }
}
