import React, { useState, useEffect, useCallback, useRef } from 'react';

function Rooms({ activeRoom, currentUser, token, onJoin, onLeave, onLoginRequired }) {
  const [rooms, setRooms] = useState([]);
  const [listeners, setListeners] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const pollRef = useRef(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8080/rooms');
      setRooms(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  const fetchListeners = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8080/rooms/listeners');
      setListeners(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchRooms(); fetchListeners();
    pollRef.current = setInterval(() => { fetchRooms(); fetchListeners(); }, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchRooms, fetchListeners]);

  const handleJoin = (room) => {
    if (!currentUser) { onLoginRequired(); return; }
    onJoin(room);
  };

  const createRoom = async () => {
    if (!currentUser) { onLoginRequired(); return; }
    const name = newName.trim() || 'New Room';
    try {
      const res = await fetch('http://localhost:8080/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const room = await res.json();
      setRooms(prev => [room, ...prev]);
      setNewName(''); setShowCreate(false);
      onJoin(room);
    } catch (e) { console.error(e); }
  };

  const deleteRoom = async (e, room) => {
    e.stopPropagation();
    if (!window.confirm(`Delete room "${room.name}"?`)) return;
    try {
      await fetch(`http://localhost:8080/rooms/${room.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(prev => prev.filter(r => r.id !== room.id));
      if (activeRoom?.id === room.id) onLeave();
    } catch (e) { console.error(e); }
  };

  const globalListeners = listeners['global'] || 0;
  const isGlobalActive = !activeRoom;

  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Sync rooms
          <span className="text-xs text-ink-3 font-normal">{rooms.length}</span>
        </h2>
        <button
          onClick={() => { if (!currentUser) { onLoginRequired(); return; } setShowCreate(v => !v); }}
          className="text-xs font-medium text-ink-3 hover:text-accent-2 px-2.5 py-1 rounded-lg hover:bg-surface-2 transition-colors duration-150"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="flex gap-2 mb-3 animate-fade-up">
          <input
            autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createRoom()}
            placeholder="Room name…"
            className="flex-1 bg-surface border border-surface-3 rounded-xl px-3.5 py-2 text-sm text-ink placeholder-ink-3 outline-none focus:border-accent-2/40 transition-colors duration-150"
          />
          <button onClick={createRoom}
            className="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors duration-150 whitespace-nowrap">
            Create &amp; Join
          </button>
        </div>
      )}

      {!currentUser && (
        <div className="flex items-center gap-2 bg-warn/5 border border-warn/15 rounded-xl px-3 py-2 mb-3 text-xs text-warn/80">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <button onClick={onLoginRequired} className="underline underline-offset-2 hover:text-warn transition-colors">Sign in</button>
          <span>to join or create rooms</span>
        </div>
      )}

      {/* Room list */}
      <div className="space-y-1.5">
        {/* Global room */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
          isGlobalActive
            ? 'bg-blue-500/10 border-blue-500/25'
            : 'bg-surface border-surface-3 hover:border-ink-3/40 hover:bg-surface-2'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isGlobalActive ? 'bg-blue-400 animate-blink' : 'bg-surface-3'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink">Global</div>
            <div className="text-xs text-ink-3">All unroomed listeners</div>
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            globalListeners > 0 ? 'text-success bg-success/10' : 'text-ink-3 bg-surface-2'
          }`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            {globalListeners}
          </div>
          <button
            onClick={() => onJoin(null)}
            className="text-xs text-ink-3 hover:text-ink px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors duration-150"
          >
            {isGlobalActive ? 'Reconnect' : 'Join'}
          </button>
        </div>

        {rooms.map(room => {
          const isActive = activeRoom?.id === room.id;
          const count = listeners[room.id] || 0;
          const isOwner = currentUser?.username === room.createdBy;
          return (
            <div key={room.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
              isActive
                ? 'bg-accent-dim border-accent/30'
                : 'bg-surface border-surface-3 hover:border-ink-3/40 hover:bg-surface-2'
            }`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-accent-2 animate-blink' : 'bg-surface-3'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-ink truncate">{room.name}</span>
                  {isOwner && (
                    <span className="text-[10px] text-accent-2 bg-accent/10 px-1.5 py-0.5 rounded-full font-medium">owner</span>
                  )}
                </div>
                <div className="text-xs text-ink-3">by {room.createdBy || '?'}</div>
              </div>
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                count > 0 ? 'text-success bg-success/10' : 'text-ink-3 bg-surface-2'
              }`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                {count}
              </div>
              <div className="flex items-center gap-1">
                {isActive ? (
                  <>
                    <button onClick={() => handleJoin(room)} className="text-xs text-warn/70 hover:text-warn px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors duration-150">Reconnect</button>
                    <button onClick={onLeave} className="text-xs text-danger/70 hover:text-danger px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors duration-150">Leave</button>
                  </>
                ) : (
                  <button onClick={() => handleJoin(room)} className="text-xs text-ink-3 hover:text-ink px-2 py-1 rounded-lg hover:bg-surface-3 transition-colors duration-150">Join</button>
                )}
                {isOwner && (
                  <button onClick={e => deleteRoom(e, room)} className="text-xs text-ink-3 hover:text-danger p-1 rounded-lg hover:bg-surface-3 transition-colors duration-150">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <p className="text-xs text-ink-3 text-center py-4">No rooms yet — create one to sync with others</p>
        )}
      </div>
    </div>
  );
}

export default Rooms;
