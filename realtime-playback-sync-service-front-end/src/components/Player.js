import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { connectWebSocket, sendSyncMessage, disconnectWebSocket, CLIENT_ID } from './websocket';

const RESYNC_INTERVAL_MS = 5000;

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function Player({ song, hasPrev, hasNext, onPrev, onNext, onSongUpdated, onRemoteLoad, activeRoom, isRoomOwner, token }) {
  const audioRef       = useRef(null);
  const hlsRef         = useRef(null);
  const resyncRef      = useRef(null);
  const pendingPlayRef = useRef(null);
  const songRef        = useRef(song);

  const [connected,   setConnected]   = useState(false);
  const [connecting,  setConnecting]  = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [volume,  setVolume]  = useState(1);
  const [muted,   setMuted]   = useState(false);
  const [repeat,  setRepeat]  = useState(false);

  useEffect(() => { songRef.current = song; }, [song]);

  const loadStream = useCallback((streamUrl) => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    const url = `http://localhost:8080${streamUrl}`;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setCurrentTime(0); setDuration(0); setIsPlaying(false);
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url); hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const pending = pendingPlayRef.current;
        if (pending) {
          const delay = (Date.now() - pending.timestamp) / 1000;
          audio.currentTime = pending.position + delay;
          pendingPlayRef.current = null;
        }
        audio.play().catch(console.error);
        setIsPlaying(true);
      });
      hlsRef.current = hls;
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = url; audio.play().catch(console.error); setIsPlaying(true);
    }
  }, []);

  useEffect(() => { if (song?.streamUrl) loadStream(song.streamUrl); }, [song, loadStream]);
  useEffect(() => () => { if (hlsRef.current) hlsRef.current.destroy(); }, []);

  const handleSync = useCallback((msg) => {
    if (msg.clientId && msg.clientId === CLIENT_ID) return;
    const audio = audioRef.current;
    if (!audio) return;
    const delay = (Date.now() - msg.timestamp) / 1000;
    if (msg.action === 'LOAD' && msg.songId && onRemoteLoad) {
      pendingPlayRef.current = { position: msg.position, timestamp: msg.timestamp };
      onRemoteLoad(msg.songId);
    } else if (msg.action === 'PLAY') {
      if (audio.readyState >= 2) {
        audio.currentTime = msg.position + delay; audio.play().catch(console.error); setIsPlaying(true);
      } else {
        pendingPlayRef.current = { position: msg.position, timestamp: msg.timestamp };
        if (msg.songId && onRemoteLoad && msg.songId !== songRef.current?.id) onRemoteLoad(msg.songId);
      }
    } else if (msg.action === 'PAUSE') {
      pendingPlayRef.current = null; audio.pause(); audio.currentTime = msg.position; setIsPlaying(false);
    } else if (msg.action === 'SEEK') {
      audio.currentTime = msg.position;
    } else if (msg.action === 'STOP') {
      pendingPlayRef.current = null; audio.pause(); audio.currentTime = 0; setIsPlaying(false);
    }
  }, [onRemoteLoad]);

  const startResync = useCallback((roomId) => {
    clearInterval(resyncRef.current);
    resyncRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && !audio.paused) sendSyncMessage('PLAY', audio.currentTime, roomId || null, songRef.current?.id || null);
    }, RESYNC_INTERVAL_MS);
  }, []);

  const doConnect = useCallback((roomId) => {
    disconnectWebSocket(); clearInterval(resyncRef.current);
    setConnected(false); setConnecting(true);
    connectWebSocket(
      handleSync, roomId || null,
      () => { setConnecting(false); setConnected(true); startResync(roomId); },
      () => { setConnecting(false); setConnected(false); },
      token || null
    );
  }, [handleSync, startResync, token]);

  useEffect(() => { doConnect(activeRoom?.id || ''); }, [activeRoom, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleUnload = () => disconnectWebSocket();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      disconnectWebSocket(); clearInterval(resyncRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const roomId = activeRoom?.id || null;
  const canControl = !activeRoom || isRoomOwner;

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    sendSyncMessage('LOAD', 0, roomId, song.id);
    audio.play().catch(console.error); setIsPlaying(true);
    sendSyncMessage('PLAY', audio.currentTime, roomId, song.id);
  };

  const handlePause = () => {
    const audio = audioRef.current; if (!audio) return;
    audio.pause(); setIsPlaying(false);
    sendSyncMessage('PAUSE', audio.currentTime, roomId);
  };

  const handleStop = () => {
    const audio = audioRef.current; if (!audio) return;
    audio.pause(); audio.currentTime = 0; setIsPlaying(false); setCurrentTime(0);
    sendSyncMessage('STOP', 0, roomId);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current; if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t; sendSyncMessage('SEEK', t, roomId);
  };

  const toggleFav = async () => {
    if (!song) return;
    try {
      const res = await fetch(`http://localhost:8080/music/songs/${song.id}/favorite`, { method: 'PUT' });
      const updated = await res.json();
      if (onSongUpdated) onSongUpdated(updated);
    } catch (e) { console.error(e); }
  };

  const handleDownload = () => {
    if (!song) return;
    const a = document.createElement('a');
    a.href = `http://localhost:8080/music/songs/${song.id}/download`;
    a.download = song.originalFilename || `${song.title}.mp3`; a.click();
  };

  const handleEnded = () => {
    if (repeat) {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(console.error); }
    } else {
      setIsPlaying(false);
      if (hasNext && canControl) onNext();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isListenerOnly = activeRoom && !isRoomOwner;

  const statusDot = connecting
    ? 'bg-warn animate-blink'
    : connected
      ? 'bg-success animate-blink'
      : 'bg-surface-3';

  const statusLabel = connecting
    ? 'Connecting'
    : connected
      ? (activeRoom ? activeRoom.name : 'Global')
      : 'Offline';

  return (
    <div className="bg-surface/95 backdrop-blur-xl border border-surface-3 rounded-2xl px-4 py-3 shadow-xl shadow-ink/8">

      {/* Listener banner */}
      {isListenerOnly && (
        <div className={`flex items-center justify-center gap-2 text-xs py-1.5 mb-3 rounded-lg ${
          isPlaying
            ? 'text-success bg-success/8 border border-success/15'
            : 'text-ink-2 bg-surface-2 border border-surface-3'
        }`}>
          {isPlaying ? (
            <>
              <span className="flex gap-0.5 items-end h-4">
                <span className="w-0.5 bg-success rounded-full animate-bar1" style={{display:'inline-block'}}/>
                <span className="w-0.5 bg-success rounded-full animate-bar2" style={{display:'inline-block'}}/>
                <span className="w-0.5 bg-success rounded-full animate-bar3" style={{display:'inline-block'}}/>
              </span>
              Listening live
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
              Waiting for owner to start music
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Thumbnail / disc */}
        <div
          className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-accent to-accent-2 ${isPlaying ? 'animate-spin-disc' : ''}`}
          style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
        >
          {isPlaying ? (
            <span className="flex gap-0.5 items-end h-5">
              <span className="w-0.5 bg-white rounded-full animate-bar1" style={{display:'inline-block'}}/>
              <span className="w-0.5 bg-white rounded-full animate-bar2" style={{display:'inline-block'}}/>
              <span className="w-0.5 bg-white rounded-full animate-bar3" style={{display:'inline-block'}}/>
            </span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>
            </svg>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate leading-tight">
            {song ? song.title : (isListenerOnly ? 'No music playing' : 'Nothing playing')}
          </div>
          <div className="text-xs text-ink-3 truncate mt-0.5 leading-tight">
            {song ? `${song.artist}${song.album !== 'Unknown Album' ? ' · ' + song.album : ''}` : '\u2014'}
          </div>
        </div>

        {/* Favorite */}
        <button onClick={toggleFav} disabled={!song}
          className="text-base disabled:opacity-30 text-ink-3 hover:text-accent-2 transition-colors duration-150 p-1 flex-shrink-0">
          {song?.favorite ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#a78bfa">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          )}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-2 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="text-xs text-ink-3 max-w-[80px] truncate">{statusLabel}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-ink-3 w-8 text-right tabular-nums">{fmt(currentTime)}</span>
        <div className="flex-1 relative">
          <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent to-accent-2 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }} />
          </div>
          <input
            type="range" min={0} max={duration || 0} value={currentTime} step={0.1}
            onChange={handleSeek} disabled={!song || !canControl}
            className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed h-1 top-0"
          />
        </div>
        <span className="text-xs text-ink-3 w-8 tabular-nums">{fmt(duration)}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between mt-2">

        {/* Volume */}
        <div className="flex items-center gap-2 w-28">
          <button onClick={() => setMuted(m => !m)}
            className="text-ink-3 hover:text-ink transition-colors duration-150 flex-shrink-0 p-1">
            {muted || volume === 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : volume < 0.5 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            )}
          </button>
          <input type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
            onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
            className="flex-1 h-1 accent-accent-2" />
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1">
          <button onClick={onPrev} disabled={!hasPrev || !song || !canControl}
            className="p-2 text-ink-3 hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 rounded-xl hover:bg-surface-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button onClick={handleStop} disabled={!song || !canControl}
            className="p-2 text-ink-3 hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 rounded-xl hover:bg-surface-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
          </button>

          {/* Main play/pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!song || !canControl}
            className="w-10 h-10 rounded-full bg-accent hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center mx-1 shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150"
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:'1px'}}>
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          <button onClick={onNext} disabled={!hasNext || !song || !canControl}
            className="p-2 text-ink-3 hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 rounded-xl hover:bg-surface-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button onClick={() => setRepeat(r => !r)}
            className={`p-2 transition-colors duration-150 rounded-xl hover:bg-surface-2 ${repeat ? 'text-accent-2' : 'text-ink-3 hover:text-ink'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>
        </div>

        {/* Download */}
        <div className="flex items-center justify-end w-28">
          <button onClick={handleDownload} disabled={!song}
            className="p-2 text-ink-3 hover:text-ink disabled:opacity-25 disabled:cursor-not-allowed transition-colors duration-150 rounded-xl hover:bg-surface-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onDurationChange={() => audioRef.current && setDuration(audioRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />
    </div>
  );
}

export default Player;
