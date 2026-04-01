package com.example.music.controller;

import com.example.music.model.Room;
import com.example.music.model.SyncMessage;
import com.example.music.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SyncControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private SimpMessageHeaderAccessor headerAccessor;

    @InjectMocks
    private SyncController syncController;

    private SyncMessage testMessage;

    @BeforeEach
    void setUp() {
        testMessage = new SyncMessage("PLAY", 0.0, System.currentTimeMillis());
    }

    @Test
    void syncPlayback_shouldBroadcastToPlayerTopic() {
        syncController.syncPlayback(testMessage);
        verify(messagingTemplate).convertAndSend("/topic/player", testMessage);
    }

    @Test
    void syncPlaybackRoom_ownerShouldBroadcastToRoomTopic() {
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("username", "alice");
        when(headerAccessor.getSessionAttributes()).thenReturn(attrs);
        Room room = new Room("room1", "Test Room", "alice");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));

        syncController.syncPlaybackRoom(testMessage, "room1", headerAccessor);

        verify(messagingTemplate).convertAndSend("/topic/player/room1", testMessage);
    }

    @Test
    void syncPlaybackRoom_nonOwnerShouldBeBlocked() {
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("username", "bob");
        when(headerAccessor.getSessionAttributes()).thenReturn(attrs);
        Room room = new Room("room1", "Test Room", "alice");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));

        syncController.syncPlaybackRoom(testMessage, "room1", headerAccessor);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void syncPlaybackRoom_unauthenticatedShouldBeBlocked() {
        Map<String, Object> attrs = new HashMap<>();
        when(headerAccessor.getSessionAttributes()).thenReturn(attrs);
        Room room = new Room("room1", "Test Room", "alice");
        when(roomRepository.findById("room1")).thenReturn(Optional.of(room));

        syncController.syncPlaybackRoom(testMessage, "room1", headerAccessor);

        verify(messagingTemplate, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void syncPlayback_withPauseAction_shouldBroadcast() {
        SyncMessage pauseMsg = new SyncMessage("PAUSE", 30.5, System.currentTimeMillis());
        syncController.syncPlayback(pauseMsg);
        verify(messagingTemplate).convertAndSend("/topic/player", pauseMsg);
    }

    @Test
    void syncPlayback_withSeekAction_shouldBroadcast() {
        SyncMessage seekMsg = new SyncMessage("SEEK", 120.0, System.currentTimeMillis());
        syncController.syncPlayback(seekMsg);
        verify(messagingTemplate).convertAndSend("/topic/player", seekMsg);
    }
}
