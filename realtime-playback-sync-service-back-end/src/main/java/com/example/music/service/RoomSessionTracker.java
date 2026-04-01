package com.example.music.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RoomSessionTracker {

    private static final Logger log = LoggerFactory.getLogger(RoomSessionTracker.class);
    private static final String PLAYER_TOPIC = "/topic/player";

    // sessionId -> { subscriptionId -> roomId }
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, String>> sessionSubs = new ConcurrentHashMap<>();
    // roomId -> Set of sessionIds  ("global" = the /topic/player topic)
    private final ConcurrentHashMap<String, Set<String>> roomSessions = new ConcurrentHashMap<>();

    private String extractRoomId(String destination) {
        if (destination == null) return null;
        if (PLAYER_TOPIC.equals(destination)) return "global";
        if (destination.startsWith(PLAYER_TOPIC + "/"))
            return destination.substring(PLAYER_TOPIC.length() + 1);
        return null;
    }

    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor h = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = h.getSessionId();
        String subId     = h.getSubscriptionId();
        String roomId    = extractRoomId(h.getDestination());
        if (sessionId == null || subId == null || roomId == null) return;

        sessionSubs.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>()).put(subId, roomId);
        roomSessions.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(sessionId);
        log.debug("Subscribe  session={} room='{}' sub={}", sessionId, roomId, subId);
    }

    @EventListener
    public void onUnsubscribe(SessionUnsubscribeEvent event) {
        StompHeaderAccessor h = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = h.getSessionId();
        String subId     = h.getSubscriptionId();
        if (sessionId == null || subId == null) return;

        ConcurrentHashMap<String, String> subs = sessionSubs.get(sessionId);
        if (subs == null) return;
        String roomId = subs.remove(subId);
        if (roomId != null) {
            Set<String> sessions = roomSessions.get(roomId);
            if (sessions != null) sessions.remove(sessionId);
            log.debug("Unsubscribe session={} room='{}' sub={}", sessionId, roomId, subId);
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        ConcurrentHashMap<String, String> subs = sessionSubs.remove(sessionId);
        if (subs == null) return;
        subs.values().forEach(roomId -> {
            Set<String> sessions = roomSessions.get(roomId);
            if (sessions != null) sessions.remove(sessionId);
        });
        log.debug("Disconnect session={} cleared from {} room(s)", sessionId, subs.size());
    }

    /** Returns a map of roomId -> listener count (only rooms with at least 1 listener). */
    public Map<String, Integer> getListenerCounts() {
        Map<String, Integer> counts = new HashMap<>();
        roomSessions.forEach((roomId, sessions) -> {
            int size = sessions.size();
            if (size > 0) counts.put(roomId, size);
        });
        return counts;
    }
}
