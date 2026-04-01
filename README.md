# Wavesync

A full-stack real-time music streaming app. Upload audio, stream it via HLS, and synchronize playback across multiple browser clients in shared rooms — with user authentication, ownership controls, and a premium dark-mode UI.

---

## Features

- **HLS Streaming** — Audio is converted by FFmpeg into `.m3u8` + `.ts` segments and streamed via hls.js
- **Real-Time Sync** — PLAY / PAUSE / SEEK events broadcast over STOMP WebSocket to all room members
- **Multi-Room Support** — Isolated sync groups; each room has an owner who controls playback
- **Room Ownership** — Only the room creator can play, pause, seek, or load tracks; others are listeners
- **User Authentication** — JWT-based auth (HMAC-SHA256); register, sign in, edit your profile
- **Drift Correction** — Timestamp-based delay compensation on PLAY; periodic resync every 5 s
- **Late-Join Sync** — Clients that join a playing room auto-load the current track and seek to the right position
- **Premium UI** — Tailwind CSS dark-mode redesign: glassmorphism player dock, animated disc, equalizer bars
- **Docker Support** — Single `docker compose up --build` starts both services with persistent volumes

---

## Prerequisites

### Local development

| Tool | Version |
|------|---------|
| Java | 24+ |
| Maven | 3.9+ |
| Node.js | 18+ |
| FFmpeg | Any recent, on `PATH` |

### Docker (recommended)

| Tool | Notes |
|------|-------|
| Docker Desktop | 4.x+ with Compose v2 |

FFmpeg is installed automatically inside the backend container — no local FFmpeg needed when using Docker.

---

## Quick Start — Docker

```bash
# From the project root
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |

Data is persisted in three named Docker volumes (`music-storage`, `music-data`, `music-logs`) and survives container restarts.

---

## Quick Start — Local

### 1. Backend

```bash
cd realtime-playback-sync-service-back-end
mvn spring-boot:run
```

Server starts on **http://localhost:8080**.

### 2. Frontend

```bash
cd realtime-playback-sync-service-front-end
npm install
npm start
```

App opens at **http://localhost:3000**.

---

## Project Structure

```
realtime-playback-sync-service/
├── docker-compose.yml
├── realtime-playback-sync-service-back-end/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── pom.xml
│   └── src/main/java/com/example/music/
│       ├── config/
│       │   ├── CorsConfig.java
│       │   ├── JwtAuthFilter.java
│       │   ├── JwtUtil.java
│       │   ├── SecurityConfig.java
│       │   ├── WebSocketAuthChannelInterceptor.java
│       │   └── WebSocketConfig.java
│       ├── controller/
│       │   ├── AuthController.java
│       │   ├── MusicController.java
│       │   ├── RoomController.java
│       │   ├── SyncController.java
│       │   └── UserController.java
│       ├── model/
│       │   ├── Room.java
│       │   ├── SyncMessage.java
│       │   └── User.java
│       ├── repository/
│       │   ├── RoomRepository.java
│       │   └── UserRepository.java
│       └── service/
│           └── MusicService.java
└── realtime-playback-sync-service-front-end/
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── index.css
        ├── index.js
        ├── App.js
        └── components/
            ├── LoginPage.js
            ├── Player.js
            ├── Rooms.js
            ├── SongLibrary.js
            ├── Upload.js
            ├── UserManagement.js
            └── websocket.js
```

---

## Authentication

Authentication is JWT-based. Tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>` on REST calls and in STOMP CONNECT headers.

### Guest access
Browsing the song library and listening to music is available without an account.

### Authenticated actions

| Action | Requirement |
|--------|-------------|
| Create a room | Logged in |
| Delete a room | Room owner only |
| Play / Pause / Seek / Load in a room | Room owner only |
| Edit user profile | Own account only |

---

## Usage

### Register / Sign In
Click **Sign In** in the top-right corner. Use the **Create Account** tab to register, or sign in with an existing account. You can also click **Continue as guest** to browse without an account.

### Upload a Track
Expand the **Upload** section, drag & drop an audio file (or click to browse), then click **Upload**. FFmpeg converts it to HLS in the background.

### Create a Room
Sign in first, then open the **Rooms** panel and click **+ New Room**. You become the owner.

### Join a Room
Click **Join** on any listed room. If you are not the owner, playback is controlled by the owner. A banner will appear if no music is playing yet.

### Sync Playback
The owner presses Play in the player. All listeners in the room receive the event and start playing at the same position (adjusted for network latency).

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | — | Create account. Body: `{ username, password, email }` |
| `POST` | `/auth/login` | — | Sign in. Returns `{ token, user }` |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | Bearer | List all users |
| `PUT` | `/users/{id}` | Bearer (own) | Update username / email / password |
| `DELETE` | `/users/{id}` | Bearer (own) | Delete account |

### Music

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/music/upload` | — | Upload audio file. Returns `{ id, streamUrl, name }` |
| `GET` | `/music/songs` | — | List all songs |
| `DELETE` | `/music/songs/{id}` | — | Delete a song and its HLS segments |
| `GET` | `/music/status` | — | Health check |
| `GET` | `/{id}/stream.m3u8` | — | HLS playlist |
| `GET` | `/{id}/*.ts` | — | HLS segments |

### Rooms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/rooms` | — | List all rooms |
| `POST` | `/rooms` | Bearer | Create a room |
| `DELETE` | `/rooms/{id}` | Bearer (owner) | Delete a room |

### WebSocket (STOMP over SockJS)

Connect: `http://localhost:8080/ws`
Auth: pass `Authorization: Bearer <token>` in STOMP CONNECT headers (required for control actions).

| Destination | Direction | Description |
|-------------|-----------|-------------|
| `/app/sync/{roomId}` | Client → Server | Send a sync event to a room |
| `/topic/player/{roomId}` | Server → Client | Receive sync events for a room |

#### SyncMessage payload

```json
{
  "action": "PLAY",
  "position": 42.5,
  "timestamp": 1711900000000,
  "songId": "abc123",
  "clientId": "tab-uuid"
}
```

| Field | Type | Values |
|-------|------|--------|
| `action` | `string` | `PLAY`, `PAUSE`, `SEEK`, `STOP`, `LOAD` |
| `position` | `number` | Audio position in seconds |
| `timestamp` | `number` | `Date.now()` at send time |
| `songId` | `string` | ID of the track being controlled |
| `clientId` | `string` | Per-tab UUID (echo suppression) |

---

## Sync Algorithm

### Delay compensation (PLAY)

```
delay    = (Date.now() - message.timestamp) / 1000
position = message.position + delay
audio.currentTime = position
audio.play()
```

### Drift correction

Every 5 seconds the owner re-broadcasts its current position as a `PLAY` event. Late-joining clients or drifted tabs re-align automatically.

### Late-join

When a tab joins a room mid-song, the next resync broadcast includes `songId`. The new client loads the track then seeks to the correct position once the HLS manifest is ready.

---

## Configuration

Key properties in `application.properties` (backend):

```properties
server.port=8080
spring.web.resources.static-locations=file:storage/
spring.servlet.multipart.max-file-size=200MB
spring.servlet.multipart.max-request-size=200MB
jwt.expiration-ms=86400000
```

> **JWT secret** — set `jwt.secret` to a base64-encoded 256-bit random value. Do not commit the actual value to version control.

To change the port, update `server.port` and the `http://localhost:8080` references in the frontend source files.

---

## Running Tests

```bash
cd realtime-playback-sync-service-back-end
mvn test
```

| Class | Coverage |
|-------|---------|
| `SyncControllerTest` | PLAY / PAUSE / SEEK broadcast, room-scoped broadcast |
| `MusicControllerTest` | Upload success, error handling, status endpoint |
| `MusicServiceTest` | Bean instantiation |
| `MusicStreamingApplicationTests` | Spring context load |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FFmpeg process failed` | FFmpeg not on PATH | Install FFmpeg or use Docker |
| Upload CORS error | Backend not running | Start backend first |
| No audio after upload | Browser MSE not supported | Use Chrome or Firefox |
| WebSocket not connecting | Backend down or wrong port | Verify backend is up on 8080 |
| Room controls disabled | Not the room owner | Only the creator can control playback |
| "No music — owner must start" | Owner hasn't pressed Play | Wait for the room owner to start a track |
| Audio out of sync | Large network latency | Drift correction re-aligns within 5 s |

---

## Architecture

```
Browser (Owner)              Browser (Listener)
       │                            │
       │  POST /music/upload        │
       ├──────────────────────────► Backend (Spring Boot :8080)
       │                                     │
       │  GET /{id}/stream.m3u8 (HLS)        │ FFmpeg converts
       ◄────────────────────────────         │ audio → HLS segments
       │                                     │
       │  WS /ws  STOMP CONNECT              │
       ├──────────────────────────────────── ┤ ◄── Listener connects
       │  /app/sync/{roomId}  PLAY           │
       ├────────────────────────────────────►│
       │                                     │
       │  /topic/player/{roomId}  PLAY ──────┤──────────────────────►
       │                                     │              sync & play
```
