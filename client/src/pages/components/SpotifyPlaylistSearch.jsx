import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Music, Plus, Check, Loader2, ListMusic, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserPlaylists, getPlaylistTracks, search as spotifySearch } from '@/lib/spotifyService';
import { isSystemRTL } from '@/lib/localeUtils';

/**
 * Spotify Playlist Import Component
 * Mobile-friendly: Full-width cards with expandable track lists
 */
export default function SpotifyPlaylistSearch({ onClose, onAddPlaylist, onRemovePlaylist, userPlaylistIds = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [playlists, setPlaylists] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState({});
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
    const [loadingTracksFor, setLoadingTracksFor] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [importingPlaylistId, setImportingPlaylistId] = useState(null);
    const [viewMode, setViewMode] = useState('my');

    // Locale
    const rtl = useMemo(() => isSystemRTL(), []);
    const labels = useMemo(() => ({
        title: rtl ? 'ייבוא פלייליסט מ-Spotify' : 'Import Playlist from Spotify',
        searchPlaceholder: rtl ? 'חפש פלייליסטים ב-Spotify...' : 'Search Spotify playlists...',
        myPlaylists: rtl ? 'הפלייליסטים שלי' : 'My Playlists',
        searchResults: rtl ? 'תוצאות חיפוש' : 'Search Results',
        noPlaylists: rtl ? 'אין פלייליסטים' : 'No playlists',
        noResults: rtl ? 'לא נמצאו פלייליסטים' : 'No playlists found',
        songs: rtl ? 'שירים' : 'songs',
        importPlaylist: rtl ? 'ייבא פלייליסט' : 'Import Playlist',
        importing: rtl ? 'מייבא...' : 'Importing...',
        added: rtl ? 'נוסף' : 'Added',
    }), [rtl]);

    // Format duration
    const formatDuration = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Load user's playlists
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

    // Toggle expand and load tracks
    const handleToggleExpand = async (playlist) => {
        if (expandedPlaylistId === playlist.id) {
            setExpandedPlaylistId(null);
            return;
        }

        setExpandedPlaylistId(playlist.id);

        // Load tracks if not already loaded
        if (!playlistTracks[playlist.id]) {
            setLoadingTracksFor(playlist.id);
            try {
                const response = await getPlaylistTracks(playlist.id, 100);
                const tracks = (response.items || [])
                    .filter(item => item.track)
                    .map(item => item.track);
                setPlaylistTracks(prev => ({ ...prev, [playlist.id]: tracks }));
            } catch (error) {
                console.error('Error loading tracks:', error);
            } finally {
                setLoadingTracksFor(null);
            }
        }
    };

    // Import playlist
    const handleImportPlaylist = async (playlist) => {
        if (importingPlaylistId) return;
        setImportingPlaylistId(playlist.id);
        try {
            const tracks = playlistTracks[playlist.id] || [];
            await onAddPlaylist?.(playlist, tracks);
        } finally {
            setImportingPlaylistId(null);
        }
    };

    const isPlaylistImported = (playlistId) => userPlaylistIds.includes(playlistId);
    const displayPlaylists = viewMode === 'search' ? searchResults : playlists;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-hidden"
            dir={rtl ? 'rtl' : 'ltr'}
        >
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="shrink-0 p-4 border-b border-white/10 bg-black/80">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            {labels.title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={labels.searchPlaceholder}
                            className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-12
                                     text-white placeholder-white/40 focus:outline-none focus:border-green-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => { setSearchQuery(''); setViewMode('my'); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                                ${viewMode === 'my' && !searchQuery
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white/10 text-white/70'
                                }`}
                        >
                            {labels.myPlaylists} ({playlists.length})
                        </button>
                        {searchQuery && (
                            <button className="px-4 py-2 rounded-full text-sm font-medium bg-purple-600 text-white">
                                {labels.searchResults} ({searchResults.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Playlist Cards */}
                <div className="flex-1 overflow-y-auto p-4 pb-32">
                    {isLoadingPlaylists ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
                        </div>
                    ) : displayPlaylists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-white/50">
                            <ListMusic className="w-16 h-16 mb-4" />
                            <p>{searchQuery ? labels.noResults : labels.noPlaylists}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {displayPlaylists.filter(p => p?.id).map(playlist => {
                                const isExpanded = expandedPlaylistId === playlist.id;
                                const isImported = isPlaylistImported(playlist.id);
                                const tracks = playlistTracks[playlist.id] || [];
                                const isLoadingThese = loadingTracksFor === playlist.id;
                                const isImportingThis = importingPlaylistId === playlist.id;

                                return (
                                    <div key={playlist.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                                        {/* Card Header - Full Width */}
                                        <div
                                            onClick={() => handleToggleExpand(playlist)}
                                            className="flex items-center gap-4 p-4 cursor-pointer active:bg-white/10 transition-colors"
                                        >
                                            {/* Cover */}
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 shrink-0">
                                                {playlist.images?.[0]?.url ? (
                                                    <img
                                                        src={playlist.images[0].url}
                                                        alt={playlist.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ListMusic className="w-8 h-8 text-white/30" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-bold text-lg">{playlist.name}</h3>
                                                <div className="flex items-center gap-2 text-white/50 text-sm">
                                                    <span>{playlist.tracks?.total || 0} {labels.songs}</span>
                                                    {playlist.owner?.display_name && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate">{playlist.owner.display_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expand/Collapse + Status */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isImported && (
                                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                        <Check className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronUp className="w-6 h-6 text-white/50" />
                                                ) : (
                                                    <ChevronDown className="w-6 h-6 text-white/50" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Tracks */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-white/10 bg-black/30">
                                                        {isLoadingThese ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Tracks List */}
                                                                <div className="max-h-60 overflow-y-auto">
                                                                    {tracks.slice(0, 20).map((track, idx) => (
                                                                        <div
                                                                            key={track.id}
                                                                            className="flex items-center gap-3 px-4 py-2 border-b border-white/5 last:border-0"
                                                                        >
                                                                            <span className="w-6 text-center text-white/40 text-sm">{idx + 1}</span>
                                                                            <div className="w-10 h-10 rounded overflow-hidden bg-gray-800 shrink-0">
                                                                                {track.album?.images?.[0]?.url ? (
                                                                                    <img src={track.album.images[0].url} alt="" className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                                        <Music className="w-4 h-4 text-white/30" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-white text-sm truncate">{track.name}</p>
                                                                                <p className="text-white/50 text-xs truncate">
                                                                                    {track.artists?.map(a => a.name).join(', ')}
                                                                                </p>
                                                                            </div>
                                                                            <span className="text-white/40 text-xs">{formatDuration(track.duration_ms)}</span>
                                                                        </div>
                                                                    ))}
                                                                    {tracks.length > 20 && (
                                                                        <div className="px-4 py-2 text-center text-white/40 text-sm">
                                                                            +{tracks.length - 20} more...
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Import Button */}
                                                                <div className="p-4 border-t border-white/10">
                                                                    <button
                                                                        onClick={() => handleImportPlaylist(playlist)}
                                                                        disabled={isImported || isImportingThis}
                                                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                                                                            ${isImported
                                                                                ? 'bg-green-600/30 text-green-400'
                                                                                : isImportingThis
                                                                                    ? 'bg-green-600/50 text-white/50'
                                                                                    : 'bg-green-600 text-white active:scale-95'
                                                                            }`}
                                                                    >
                                                                        {isImportingThis ? (
                                                                            <>
                                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                                                {labels.importing}
                                                                            </>
                                                                        ) : isImported ? (
                                                                            <>
                                                                                <Check className="w-5 h-5" />
                                                                                {labels.added}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Plus className="w-5 h-5" />
                                                                                {labels.importPlaylist}
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
