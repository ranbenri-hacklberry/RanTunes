import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Music, Disc, ListMusic, Search, Upload, RefreshCw,
    ArrowRight, Sparkles, User, Play, FolderOpen, Heart,
    Pause, SkipForward, SkipBack, Trash2, X, HardDrive, AlertCircle, LogOut, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '@/context/MusicContext';
import { useAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/context/AuthContext';
import AlbumCard from '@/components/AlbumCard';
import VinylTurntable from '@/components/VinylTurntable';
import SongRow from '@/components/SongRow';
import MiniMusicPlayer from '@/components/MiniMusicPlayer';
import MusicPlayer from '@/components/MusicPlayer';
import PlaylistBuilder from './components/PlaylistBuilder';
import DirectoryScanner from './components/DirectoryScanner';
import SpotifyAlbumSearch from './components/SpotifyAlbumSearch';
import SpotifyPlaylistSearch from './components/SpotifyPlaylistSearch';
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
    const { currentUser } = useAuth();

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
        handleNext,
        handlePrevious,
        playlist,
        rateSong
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
    const [showDiskPopup, setShowDiskPopup] = useState(false);
    const [musicSource, setMusicSource] = useState(() => {
        return localStorage.getItem('music_source') || null;
    });

    useEffect(() => {
        setIsSpotifyConnected(SpotifyService.isSpotifyLoggedIn());
    }, []);

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

    const filteredAlbums = albums.filter(album =>
        album.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artist?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredArtists = artists.filter(artist =>
        artist.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPlaylists = playlists.filter(playlist =>
        playlist.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const loadSongs = async () => {
            if (selectedAlbum?.id) {
                if (selectedAlbum.isPlaylist) {
                    const songs = await fetchPlaylistSongs(selectedAlbum.id);
                    setCurrentAlbumSongs(songs);
                } else {
                    const songs = await fetchAlbumSongs(selectedAlbum.id);
                    setCurrentAlbumSongs(songs);
                }
            }
        };
        loadSongs();
    }, [selectedAlbum, fetchAlbumSongs, fetchPlaylistSongs]);

    const handleAlbumClick = async (album) => {
        setSelectedAlbum({ ...album, isPlaylist: false });
    };

    const handlePlaylistClick = async (playlist) => {
        setSelectedAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט חכם' } });
    };

    const handleAlbumPlay = async (album) => {
        setSelectedAlbum({ ...album, isPlaylist: false });
        const songs = await fetchAlbumSongs(album.id);
        setCurrentAlbumSongs(songs);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable);
        }
    };

    const handlePlaylistPlay = async (playlist) => {
        setSelectedAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט חכם' } });
        const songs = await fetchPlaylistSongs(playlist.id);
        setCurrentAlbumSongs(songs);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable);
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
        if (activeTab === 'favorites') {
            fetchFavoritesSongs().then(songs => setFavoriteSongs(songs || []));
        }
    }, [activeTab, fetchFavoritesSongs]);

    return (
        <div className="h-screen flex flex-col music-gradient-dark overflow-hidden" dir="rtl">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Music className="w-6 h-6 text-purple-400" />
                        <h1 className="text-white text-xl font-bold">RanTunes</h1>
                    </div>
                    <div className="hidden lg:block">
                        <MiniMusicPlayer />
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-4">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="חפש אלבומים, אמנים..."
                            className="w-full bg-white/10 border border-white/10 rounded-xl py-2 pr-10 pl-4 text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {musicSource === 'spotify' && isSpotifyConnected && (
                        <div className="flex items-center gap-1 bg-green-500/10 rounded-xl p-1 pr-3 border border-green-500/20">
                            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                                <span className="hidden sm:inline">Spotify</span>
                            </div>
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
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${editMode ? 'bg-red-500/30 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'music-glass text-white'}`}
                    >
                        <Pencil className="w-5 h-5" />
                    </button>

                    <button onClick={refreshAll} className="w-10 h-10 rounded-xl music-glass flex items-center justify-center text-white">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={async () => {
                            const choice = window.confirm(
                                '🔄 איפוס מלא?\n\n' +
                                'לחץ OK למחיקת כל האלבומים והתנתקות מ-Spotify\n' +
                                'לחץ Cancel רק להתנתקות (בלי למחוק אלבומים)'
                            );

                            // Clear Spotify tokens
                            SpotifyService.logout();
                            localStorage.removeItem('music_source');
                            localStorage.removeItem('rantunes_user');
                            localStorage.removeItem('spotify_access_token');
                            localStorage.removeItem('spotify_refresh_token');
                            localStorage.removeItem('spotify_token_expiry');

                            if (choice) {
                                // Full reset - delete all albums, songs, artists
                                try {
                                    console.log('🧹 Cleaning database...');
                                    await supabase.from('rantunes_songs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                    await supabase.from('rantunes_albums').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                    await supabase.from('rantunes_artists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                    console.log('✅ Database cleaned');
                                } catch (err) {
                                    console.error('Error cleaning database:', err);
                                }
                            }

                            window.location.reload();
                        }}
                        className="w-10 h-10 rounded-xl music-glass flex items-center justify-center text-white hover:text-red-400 transition-colors"
                        title="איפוס והתנתקות"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="music-split-layout flex-1 flex overflow-hidden">
                {/* Turntable Side */}
                <div className="w-[380px] lg:w-[450px] shrink-0 order-last bg-black/20 border-r border-white/5 flex flex-col items-center justify-center p-6">
                    <VinylTurntable
                        song={currentSong}
                        isPlaying={isPlaying}
                        albumArt={currentSong?.album?.cover_url}
                    />

                    {currentSong && (
                        <div className="flex items-center gap-4 mt-6" dir="ltr">
                            <button onClick={handlePrevious} className="w-12 h-12 rounded-full music-glass flex items-center justify-center hover:scale-110 transition-transform">
                                <SkipBack className="w-5 h-5 text-white" />
                            </button>
                            <button onClick={togglePlay} className="w-16 h-16 rounded-full music-gradient-purple flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                                {isPlaying ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 text-white fill-white mr-[-3px]" />}
                            </button>
                            <button onClick={handleNext} className="w-12 h-12 rounded-full music-glass flex items-center justify-center hover:scale-110 transition-transform">
                                <SkipForward className="w-5 h-5 text-white" />
                            </button>
                        </div>
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
                    <div className="flex-1 overflow-y-auto music-scrollbar">
                        {selectedAlbum ? (
                            <div className="p-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={handleBack} className="w-10 h-10 rounded-full music-glass flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-white" />
                                    </button>
                                    <div>
                                        <h2 className="text-white text-2xl font-bold">{selectedAlbum.name}</h2>
                                        <p className="text-white/60">{selectedAlbum.artist?.name} • {currentAlbumSongs.length} שירים</p>
                                    </div>
                                </div>
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
                        ) : (
                            <div className="p-4">
                                <nav className="flex items-center gap-2 mb-4">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'music-gradient-purple text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            <span className="font-medium">{tab.label}</span>
                                        </button>
                                    ))}
                                </nav>

                                {activeTab === 'albums' && (
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                        <div
                                            onClick={() => musicSource === 'spotify' ? setShowSpotifySearch(true) : setShowScanner(true)}
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
                                            filteredAlbums.map(album => (
                                                <div key={album.id} className="relative">
                                                    {editMode && album.folder_path?.startsWith('spotify:') && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`האם למחוק את "${album.name}"?`)) removeSpotifyAlbum(album.folder_path.replace('spotify:album:', ''));
                                                            }}
                                                            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <AlbumCard album={album} onClick={handleAlbumClick} onPlay={handleAlbumPlay} />
                                                </div>
                                            ))
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
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        <div onClick={() => setShowSpotifyPlaylistSearch(true)} className="music-playlist-card p-6 cursor-pointer border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center aspect-square rounded-2xl hover:border-green-500/50 hover:bg-white/5 transition-all">
                                            <svg viewBox="0 0 24 24" className="w-10 h-10 text-green-400 mb-2 fill-current"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                                            <h3 className="text-white font-bold">ייבוא מ-Spotify</h3>
                                        </div>
                                        {filteredPlaylists.map(playlist => (
                                            <div key={playlist.id} className="music-glass rounded-2xl overflow-hidden group relative">
                                                <div className="aspect-square bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center relative cursor-pointer" onClick={() => handlePlaylistClick(playlist)}>
                                                    <ListMusic className="w-16 h-16 text-white/30" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button onClick={(e) => { e.stopPropagation(); handlePlaylistPlay(playlist); }} className="w-14 h-14 rounded-full music-gradient-purple flex items-center justify-center shadow-lg"><Play className="w-6 h-6 text-white fill-white" /></button>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-white font-bold truncate cursor-pointer" onClick={() => handlePlaylistClick(playlist)}>{playlist.name}</h3>
                                                        <button onClick={(e) => handleDeletePlaylist(e, playlist.id)} className="text-white/30 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
            </AnimatePresence>
        </div>
    );
};

const MusicPage = () => <MusicPageContent />;
export default MusicPage;
