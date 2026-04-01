package com.example.music.controller;

import com.example.music.model.Room;
import com.example.music.model.SyncMessage;
import com.example.music.repository.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.Set;

@Controller
public class SyncController {

    private static final Logger log = LoggerFactory.getLogger(SyncController.class);
    // Actions that are restricted to the room owner
    private static final Set<String> CONTROL_ACTIONS = Set.of("PLAY", "PAUSE", "SEEK", "STOP", "LOAD");

    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private RoomRepository roomRepository;

    @MessageMapping("/sync")
    public void syncPlayback(SyncMessage message) {
        log.info("Sync [global] action={} pos={} clientId={}", message.getAction(), message.getPosition(), message.getClientId());
        messagingTemplate.convertAndSend("/topic/player", message);
    }

    @MessageMapping("/sync/{roomId}")
    public void syncPlaybackRoom(SyncMessage message, @DestinationVariable String roomId,
                                 SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> attrs = headerAccessor.getSessionAttributes();
        String senderUsername = attrs != null ? (String) attrs.get("username") : null;

        if (CONTROL_ACTIONS.contains(message.getAction())) {
            Room room = roomRepository.findById(roomId).orElse(null);
            if (room == null) { log.warn("Sync to unknown room {}", roomId); return; }
            if (senderUsername == null || !senderUsername.equals(room.getCreatedBy())) {
                log.debug("Sync blocked: '{}' is not owner of room {} (owner='{}')",
                        senderUsername, roomId, room.getCreatedBy());
                return;
            }
        }

        log.info("Sync [room={}] action={} pos={} by={}", roomId, message.getAction(), message.getPosition(), senderUsername);
        messagingTemplate.convertAndSend("/topic/player/" + roomId, message);
    }
}
