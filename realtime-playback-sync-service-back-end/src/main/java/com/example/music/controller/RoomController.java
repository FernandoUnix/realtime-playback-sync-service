package com.example.music.controller;

import com.example.music.model.Room;
import com.example.music.repository.RoomRepository;
import com.example.music.service.RoomSessionTracker;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/rooms")
@CrossOrigin(origins = "*")
@Tag(name = "Rooms", description = "Sync room management")
public class RoomController {

    private static final Logger log = LoggerFactory.getLogger(RoomController.class);

    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomSessionTracker roomSessionTracker;

    @Operation(summary = "List all rooms")
    @GetMapping
    public ResponseEntity<List<Room>> list() {
        return ResponseEntity.ok(roomRepository.findAllByOrderByCreatedAtDesc());
    }

    @Operation(summary = "Create a room (auth required)")
    @PostMapping
    public ResponseEntity<Room> create(@RequestBody Map<String, String> body, Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String name = body.getOrDefault("name", "").trim();
        if (name.isEmpty()) name = "Room";
        Room room = roomRepository.save(new Room(UUID.randomUUID().toString(), name, principal.getName()));
        log.info("Room created: '{}' ({}) by '{}'", room.getName(), room.getId(), room.getCreatedBy());
        return ResponseEntity.ok(room);
    }

    @Operation(summary = "Get live listener counts")
    @GetMapping("/listeners")
    public ResponseEntity<Map<String, Integer>> listeners() {
        return ResponseEntity.ok(roomSessionTracker.getListenerCounts());
    }

    @Operation(summary = "Delete a room (owner only)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        Room room = roomRepository.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!room.getCreatedBy().equals(principal.getName()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        roomRepository.deleteById(id);
        log.info("Room deleted: {} by '{}'", id, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
