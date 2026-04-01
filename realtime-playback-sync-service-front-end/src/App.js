import React, { useState, useCallback, useEffect } from 'react';
import Upload from './components/Upload';
import SongLibrary from './components/SongLibrary';
import Player from './components/Player';
import Rooms from './components/Rooms';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';

function App() {
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [libraryRefresh, setLibraryRefresh] = useState(0);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || null);

  const selectedSong = queueIndex >= 0 && queue.length > 0 ? queue[queueIndex] : null;

  useEffect(() => {
    if (token) localStorage.setItem('authToken', token);
    else localStorage.removeItem('authToken');
  }, [token]);
  useEffect(() => {
    if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
    else localStorage.removeItem('currentUser');
  }, [currentUser]);

  const handleAuth = useCallback((data) => {
    setShowLogin(false);
    if (!data) return;
    setToken(data.token);
    setCurrentUser(data.user);
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null); setCurrentUser(null); setActiveRoom(null);
  }, []);

  const handleUserUpdated = useCallback((u) => {
    setCurrentUser(prev => ({ ...prev, ...u }));
  }, []);

  const handleUploadSuccess = useCallback(() => setLibraryRefresh(n => n + 1), []);

  const handlePlaySong = useCallback((song, songList) => {
    const list = songList || [song];
    const idx = list.findIndex(s => s.id === song.id);
    setQueue(list);
    setQueueIndex(idx >= 0 ? idx : 0);
  }, []);

  const handleNext = useCallback(() => {
    setQueueIndex(i => (i + 1 < queue.length ? i + 1 : i));
  }, [queue]);

  const handlePrev = useCallback(() => {
    setQueueIndex(i => (i > 0 ? i - 1 : 0));
  }, []);

  const handleSongUpdated = useCallback((updated) => {
    setQueue(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const handleSongDeleted = useCallback((deletedId) => {
    setQueue(prev => {
      const next = prev.filter(s => s.id !== deletedId);
      setQueueIndex(i => Math.min(i, next.length - 1));
      return next;
    });
  }, []);

  const handleRemoteLoad = useCallback(async (songId) => {
    try {
      const res = await fetch(`http://localhost:8080/music/songs/${songId}`);
      if (!res.ok) return;
      const song = await res.json();
      setQueue([song]); setQueueIndex(0);
    } catch (e) { console.error(e); }
  }, []);

  const handleJoinRoom = useCallback((room) => setActiveRoom(room), []);
  const handleLeaveRoom = useCallback(() => setActiveRoom(null), []);

  const isRoomOwner = activeRoom
    ? (currentUser && currentUser.username === activeRoom.createdBy)
    : true;

  return (
    <div className="min-h-screen bg-base text-ink font-sans">
      {showLogin && <LoginPage onAuth={handleAuth} />}

      {/* Main scroll area — padded above + below for player dock */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-48">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              <span className="text-accent-2">&#9835;</span> Wavesync
            </h1>
            <p className="text-xs text-ink-3 mt-0.5">Real-time music — always in sync</p>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <button
                  onClick={() => setShowUsers(v => !v)}
                  className="text-xs text-ink-2 hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150"
                >
                  {showUsers ? 'Hide users' : `@${currentUser.username}`}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-xs text-ink-3 hover:text-danger px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-xs font-semibold bg-accent hover:bg-accent/90 text-white px-4 py-1.5 rounded-lg transition-colors duration-150"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        {showUsers && currentUser && (
          <div className="animate-fade-up mb-6">
            <UserManagement currentUser={currentUser} token={token} onUserUpdated={handleUserUpdated} />
          </div>
        )}

        <Upload onUploadSuccess={handleUploadSuccess} />

        <Rooms
          activeRoom={activeRoom}
          currentUser={currentUser}
          token={token}
          onJoin={handleJoinRoom}
          onLeave={handleLeaveRoom}
          onLoginRequired={() => setShowLogin(true)}
        />

        <SongLibrary
          selectedSong={selectedSong}
          onPlaySong={handlePlaySong}
          onSongUpdated={handleSongUpdated}
          onSongDeleted={handleSongDeleted}
          refreshTrigger={libraryRefresh}
        />
      </div>

      {/* Fixed player dock */}
      <div className="fixed bottom-0 inset-x-0 z-50">
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <Player
            song={selectedSong}
            hasPrev={queueIndex > 0}
            hasNext={queueIndex < queue.length - 1}
            onPrev={handlePrev}
            onNext={handleNext}
            onSongUpdated={handleSongUpdated}
            onRemoteLoad={handleRemoteLoad}
            activeRoom={activeRoom}
            isRoomOwner={isRoomOwner}
            token={token}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
