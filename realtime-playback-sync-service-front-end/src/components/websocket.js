import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const CLIENT_ID = Math.random().toString(36).slice(2, 10);
console.log('[WS] Tab CLIENT_ID:', CLIENT_ID);

let activeClient = null;
let connectionGen = 0;

export function connectWebSocket(onMessage, roomId = null, onConnected = null, onDisconnected = null, token = null) {
  const myGen = ++connectionGen;
  const topic = roomId ? `/topic/player/${roomId}` : '/topic/player';

  if (activeClient) {
    activeClient.deactivate();
    activeClient = null;
  }

  const connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const client = new Client({
    webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
    reconnectDelay: 5000,
    connectHeaders,

    onConnect: () => {
      if (connectionGen !== myGen) { console.warn('[WS] onConnect from stale connection, ignoring'); return; }
      console.log('[WS] ✓ Connected | topic:', topic);
      client.subscribe(topic, (frame) => {
        const msg = JSON.parse(frame.body);
        console.log('[WS] ← Received:', msg.action, '| from:', msg.clientId, '| me:', CLIENT_ID, '| echo?', msg.clientId === CLIENT_ID);
        onMessage(msg);
      });
      if (onConnected) onConnected();
    },

    onDisconnect: () => {
      if (connectionGen !== myGen) { console.log('[WS] onDisconnect from stale connection, ignoring'); return; }
      console.log('[WS] ✗ Disconnected');
      if (onDisconnected) onDisconnected();
    },

    onStompError: (frame) => {
      if (connectionGen !== myGen) return;
      console.error('[WS] STOMP error:', frame.headers?.message, frame);
      if (onDisconnected) onDisconnected();
    },
  });

  activeClient = client;
  client.activate();
}

export function sendSyncMessage(action, position, roomId = null, songId = null) {
  if (!activeClient?.connected) {
    console.warn('[WS] Cannot send — not connected. Action:', action);
    return;
  }
  const dest = roomId ? `/app/sync/${roomId}` : '/app/sync';
  const payload = { action, position, timestamp: Date.now(), clientId: CLIENT_ID };
  if (songId) payload.songId = songId;
  console.log('[WS] → Sending:', action, '| to:', dest, '| roomId:', roomId);
  activeClient.publish({ destination: dest, body: JSON.stringify(payload) });
}

export function disconnectWebSocket() {
  connectionGen++;
  if (activeClient) {
    console.log('[WS] Disconnecting...');
    activeClient.deactivate();
    activeClient = null;
  }
}
