import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Music, Disc, ListMusic, Search, Upload, RefreshCw,
    ArrowRight, Sparkles, User, Play, FolderOpen, Heart,
    Pause, SkipForward, SkipBack, Trash2, X, HardDrive, AlertCircle, LogOut, Pencil,
    ThumbsUp, ThumbsDown, Monitor, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '@/context/MusicContext';
import { useAlbums } from '@/hooks/useAlbums';
import { useRanTunesAuth } from '@/context/RanTunesAuthContext';
import AlbumCard from '@/components/AlbumCard';
import VinylTurntable from '@/components/VinylTurntable';
import SongRow from '@/components/SongRow';
import MiniMusicPlayer from '@/components/MiniMusicPlayer';
import MusicPlayer from '@/components/MusicPlayer';
import SpotifyDevicePicker from '@/components/SpotifyDevicePicker';
import PlaylistBuilder from '@/components/PlaylistBuilder';
import DirectoryScanner from '@/components/DirectoryScanner';
import SpotifyAlbumSearch from '@/components/SpotifyAlbumSearch';
import SpotifyPlaylistSearch from '@/components/SpotifyPlaylistSearch';
import SpotifyService from '@/lib/spotifyService';
import { supabase } from '@/lib/supabase';
import '@/styles/music.css';

// Tabs for navigation
const TABS = [
    { id: 'albums', label: 'אלבומים', icon: Disc },
    { id: 'artists', label: 'אמנים', icon: User },
    { id: 'playlists', label: 'פלייליסטים', icon: ListMusic },
    { id: 'favorites', label: 'מועדפים', icon: Heart },
];

const MusicPageContent = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useRanTunesAuth();

    // Protection: Redirect to auth if no user is logged in
    useEffect(() => {
        if (!currentUser) {
            navigate('/auth');
        }
    }, [currentUser, navigate]);

    const {
        albums,
        artists,
        playlists,
        isLoading,
        error,
        isMusicDriveConnected,
        checkMusicDriveConnection,
        refreshAll,
        addSpotifyAlbum,
        removeSpotifyAlbum,
        addSpotifyPlaylist,
        scanMusicDirectory,
        fetchAlbumSongs,
        fetchPlaylists,
        fetchPlaylistSongs,
        fetchFavoritesSongs,
        deletePlaylist
    } = useAlbums();

    const {
        currentSong,
        playSong,
        isPlaying,
        togglePlay,
        handlePrevious,
        handleNext,
        playlist,
        rateSong,
        currentTime,
        duration,
        seek,
        toast,
        clearError,
        transitionPhase
    } = useMusic();

    const [activeTab, setActiveTab] = useState('albums');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [showPlaylistBuilder, setShowPlaylistBuilder] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [currentAlbumSongs, setCurrentAlbumSongs] = useState([]);
    const [favoriteSongs, setFavoriteSongs] = useState([]);
    const [editMode, setEditMode] = useState(false);

    // Spotify & Music Source State
    const [showSpotifySearch, setShowSpotifySearch] = useState(false);
    const [showSpotifyPlaylistSearch, setShowSpotifyPlaylistSearch] = useState(false);
    const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
    const [showDevicePicker, setShowDevicePicker] = useState(false);
    const [showDiskPopup, setShowDiskPopup] = useState(false);
    const [musicSource, setMusicSource] = useState(() => {
        return localStorage.getItem('music_source') || null;
    });

    const songListRef = useRef(null);

    // Format time (seconds to MM:SS) - Improved safety
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Progress percentage
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Handle seek (RTL support) - Improved safety
    const handleSeek = (e) => {
        if (!duration || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate percent from right to left for RTL
        const percent = (rect.right - e.clientX) / rect.width;
        seek(Math.max(0, Math.min(1, percent)) * duration);
    };

    useEffect(() => {
        const loggedIn = SpotifyService.isSpotifyLoggedIn();
        setIsSpotifyConnected(loggedIn);

        // Auto-select spotify if logged in and no source selected
        if (loggedIn && !musicSource) {
            setMusicSource('spotify');
            localStorage.setItem('music_source', 'spotify');
        }
    }, [musicSource]);

    const handleSpotifyLogin = () => {
        SpotifyService.loginWithSpotify();
    };

    const handleSelectMusicSource = (source) => {
        setMusicSource(source);
        localStorage.setItem('music_source', source);

        if (source === 'local') {
            checkMusicDriveConnection().then(connected => {
                if (!connected) setShowDiskPopup(true);
            });
        } else if (source === 'spotify') {
            if (!SpotifyService.isSpotifyLoggedIn()) {
                handleSpotifyLogin();
            }
        }
    };

    const handleRetryDisk = async () => {
        const connected = await checkMusicDriveConnection();
        if (connected) {
            setShowDiskPopup(false);
            refreshAll();
        }
    };

    const handleDeletePlaylist = async (e, playlistId) => {
        e.stopPropagation();
        if (window.confirm('האם אתה בטוח שברצונך למחוק את הפלייליסט הזה?')) {
            await deletePlaylist(playlistId);
        }
    };

    const filteredAlbums = useMemo(() => albums.filter(album =>
        album.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artist?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [albums, searchQuery]);

    const filteredArtists = useMemo(() => artists.filter(artist =>
        artist.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [artists, searchQuery]);

    const filteredPlaylists = useMemo(() => playlists.filter(playlist =>
        playlist.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [playlists, searchQuery]);

    useEffect(() => {
        let isMounted = true;
        const loadSongs = async () => {
            if (selectedAlbum?.id) {
                const songs = selectedAlbum.isPlaylist
                    ? await fetchPlaylistSongs(selectedAlbum.id)
                    : await fetchAlbumSongs(selectedAlbum.id);

                if (isMounted) {
                    setCurrentAlbumSongs(songs || []);
                }
            }
        };
        loadSongs();
        return () => { isMounted = false; };
    }, [selectedAlbum, fetchAlbumSongs, fetchPlaylistSongs]);

    const handleAlbumClick = async (album) => {
        setSelectedAlbum({ ...album, isPlaylist: false });
    };

    const handlePlaylistClick = async (playlist) => {
        setSelectedAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט' } });
    };

    const handleAlbumPlay = async (album) => {
        setSelectedAlbum({ ...album, isPlaylist: false });
        const songs = await fetchAlbumSongs(album.id);
        setCurrentAlbumSongs(songs);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable, true);
        }
    };

    const handlePlaylistPlay = async (playlist) => {
        setSelectedAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט' } });
        const songs = await fetchPlaylistSongs(playlist.id);
        setCurrentAlbumSongs(songs);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable, true);
        }
    };

    const handleBack = () => {
        setSelectedAlbum(null);
        setCurrentAlbumSongs([]);
    };

    const handleSongPlay = (song) => {
        if ((song?.myRating || 0) === 1) return;
        playSong(song, currentAlbumSongs);
    };

    const handleRate = async (songId, rating) => {
        const songToUpdate = currentAlbumSongs.find(s => s.id === songId) ||
            favoriteSongs.find(s => s.id === songId);

        const currentRating = songToUpdate?.myRating || 0;
        const finalRating = currentRating === rating ? 0 : rating;

        const ok = await rateSong(songId, finalRating);
        if (!ok) return;

        setCurrentAlbumSongs(prev => prev.map(s => s.id === songId ? { ...s, myRating: finalRating } : s));
        setFavoriteSongs(prev => {
            if (finalRating === 5) {
                const exists = prev.some(s => s.id === songId);
                if (exists) return prev.map(s => s.id === songId ? { ...s, myRating: 5 } : s);
                const src = currentAlbumSongs.find(s => s.id === songId);
                return src ? [{ ...src, myRating: 5 }, ...prev] : prev;
            }
            return prev.filter(s => s.id !== songId);
        });
    };

    const handleAddSpotifyAlbum = async (spotifyAlbum) => {
        try {
            const albumRecord = await addSpotifyAlbum(spotifyAlbum);
            if (!albumRecord) return;

            const tracksData = await SpotifyService.getAlbumTracks(spotifyAlbum.id);
            const tracks = tracksData.items || [];

            const businessId = currentUser?.business_id || null;
            const songInserts = tracks.map(t => ({
                title: t.name,
                album_id: albumRecord.id,
                artist_id: albumRecord.artist_id,
                track_number: t.track_number,
                duration_seconds: Math.round(t.duration_ms / 1000),
                file_path: t.uri,
                file_name: `${t.name}.spotify`,
                preview_url: t.preview_url,
                business_id: businessId
            }));

            if (songInserts.length > 0) {
                await supabase.from('rantunes_songs').upsert(songInserts, { onConflict: 'file_path, business_id' });
            }
            refreshAll();
        } catch (err) {
            console.error('Error in handleAddSpotifyAlbum:', err);
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (activeTab === 'favorites') {
            fetchFavoritesSongs().then(songs => {
                if (isMounted) setFavoriteSongs(songs || []);
            });
        }
        return () => { isMounted = false; };
    }, [activeTab, fetchFavoritesSongs]);

    const handleMiniPlayerClick = async () => {
        if (!currentSong) return;

        console.log('🔗 MiniPlayer Click - Current Song:', currentSong.title, 'Playlist ID:', currentSong.playlist_id, 'Album ID:', currentSong.album_id);

        // 1. Check if it belongs to a playlist (Best match for current context)
        if (currentSong.playlist_id) {
            const playlist = playlists.find(p => p.id === currentSong.playlist_id);
            if (playlist) {
                console.log('✅ Found Playlist:', playlist.name);
                setSelectedAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט' } });
                return;
            }
        }

        // 2. Check if it's an album song
        if (currentSong.album_id) {
            const album = albums.find(a => a.id === currentSong.album_id);
            if (album) {
                console.log('✅ Found Album:', album.name);
                setSelectedAlbum({ ...album, isPlaylist: false });
                return;
            }
        }

        // 3. Check favorites
        if (favoriteSongs.some(s => s.id === currentSong.id)) {
            console.log('✅ Found in Favorites');
            setSelectedAlbum(null);
            setActiveTab('favorites');
            return;
        }

        console.log('❌ No matching collection found for MiniPlayer click fallback');
    };

    // Auto-scroll to current song
    useEffect(() => {
        if (currentSong && selectedAlbum && songListRef.current) {
            // Find if this song is in the current view
            const isSongInView = currentAlbumSongs.some(s => s.id === currentSong.id);
            if (isSongInView) {
                const element = document.getElementById(`song-${currentSong.id}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        }
    }, [currentSong?.id, selectedAlbum?.id, currentAlbumSongs]);

    return (
        <div className="h-screen flex flex-col music-gradient-dark overflow-hidden" dir="rtl">
            {/* Premium Responsive Header */}
            <header className="flex flex-col lg:flex-row items-center justify-between p-4 gap-4 border-b border-white/10 bg-black/20 backdrop-blur-md z-10 shrink-0">
                {/* Branding & Mini Player (Desktop) / Status (Mobile) */}
                <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Music className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white text-lg font-bold leading-tight tracking-tight">RanTunes</h1>
                            <span className="text-white/30 text-[9px] uppercase tracking-widest font-black">Pro Studio v1.6.0</span>
                        </div>
                    </div>

                    {/* Spotify Status Indicator & Settings (Mobile-only) */}
                    <div className="lg:hidden flex items-center gap-2">
                        {musicSource === 'spotify' && isSpotifyConnected && (
                            <button
                                onClick={() => setShowDevicePicker(true)}
                                className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 active:scale-95 transition-all"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Connect</span>
                            </button>
                        )}
                        <button
                            onClick={() => setEditMode(!editMode)}
                            className={`p-2.5 rounded-xl transition-all active:scale-95 ${editMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 border border-white/10 text-white/40'}`}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="hidden lg:block">
                        <MiniMusicPlayer onClick={handleMiniPlayerClick} />
                    </div>
                </div>

                {/* Search Bar (Responsive) */}
                <div className="w-full lg:flex-1 lg:max-w-md">
                    <div className="relative group">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="חפש מוזיקה..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pr-10 pl-4 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>

                {/* Main Actions (Desktop-only) */}
                <div className="hidden lg:flex items-center gap-2">
                    {musicSource === 'spotify' && isSpotifyConnected && (
                        <div className="flex items-center gap-1 bg-green-500/10 rounded-xl p-1 pr-3 border border-green-500/20">
                            <button
                                onClick={() => setShowDevicePicker(true)}
                                className="flex items-center gap-2 text-green-400 text-sm font-medium hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
                            >
                                <Monitor className="w-4 h-4" />
                                <span className="text-xs uppercase font-bold tracking-tight">Devices</span>
                            </button>
                            <button
                                onClick={() => {
                                    SpotifyService.logout();
                                    setIsSpotifyConnected(false);
                                    setMusicSource(null);
                                    localStorage.removeItem('music_source');
                                    window.location.reload();
                                }}
                                className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setEditMode(!editMode)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${editMode ? 'bg-red-500/30 text-red-400 border border-red-500/50' : 'music-glass text-white'}`}
                        title="עריכה"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>

                    <button onClick={refreshAll} className="w-10 h-10 rounded-xl music-glass flex items-center justify-center text-white" title="רענן">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={async () => {
                            if (window.confirm('האם אתה בטוח שברצונך להתנתק?')) {
                                SpotifyService.logout();
                                localStorage.removeItem('music_source');
                                window.location.reload();
                            }
                        }}
                        className="w-10 h-10 rounded-xl music-glass flex items-center justify-center text-white hover:text-red-400 transition-colors"
                        title="התנתקות"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="music-split-layout flex-1 flex overflow-hidden">
                {/* Turntable Side - Compact Fixed Layout */}
                <div className="w-[340px] lg:w-[400px] shrink-0 order-last bg-black/20 border-r border-white/5 flex flex-col items-center py-4 px-4 h-full overflow-hidden justify-center relative">
                    <VinylTurntable
                        song={currentSong}
                        isPlaying={isPlaying}
                        albumArt={currentSong?.album?.cover_url}
                        hideInfo={true}
                        transitionPhase={transitionPhase}
                    />

                    {currentSong && (
                        <div className="w-full mt-4 flex items-center justify-between px-2 gap-2 shrink-0 z-10" dir="rtl">
                            {/* Like Button */}
                            <button
                                onClick={() => rateSong(currentSong?.id, currentSong?.myRating === 5 ? 0 : 5)}
                                className={`p-2 rounded-full transition-colors ${currentSong?.myRating === 5 ? 'text-green-500 bg-green-500/10' : 'text-white/30 hover:text-white'}`}
                            >
                                <ThumbsUp className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0 text-center">
                                <h2 className="text-xl font-bold text-white truncate leading-tight">
                                    {currentSong.title}
                                </h2>
                                <p className="text-white/60 text-xs truncate">
                                    {currentSong.artist?.name || 'Unknown'}
                                </p>
                            </div>

                            {/* Dislike Button */}
                            <button
                                onClick={() => rateSong(currentSong?.id, currentSong?.myRating === 1 ? 0 : 1)}
                                className={`p-2 rounded-full transition-colors ${currentSong?.myRating === 1 ? 'text-red-500 bg-red-500/10' : 'text-white/30 hover:text-white'}`}
                            >
                                <ThumbsDown className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {currentSong && (
                        <div className="w-full mt-6 px-4" dir="rtl">
                            {/* Progress bar (RTL) */}
                            <div
                                className="music-progress-container relative w-full h-2 bg-white/5 rounded-full overflow-hidden cursor-pointer group hover:h-2.5 transition-all"
                                onClick={handleSeek}
                            >
                                <div
                                    className="music-progress-bar absolute right-0 top-0 h-full bg-gradient-to-l from-purple-500 via-pink-500 to-purple-400 rounded-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-[11px] text-white/30 font-mono tracking-wide">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    )}

                    {currentSong && (
                        <>
                            {/* Player Controls (RTL Swapped) */}
                            <div className="flex items-center gap-4 mt-4" dir="ltr">
                                {/* Next (Left) */}
                                <button onClick={handleNext} className="w-12 h-12 rounded-full music-glass flex items-center justify-center hover:scale-110 transition-transform">
                                    <SkipForward className="w-5 h-5 text-white transform scale-x-[-1]" />
                                </button>
                                <button onClick={togglePlay} className="w-16 h-16 rounded-full music-gradient-purple flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                                    {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white fill-white transform scale-x-[-1] ml-[-3px]" />}
                                </button>
                                {/* Previous (Right) */}
                                <button onClick={handlePrevious} className="w-12 h-12 rounded-full music-glass flex items-center justify-center hover:scale-110 transition-transform">
                                    <SkipBack className="w-5 h-5 text-white transform scale-x-[-1]" />
                                </button>
                            </div>


                        </>
                    )}

                    {!currentSong && (
                        <div className="text-center mt-8 bg-black/20 p-6 rounded-3xl backdrop-blur-sm border border-white/5 max-w-[280px]">
                            <Music className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/60 font-medium">בחר שיר כדי להתחיל לנגן</p>
                            <p className="text-white/30 text-sm mt-1">האלבומים שלך מופיעים מצד ימין</p>
                        </div>
                    )}
                </div>

                {/* Content Side */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedAlbum ? (
                        <>
                            {/* Sticky Album Header */}
                            <div className="shrink-0 p-4 pb-2 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm border-b border-white/5">
                                <div className="flex items-center gap-4">
                                    <button onClick={handleBack} className="w-10 h-10 rounded-full music-glass flex items-center justify-center hover:bg-white/20 transition-colors">
                                        <ArrowRight className="w-5 h-5 text-white" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-white text-2xl font-bold truncate">{selectedAlbum.name}</h2>
                                        <p className="text-white/60">{selectedAlbum.artist?.name} • {currentAlbumSongs.length} שירים</p>
                                    </div>

                                    {/* Delete Button (Only for Spotify Albums or User Playlists) */}
                                    {(selectedAlbum.folder_path?.startsWith('spotify:') || selectedAlbum.isPlaylist) && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const isPlaylist = selectedAlbum.isPlaylist;
                                                const confirmMsg = isPlaylist
                                                    ? `האם למחוק את הפלייליסט "${selectedAlbum.name}"?`
                                                    : `האם למחוק את האלבום "${selectedAlbum.name}"?`;

                                                if (window.confirm(confirmMsg)) {
                                                    if (isPlaylist) {
                                                        await deletePlaylist(selectedAlbum.id);
                                                    } else {
                                                        await removeSpotifyAlbum(selectedAlbum.folder_path.replace('spotify:album:', ''));
                                                    }
                                                    handleBack(); // Return to list after delete
                                                }
                                            }}
                                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition-colors"
                                            title="מחיקה"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Songs List */}
                            <div className="flex-1 overflow-y-auto music-scrollbar p-4 pt-2" ref={songListRef}>
                                <div className="space-y-1">
                                    {currentAlbumSongs.map((song, index) => (
                                        <SongRow
                                            key={song.id}
                                            song={song}
                                            index={index}
                                            isPlaying={isPlaying}
                                            isCurrentSong={currentSong?.id === song.id}
                                            onPlay={handleSongPlay}
                                            onRate={handleRate}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto music-scrollbar">
                            <div className="p-4">
                                <nav className="flex items-center gap-2 mb-4 sticky top-0 py-4 bg-[#111]/95 backdrop-blur-xl z-20 border-b border-white/5 -mx-4 px-4 shadow-2xl">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'music-gradient-purple text-white shadow-lg shadow-purple-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            <span className="font-medium">{tab.label}</span>
                                        </button>
                                    ))}
                                </nav>

                                {activeTab === 'albums' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                        <div
                                            onClick={() => (musicSource === 'spotify' || isSpotifyConnected) ? setShowSpotifySearch(true) : setShowScanner(true)}
                                            className="group bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center p-6 hover:border-purple-500/50 hover:bg-white/10 transition-all cursor-pointer aspect-square rounded-2xl relative"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-white/50" />
                                            </div>
                                            <h3 className="text-white font-bold text-lg">הוסף אלבום</h3>
                                        </div>

                                        {!musicSource && !isMusicDriveConnected ? (
                                            <div className="col-span-full py-8">
                                                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                                                    <button onClick={() => handleSelectMusicSource('local')} className="flex-1 music-glass p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all group">
                                                        <HardDrive className="w-12 h-12 text-blue-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                                        <h3 className="text-white font-bold text-lg">כונן מקומי</h3>
                                                    </button>
                                                    <button onClick={() => handleSelectMusicSource('spotify')} className="flex-1 music-glass p-6 rounded-2xl border border-white/10 hover:border-green-500/50 hover:bg-white/5 transition-all group">
                                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                            <svg viewBox="0 0 24 24" className="w-7 h-7 text-black fill-current"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                                                        </div>
                                                        <h3 className="text-white font-bold text-lg">Spotify</h3>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            filteredAlbums.map(album => {
                                                const handleLongPress = () => {
                                                    if (album.folder_path?.startsWith('spotify:album:')) {
                                                        if (window.confirm(`האם למחוק את האלבום "${album.name}"?`)) {
                                                            removeSpotifyAlbum(album.folder_path.replace('spotify:album:', ''));
                                                        }
                                                    }
                                                };

                                                return (
                                                    <div key={album.id} className="relative group">
                                                        <div
                                                            onClick={() => handleAlbumClick(album)}
                                                            onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
                                                            className="music-glass rounded-xl overflow-hidden cursor-pointer aspect-square relative transition-all duration-300 hover:scale-105 shadow-lg border border-white/5"
                                                        >
                                                            {album.cover_url ? (
                                                                <img src={album.cover_url} alt={album.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                                    <Disc className="w-12 h-12 text-white/20" />
                                                                </div>
                                                            )}

                                                            {/* Overlay Info */}
                                                            <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-md p-3 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                                                                <h3 className="text-white text-sm font-bold truncate leading-tight mb-1">{album.name}</h3>
                                                                <p className="text-white/70 text-xs truncate leading-tight">{album.artist?.name}</p>
                                                            </div>
                                                        </div>

                                                        {editMode && album.folder_path?.startsWith('spotify:') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm(`האם למחוק את "${album.name}"?`)) removeSpotifyAlbum(album.folder_path.replace('spotify:album:', ''));
                                                                }}
                                                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg z-10 hover:bg-red-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {activeTab === 'favorites' && (
                                    <div className="space-y-1">
                                        {favoriteSongs.map((song, index) => (
                                            <SongRow
                                                key={song.id}
                                                song={song}
                                                index={index}
                                                isPlaying={isPlaying}
                                                isCurrentSong={currentSong?.id === song.id}
                                                onPlay={(s) => playSong(s, favoriteSongs)}
                                                onRate={handleRate}
                                            />
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'artists' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {filteredArtists.map(artist => (
                                            <div key={artist.id} className="music-glass rounded-2xl p-4 text-center cursor-pointer hover:bg-white/5 transition-all">
                                                <div className="w-20 h-20 mx-auto rounded-full music-gradient-pink mb-3 flex items-center justify-center">
                                                    <User className="w-8 h-8 text-white/50" />
                                                </div>
                                                <h3 className="text-white font-medium truncate">{artist.name}</h3>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'playlists' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                        <div onClick={() => setShowSpotifyPlaylistSearch(true)} className="music-playlist-card p-6 cursor-pointer border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center aspect-square rounded-2xl hover:border-green-500/50 hover:bg-white/5 transition-all">
                                            <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-400 mb-2 fill-current"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                                            <h3 className="text-white font-bold">ייבוא מ-Spotify</h3>
                                        </div>
                                        {filteredPlaylists.filter(p => p && p.id).map(playlist => (
                                            <div key={playlist.id} className="relative group p-0 aspect-square">
                                                <div
                                                    onClick={() => handlePlaylistClick(playlist)}
                                                    onContextMenu={(e) => { e.preventDefault(); handleDeletePlaylist(e, playlist.id); }}
                                                    className="music-glass rounded-xl overflow-hidden cursor-pointer w-full h-full relative transition-all duration-300 hover:scale-105 shadow-lg"
                                                >
                                                    {playlist.cover_url ? (
                                                        <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                            <ListMusic className="w-12 h-12 text-white/20" />
                                                        </div>
                                                    )}

                                                    {/* Overlay Info */}
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-md p-3 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                        <h3 className="text-white text-sm font-bold truncate leading-tight mb-1">{playlist.name}</h3>
                                                        <p className="text-white/70 text-xs truncate leading-tight">פלייליסט</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                                    className="absolute -top-2 -right-2 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/40 hover:text-red-400 z-10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showPlaylistBuilder && (
                    <PlaylistBuilder onClose={() => setShowPlaylistBuilder(false)} onSuccess={() => { setShowPlaylistBuilder(false); fetchPlaylists(); }} />
                )}
                {showScanner && (
                    <DirectoryScanner onClose={() => setShowScanner(false)} onScan={scanMusicDirectory} />
                )}
                {showSpotifySearch && (
                    <SpotifyAlbumSearch
                        onClose={() => setShowSpotifySearch(false)}
                        userAlbumIds={albums.filter(a => a.folder_path?.startsWith('spotify:album:')).map(a => a.folder_path.replace('spotify:album:', ''))}
                        onAddAlbum={handleAddSpotifyAlbum}
                        onRemoveAlbum={removeSpotifyAlbum}
                    />
                )}
                {showSpotifyPlaylistSearch && (
                    <SpotifyPlaylistSearch
                        onClose={() => setShowSpotifyPlaylistSearch(false)}
                        userPlaylistIds={playlists.map(p => p.id)}
                        onAddPlaylist={async (playlist, tracks) => {
                            await addSpotifyPlaylist(playlist, tracks);
                            setShowSpotifyPlaylistSearch(false);
                        }}
                    />
                )}
                {showDevicePicker && (
                    <SpotifyDevicePicker onClose={() => setShowDevicePicker(false)} />
                )}
                {showDiskPopup && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDiskPopup(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="music-glass rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-amber-500/20 mb-6 flex items-center justify-center mx-auto"><AlertCircle className="w-10 h-10 text-amber-400" /></div>
                                <h3 className="text-white text-2xl font-bold mb-3">כונן לא מחובר</h3>
                                <p className="text-white/60 mb-8">לא הצלחנו לזהות את כונן המוזיקה.<br />וודא שהכונן מחובר כראוי ונסה שוב.</p>
                                <div className="flex gap-3 justify-center">
                                    <button onClick={handleRetryDisk} className="px-8 py-3 music-gradient-purple rounded-xl text-white font-bold flex items-center gap-2"><RefreshCw className="w-5 h-5" /> נסה שוב</button>
                                    <button onClick={() => setShowDiskPopup(false)} className="px-8 py-3 bg-white/10 rounded-xl text-white font-medium">ביטול</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Toast Notification */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${toast.type === 'error'
                                ? 'bg-red-500/20 border-red-500/30 text-red-200'
                                : toast.type === 'success'
                                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
                                    : 'bg-purple-500/20 border-purple-500/30 text-purple-200'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-purple-400'
                                }`} />
                            <span className="font-medium text-sm">{toast.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </div>
    );
};

const MusicPage = () => <MusicPageContent />;
export default MusicPage;
