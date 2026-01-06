import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Music, Disc, ListMusic, Search, Upload, RefreshCw,
    ArrowRight, Sparkles, User, Play, FolderOpen, Heart,
    Pause, SkipForward, SkipBack, Trash2, X, HardDrive, AlertCircle, LogOut, Pencil,
    ThumbsUp, ThumbsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '@/context/MusicContext';
import { useAlbums } from '@/hooks/useAlbums';
import { useRanTunesAuth } from '@/context/RanTunesAuthContext';
import MiniMusicPlayer from '@/components/MiniMusicPlayer';
import PlaylistBuilder from './components/PlaylistBuilder';
import DirectoryScanner from './components/DirectoryScanner';
import SpotifyAlbumSearch from './components/SpotifyAlbumSearch';
import SpotifyPlaylistSearch from './components/SpotifyPlaylistSearch';
import CollectionGrid from './components/CollectionGrid';
import AlbumDetailView from './components/AlbumDetailView';
import PlayerSidebar from './components/PlayerSidebar';
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
    const { user: currentUser, logout } = useRanTunesAuth();

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

    const songListRef = useRef(null);

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

    // Auto-scroll to current song when album view opens
    useEffect(() => {
        if ((selectedAlbum || activeTab === 'favorites') && currentSong && currentAlbumSongs.length > 0) {
            const isSongInList = currentAlbumSongs.some(s => s.id === currentSong.id);
            if (isSongInList) {
                // Short delay to ensure DOM is rendered
                const timer = setTimeout(() => {
                    const songElement = document.getElementById(`song-${currentSong.id}`);
                    if (songElement) {
                        songElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [selectedAlbum, activeTab, currentSong, currentAlbumSongs]);

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
        setSelectedAlbum({ ...playlist, isPlaylist: true, artist: { name: 'פלייליסט' } });
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
            fetchFavoritesSongs().then(songs => {
                const results = songs || [];
                setFavoriteSongs(results);
                setCurrentAlbumSongs(results);
            });
        }
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
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <Music className="w-6 h-6 text-purple-400" />
                            <h1 className="text-white text-xl font-bold">RanTunes</h1>
                        </div>
                        <span className="text-white/30 text-xs mr-8">v0.9.15</span>
                    </div>
                </div>
                <div className="hidden lg:block">
                    <MiniMusicPlayer onClick={handleMiniPlayerClick} />
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-white font-medium">{currentUser?.name}</span>
                        <span className="text-white/40 text-xs">מנוי פרימיום</span>
                    </div>
                    <button onClick={logout} className="w-10 h-10 rounded-full music-glass flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {selectedAlbum || activeTab === 'favorites' ? (
                        <AlbumDetailView
                            selectedAlbum={selectedAlbum || { name: 'השירים האהובים שלי', isPlaylist: true }}
                            currentAlbumSongs={currentAlbumSongs}
                            onBack={handleBack}
                            currentSong={currentSong}
                            isPlaying={isPlaying}
                            playSong={playSong}
                            rateSong={rateSong}
                            songListRef={songListRef}
                        />
                    ) : (
                        <CollectionGrid
                            activeTab={activeTab}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            TABS={TABS}
                            setActiveTab={setActiveTab}
                            musicSource={musicSource}
                            handleSelectMusicSource={handleSelectMusicSource}
                            isSpotifyConnected={isSpotifyConnected}
                            handleSpotifyLogin={handleSpotifyLogin}
                            filteredAlbums={filteredAlbums}
                            onSelectAlbum={setSelectedAlbum}
                            onPlayAlbum={handleAlbumPlay}
                            onPlayPlaylist={handlePlaylistPlay}
                            filteredArtists={filteredArtists}
                            filteredPlaylists={filteredPlaylists}
                            favoriteSongs={favoriteSongs}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            handleDeletePlaylist={handleDeletePlaylist}
                            setShowPlaylistBuilder={setShowPlaylistBuilder}
                            setShowSpotifySearch={setShowSpotifySearch}
                            setShowSpotifyPlaylistSearch={setShowSpotifyPlaylistSearch}
                            setShowScanner={setShowScanner}
                        />
                    )}
                </div>

                {/* Left Sidebar (Player) */}
                <PlayerSidebar
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    togglePlay={togglePlay}
                    handleNext={handleNext}
                    handlePrevious={handlePrevious}
                    rateSong={rateSong}
                />
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
