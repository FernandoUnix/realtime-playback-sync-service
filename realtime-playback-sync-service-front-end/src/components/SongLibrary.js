import React, { useState, useEffect, useCallback, useRef } from 'react';

const TAB_KEYS = ['All', 'Favorites', 'Artists', 'Albums', 'Genres', 'Playlists', 'History'];
const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { value: 'uploadedAt', label: 'Date' },
  { value: 'title',      label: 'Name' },
  { value: 'duration',   label: 'Duration' },
];

function formatDuration(sec) {
  if (!sec) return '';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SongLibrary({ selectedSong, onPlaySong, onSongUpdated, onSongDeleted, refreshTrigger }) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [pageSongs, setPageSongs] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortBy, setSortBy] = useState('uploadedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [history, setHistory] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editName, setEditName] = useState('');
  const [filterGroup, setFilterGroup] = useState(null);
  const [tabCounts, setTabCounts] = useState({ All: 0, Favorites: 0, Artists: 0, Albums: 0, Genres: 0, Playlists: 0, History: 0 });

  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => { setPage(0); }, [activeTab, filterGroup, sortBy, sortDir]);

  const isPaged = ['All', 'Favorites', 'Artists', 'Albums', 'Genres'].includes(activeTab);

  const fetchPagedSongs = useCallback(async () => {
    if (!isPaged) return;
    try {
      const params = new URLSearchParams({ page, size: PAGE_SIZE, sortBy, sortDir });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (activeTab === 'Favorites') params.set('favorite', 'true');
      if (filterGroup) {
        if (activeTab === 'Artists') params.set('artist', filterGroup);
        if (activeTab === 'Albums')  params.set('album',  filterGroup);
        if (activeTab === 'Genres')  params.set('genre',  filterGroup);
      }
      const res = await fetch(`http://localhost:8080/music/songs?${params}`);
      const data = await res.json();
      setPageSongs(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) { console.error(e); }
  }, [isPaged, activeTab, filterGroup, debouncedSearch, page, sortBy, sortDir]);

  useEffect(() => { fetchPagedSongs(); }, [fetchPagedSongs, refreshTrigger]);

  const fetchMeta = useCallback(async () => {
    try {
      const [ar, al, ge, hi, pl, allCount, favCount] = await Promise.all([
        fetch('http://localhost:8080/music/artists').then(r => r.json()),
        fetch('http://localhost:8080/music/albums').then(r => r.json()),
        fetch('http://localhost:8080/music/genres').then(r => r.json()),
        fetch('http://localhost:8080/music/history').then(r => r.json()),
        fetch('http://localhost:8080/playlists').then(r => r.json()),
        fetch('http://localhost:8080/music/songs?page=0&size=1').then(r => r.json()),
        fetch('http://localhost:8080/music/songs?page=0&size=1&favorite=true').then(r => r.json()),
      ]);
      setArtists(ar); setAlbums(al); setGenres(ge); setHistory(hi); setPlaylists(pl);
      setTabCounts({
        All: allCount.totalElements ?? 0, Favorites: favCount.totalElements ?? 0,
        Artists: ar.length, Albums: al.length, Genres: ge.length,
        Playlists: pl.length, History: hi.length,
      });
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta, refreshTrigger]);

  const fetchPlaylistSongs = useCallback(async (id) => {
    try { const res = await fetch(`http://localhost:8080/playlists/${id}/songs`); setPlaylistSongs(await res.json()); }
    catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (activePlaylist) fetchPlaylistSongs(activePlaylist.id); }, [activePlaylist, fetchPlaylistSongs]);

  const toggleFavorite = async (e, song) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:8080/music/songs/${song.id}/favorite`, { method: 'PUT' });
      const updated = await res.json();
      if (onSongUpdated) onSongUpdated(updated);
      fetchMeta(); fetchPagedSongs();
    } catch (e) { console.error(e); }
  };

  const deleteSong = async (e, song) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${song.title}"? This will remove the file permanently.`)) return;
    try {
      await fetch(`http://localhost:8080/music/songs/${song.id}`, { method: 'DELETE' });
      if (onSongDeleted) onSongDeleted(song.id);
      fetchMeta(); fetchPagedSongs();
    } catch (e) { console.error(e); }
  };

  const addToPlaylist = async (e, song, playlistId) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8080/playlists/${playlistId}/songs/${song.id}`, { method: 'POST' });
      if (activePlaylist?.id === playlistId) fetchPlaylistSongs(playlistId);
    } catch (e) { console.error(e); }
  };

  const createPlaylist = async () => {
    try {
      const res = await fetch('http://localhost:8080/playlists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Playlist' }),
      });
      const pl = await res.json();
      setPlaylists(prev => [pl, ...prev]); setEditingPlaylist(pl.id); setEditName(pl.name);
    } catch (e) { console.error(e); }
  };

  const savePlaylistName = async (pl) => {
    try {
      const res = await fetch(`http://localhost:8080/playlists/${pl.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      const updated = await res.json();
      setPlaylists(prev => prev.map(p => p.id === pl.id ? updated : p)); setEditingPlaylist(null);
    } catch (e) { console.error(e); }
  };

  const deletePlaylist = async (e, id) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8080/playlists/${id}`, { method: 'DELETE' });
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (activePlaylist?.id === id) setActivePlaylist(null);
      fetchMeta();
    } catch (e) { console.error(e); }
  };

  const removeSongFromPlaylist = async (songId) => {
    try {
      await fetch(`http://localhost:8080/playlists/${activePlaylist.id}/songs/${songId}`, { method: 'DELETE' });
      fetchPlaylistSongs(activePlaylist.id);
    } catch (e) { console.error(e); }
  };

  const recordHistory = async (song) => {
    try { await fetch(`http://localhost:8080/music/history/${song.id}`, { method: 'POST' }); fetchMeta(); }
    catch (e) { console.error(e); }
  };

  const handlePlaySong = (song, list) => { recordHistory(song); if (onPlaySong) onPlaySong(song, list); };

  const renderSongRow = (song, list, showRemove, index) => {
    const isActive = selectedSong?.id === song.id;
    const isHovered = hoveredId === song.id;
    return (
      <div key={song.id}
        onClick={() => handlePlaySong(song, list)}
        onMouseEnter={() => setHoveredId(song.id)}
        onMouseLeave={() => setHoveredId(null)}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
          isActive
            ? 'bg-accent-dim border border-accent/25'
            : 'border border-transparent hover:bg-surface-2'
        }`}
      >
        {/* Track number / play indicator */}
        <div className="w-6 text-center flex-shrink-0">
          {isActive ? (
            isHovered ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#a78bfa">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <span className="flex gap-0.5 items-end justify-center h-3.5">
                <span className="w-0.5 bg-accent-2 rounded-full animate-bar1" style={{display:'inline-block'}}/>
                <span className="w-0.5 bg-accent-2 rounded-full animate-bar2" style={{display:'inline-block'}}/>
                <span className="w-0.5 bg-accent-2 rounded-full animate-bar3" style={{display:'inline-block'}}/>
              </span>
            )
          ) : isHovered ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-ink-2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          ) : (
            <span className="text-xs text-ink-3 tabular-nums">{index != null ? index + 1 : ''}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${isActive ? 'text-accent-2' : 'text-ink'}`}>{song.title}</div>
          <div className="text-xs text-ink-3 truncate mt-0.5">
            {song.artist}{song.album !== 'Unknown Album' ? ` \u00b7 ${song.album}` : ''}
          </div>
        </div>

        {/* Duration */}
        {song.duration > 0 && (
          <span className="text-xs text-ink-3 flex-shrink-0 tabular-nums">{formatDuration(song.duration)}</span>
        )}

        {/* Actions — reveal on hover */}
        <div className={`flex items-center gap-0.5 transition-opacity duration-150 ${isHovered || isActive ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={e => toggleFavorite(e, song)}
            className={`p-1.5 rounded-lg transition-colors duration-150 ${song.favorite ? 'text-accent-2' : 'text-ink-3 hover:text-accent-2'}`}>
            {song.favorite ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            )}
          </button>

          {playlists.length > 0 && (
            <select defaultValue="" onClick={e => e.stopPropagation()}
              onChange={e => { if (e.target.value) addToPlaylist(e, song, e.target.value); e.target.value = ''; }}
              className="text-xs text-ink-3 bg-surface-3 border border-surface-3 rounded-lg px-1.5 py-1 cursor-pointer outline-none hover:border-accent/30 transition-colors duration-150">
              <option value="" disabled>+ List</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {showRemove && (
            <button onClick={e => { e.stopPropagation(); removeSongFromPlaylist(song.id); }}
              className="p-1.5 text-ink-3 hover:text-danger rounded-lg transition-colors duration-150">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}

          <button onClick={e => deleteSong(e, song)}
            className="p-1.5 text-ink-3 hover:text-danger rounded-lg transition-colors duration-150">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalElements === 0) return null;
    return (
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-surface-3">
        <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
          className="text-xs text-ink-3 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150">
          &larr; Prev
        </button>
        <div className="text-center">
          <span className="text-xs text-ink-2">{page + 1} / {Math.max(totalPages, 1)}</span>
          <span className="text-xs text-ink-3 ml-2">{totalElements} tracks</span>
        </div>
        <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
          className="text-xs text-ink-3 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150">
          Next &rarr;
        </button>
      </div>
    );
  };

  const showToolRow = ['All', 'Favorites'].includes(activeTab) ||
    (['Artists', 'Albums', 'Genres'].includes(activeTab) && filterGroup);

  const renderGroupChips = (items, tab) => (
    <div>
      {filterGroup ? (
        <div>
          <button onClick={() => setFilterGroup(null)}
            className="flex items-center gap-1 text-xs text-accent-2 hover:text-accent mb-3 transition-colors duration-150">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            All {tab}
          </button>
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-2 px-1">{filterGroup}</p>
          {pageSongs.length === 0
            ? <p className="text-sm text-ink-3 text-center py-8">No songs</p>
            : pageSongs.map((sg, i) => renderSongRow(sg, pageSongs, false, i))}
          {renderPagination()}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.length === 0 && <p className="text-sm text-ink-3 py-8 w-full text-center">No {tab.toLowerCase()} found</p>}
          {items.map(item => (
            <button key={item} onClick={() => setFilterGroup(item)}
              className="text-sm text-ink-2 bg-surface-2 hover:bg-surface-3 border border-surface-3 hover:border-accent/25 hover:text-accent-2 px-3 py-1.5 rounded-xl transition-all duration-150">
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'All':
      case 'Favorites':
        return (
          <>
            {pageSongs.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-12">
                {debouncedSearch ? 'No results for your search.' : activeTab === 'Favorites' ? 'No favorites yet.' : 'No songs uploaded yet.'}
              </p>
            ) : pageSongs.map((sg, i) => renderSongRow(sg, pageSongs, false, i))}
            {renderPagination()}
          </>
        );

      case 'Artists': return renderGroupChips(artists, 'Artists');
      case 'Albums':  return renderGroupChips(albums,  'Albums');
      case 'Genres':  return renderGroupChips(genres,  'Genres');

      case 'History':
        return history.length === 0
          ? <p className="text-sm text-ink-3 text-center py-12">No playback history yet.</p>
          : (
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors duration-150">
                  <div className="w-6 text-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3 mx-auto">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{h.title}</div>
                    <div className="text-xs text-ink-3 truncate">{h.artist}</div>
                  </div>
                  <span className="text-xs text-ink-3 flex-shrink-0">{formatDate(h.playedAt)}</span>
                </div>
              ))}
            </div>
          );

      case 'Playlists':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-ink-3">{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</span>
              <button onClick={createPlaylist}
                className="text-xs font-medium text-accent-2 hover:text-accent px-2.5 py-1 rounded-lg hover:bg-surface-2 transition-colors duration-150">
                + New Playlist
              </button>
            </div>

            {activePlaylist ? (
              <div>
                <button onClick={() => setActivePlaylist(null)}
                  className="flex items-center gap-1 text-xs text-accent-2 hover:text-accent mb-3 transition-colors duration-150">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  All playlists
                </button>
                <p className="text-sm font-semibold text-ink mb-3">{activePlaylist.name}</p>
                {playlistSongs.length === 0
                  ? <p className="text-sm text-ink-3 text-center py-8">Empty &mdash; add songs using the list button on any track.</p>
                  : <div className="space-y-0.5">{playlistSongs.map((sg, i) => renderSongRow(sg, playlistSongs, true, i))}</div>
                }
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-8">No playlists yet.</p>
            ) : (
              <div className="space-y-1.5">
                {playlists.map(pl => (
                  <div key={pl.id} onClick={() => setActivePlaylist(pl)}
                    className="group flex items-center gap-3 px-3 py-3 rounded-xl border border-surface-3 hover:bg-surface-2 hover:border-ink-3/40 cursor-pointer transition-all duration-150">
                    <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3">
                        <line x1="8" y1="6" x2="21" y2="6"/>
                        <line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/>
                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingPlaylist === pl.id ? (
                        <input autoFocus value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={() => savePlaylistName(pl)}
                          onKeyDown={e => e.key === 'Enter' && savePlaylistName(pl)}
                          onClick={e => e.stopPropagation()}
                          className="bg-surface-3 border border-accent/40 rounded-lg px-2 py-0.5 text-sm text-ink outline-none w-full"
                        />
                      ) : (
                        <div className="text-sm font-medium text-ink truncate">{pl.name}</div>
                      )}
                      <div className="text-xs text-ink-3 mt-0.5">{pl.songIds?.length ?? 0} tracks</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setEditingPlaylist(pl.id); setEditName(pl.name); }}
                        className="p-1.5 text-ink-3 hover:text-accent-2 rounded-lg hover:bg-surface-3 transition-colors duration-150">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button onClick={e => deletePlaylist(e, pl.id)}
                        className="p-1.5 text-ink-3 hover:text-danger rounded-lg hover:bg-surface-3 transition-colors duration-150">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="bg-surface border border-surface-3 rounded-2xl overflow-hidden mb-5">
      {/* Tab bar */}
      <div className="flex border-b border-surface-3 overflow-x-auto">
        {TAB_KEYS.map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setFilterGroup(null); setSearch(''); }}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-200 flex-shrink-0 ${
              activeTab === tab
                ? 'text-accent-2 border-accent-2'
                : 'text-ink-3 border-transparent hover:text-ink-2 hover:border-ink-3/40'
            }`}>
            {tab}
            {tabCounts[tab] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab ? 'bg-accent/15 text-accent-2' : 'bg-surface-2 text-ink-3'
              }`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Search + sort row */}
        {showToolRow && (
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface-2 border border-surface-3 rounded-xl pl-8 pr-3 py-2 text-sm text-ink placeholder-ink-3 outline-none focus:border-accent-2/40 transition-colors duration-150"
              />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-surface-2 border border-surface-3 rounded-xl px-3 py-2 text-xs text-ink-2 outline-none cursor-pointer hover:border-ink-3/40 transition-colors duration-150">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="bg-surface-2 border border-surface-3 rounded-xl px-2.5 py-2 text-xs text-ink-2 hover:border-ink-3/40 transition-colors duration-150">
              {sortDir === 'asc' ? '\u2191' : '\u2193'}
            </button>
          </div>
        )}

        <div className="space-y-0.5">{renderContent()}</div>
      </div>
    </div>
  );
}

export default SongLibrary;
