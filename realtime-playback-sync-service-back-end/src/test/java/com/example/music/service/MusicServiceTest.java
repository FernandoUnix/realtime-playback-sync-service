package com.example.music.service;

import com.example.music.repository.HistoryEntryRepository;
import com.example.music.repository.PlaylistRepository;
import com.example.music.repository.SongRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class MusicServiceTest {

    @Mock private SongRepository songRepository;
    @Mock private PlaylistRepository playlistRepository;
    @Mock private HistoryEntryRepository historyEntryRepository;

    @InjectMocks
    private MusicService musicService;

    @Test
    void musicService_shouldBeCreated() {
        assertThat(musicService).isNotNull();
    }
}
