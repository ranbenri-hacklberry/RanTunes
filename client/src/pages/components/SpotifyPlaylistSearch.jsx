import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Music, Plus, Check, Loader2, ListMusic, Play, Clock, User } from 'lucide-react';
import { getUserPlaylists, getPlaylistTracks, search as spotifySearch } from '@/lib/spotifyService';

/**
 * Spotify Playlist Import Component
 * Split view: Left side shows playlists, Right side shows selected playlist's tracks
 * Optimized for iPad landscape view
 */
export default function SpotifyPlaylistSearch({ onClose, onAddPlaylist, onRemovePlaylist, userPlaylistIds = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [playlists, setPlaylists] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
    const [isLoadingTracks, setIsLoadingTracks] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [viewMode, setViewMode] = useState('my'); // 'my' or 'search'

    // Format duration from ms to mm:ss
    const formatDuration = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Load user's playlists on mount
    useEffect(() => {
        const loadPlaylists = async () => {
            setIsLoadingPlaylists(true);
            try {
                const response = await getUserPlaylists(50);
                setPlaylists(response.items || []);
            } catch (error) {
                console.error('Error loading playlists:', error);
            } finally {
                setIsLoadingPlaylists(false);
            }
        };
        loadPlaylists();
    }, []);

    // Load tracks when a playlist is selected
    useEffect(() => {
        const loadTracks = async () => {
            if (!selectedPlaylist) {
                setPlaylistTracks([]);
                return;
            }

            setIsLoadingTracks(true);
            try {
                const response = await getPlaylistTracks(selectedPlaylist.id, 100);
                const tracks = (response.items || [])
                    .filter(item => item.track)
                    .map(item => item.track);
                setPlaylistTracks(tracks);
            } catch (error) {
                console.error('Error loading playlist tracks:', error);
            } finally {
                setIsLoadingTracks(false);
            }
        };
        loadTracks();
    }, [selectedPlaylist]);

    // Search playlists
    useEffect(() => {
        const searchPlaylists = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                setViewMode('my');
                return;
            }

            setIsSearching(true);
            setViewMode('search');
            try {
                const response = await spotifySearch(searchQuery, ['playlist'], 30);
                setSearchResults(response.playlists?.items || []);
            } catch (error) {
                console.error('Error searching playlists:', error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchPlaylists, 400);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    // Handle playlist selection
    const handlePlaylistClick = (playlist) => {
        setSelectedPlaylist(playlist);
    };

    // Handle playlist import
    const handleImportPlaylist = async () => {
        if (!selectedPlaylist) return;
        await onAddPlaylist?.(selectedPlaylist, playlistTracks);
    };

    // Check if playlist is already imported
    const isPlaylistImported = (playlistId) => userPlaylistIds.includes(playlistId);

    // Get the list to display (user's or search results)
    const displayPlaylists = viewMode === 'search' ? searchResults : playlists;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-6xl h-[85vh] bg-gradient-to-b from-gray-900 to-black rounded-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            ייבוא פלייליסט מ-Spotify
                        </h2>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="חפש פלייליסטים ב-Spotify..."
                            className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-12
                                     text-white placeholder-white/40 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                        {isSearching && (
                            <Loader2 className="absolute left-12 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 animate-spin" />
                        )}
                    </div>

                    {/* View Mode Tabs */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => { setSearchQuery(''); setViewMode('my'); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                                ${viewMode === 'my' && !searchQuery
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                        >
                            הפלייליסטים שלי ({playlists.length})
                        </button>
                        {searchQuery && (
                            <button
                                className="px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white"
                            >
                                תוצאות חיפוש ({searchResults.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Split View Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Side - Playlists List */}
                    <div className="w-1/2 border-l border-white/10 overflow-y-auto">
                        {isLoadingPlaylists ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                            </div>
                        ) : displayPlaylists.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/50">
                                <ListMusic className="w-16 h-16 mb-4" />
                                <p>{searchQuery ? 'לא נמצאו פלייליסטים' : 'אין פלייליסטים'}</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-2">
                                {displayPlaylists.map(playlist => {
                                    const isSelected = selectedPlaylist?.id === playlist.id;
                                    const isImported = isPlaylistImported(playlist.id);

                                    return (
                                        <motion.div
                                            key={playlist.id}
                                            whileHover={{ scale: 1.01 }}
                                            onClick={() => handlePlaylistClick(playlist)}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                                                ${isSelected
                                                    ? 'bg-green-600/30 border border-green-500/50'
                                                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                                }
                                                ${isImported ? 'ring-2 ring-green-500/50' : ''}`}
                                        >
                                            {/* Playlist Image */}
                                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gray-800">
                                                {playlist.images?.[0]?.url ? (
                                                    <img
                                                        src={playlist.images[0].url}
                                                        alt={playlist.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ListMusic className="w-6 h-6 text-white/30" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Playlist Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-medium truncate">{playlist.name}</h3>
                                                <div className="flex items-center gap-2 text-white/50 text-sm">
                                                    <span>{playlist.tracks?.total || 0} שירים</span>
                                                    {playlist.owner?.display_name && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate">{playlist.owner.display_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Icon */}
                                            {isImported && (
                                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Side - Selected Playlist Tracks */}
                    <div className="w-1/2 flex flex-col overflow-hidden">
                        {!selectedPlaylist ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/50">
                                <Music className="w-20 h-20 mb-4" />
                                <p className="text-lg">בחר פלייליסט לצפייה בשירים</p>
                            </div>
                        ) : (
                            <>
                                {/* Selected Playlist Header */}
                                <div className="p-4 border-b border-white/10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-800 shrink-0">
                                            {selectedPlaylist.images?.[0]?.url ? (
                                                <img
                                                    src={selectedPlaylist.images[0].url}
                                                    alt={selectedPlaylist.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ListMusic className="w-8 h-8 text-white/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-white truncate">{selectedPlaylist.name}</h3>
                                            <p className="text-white/60 text-sm">{playlistTracks.length} שירים</p>
                                            {selectedPlaylist.description && (
                                                <p className="text-white/40 text-xs mt-1 line-clamp-2">{selectedPlaylist.description}</p>
                                            )}
                                        </div>

                                        {/* Import Button */}
                                        <button
                                            onClick={handleImportPlaylist}
                                            disabled={isPlaylistImported(selectedPlaylist.id)}
                                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0
                                                ${isPlaylistImported(selectedPlaylist.id)
                                                    ? 'bg-green-600/30 text-green-400 cursor-default'
                                                    : 'bg-green-600 text-white hover:bg-green-500 hover:scale-105'
                                                }`}
                                        >
                                            {isPlaylistImported(selectedPlaylist.id) ? (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    נוסף
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-5 h-5" />
                                                    ייבא פלייליסט
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Tracks List */}
                                <div className="flex-1 overflow-y-auto">
                                    {isLoadingTracks ? (
                                        <div className="flex items-center justify-center h-32">
                                            <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="p-2">
                                            {playlistTracks.filter(track => track && track.id).map((track, index) => (
                                                <div
                                                    key={track.id}
                                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                                >
                                                    {/* Track Number */}
                                                    <span className="w-8 text-center text-white/40 text-sm shrink-0">
                                                        {index + 1}
                                                    </span>

                                                    {/* Album Art */}
                                                    <div className="w-10 h-10 rounded overflow-hidden bg-gray-800 shrink-0">
                                                        {track.album?.images?.[0]?.url ? (
                                                            <img
                                                                src={track.album.images[0].url}
                                                                alt={track.album.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Music className="w-4 h-4 text-white/30" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Track Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate text-sm">{track.name}</p>
                                                        <p className="text-white/50 text-xs truncate">
                                                            {track.artists?.map(a => a.name).join(', ')}
                                                        </p>
                                                    </div>

                                                    {/* Duration */}
                                                    <span className="text-white/40 text-sm shrink-0">
                                                        {formatDuration(track.duration_ms)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
