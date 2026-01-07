import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Upload, Loader2, HardDrive, Trash2, Play } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import { useAlbums } from '@/hooks/useAlbums';
import { useRanTunesAuth } from '@/context/RanTunesAuthContext';
import AlbumCard from '@/components/AlbumCard';
import SongRow from '@/components/SongRow';
import SpotifyAlbumSearch from '@/pages/components/SpotifyAlbumSearch';
import SpotifyService from '@/lib/spotifyService';
import { supabase } from '@/lib/supabase';
import { isSystemRTL } from '@/lib/localeUtils';

const MobileAlbums = () => {
    const { playSong, currentSong, isPlaying, rateSong } = useMusic();
    const { user: currentUser } = useRanTunesAuth();
    const {
        albums,
        isLoading,
        fetchAlbumSongs,
        addSpotifyAlbum,
        removeSpotifyAlbum,
        refreshAll,
        isMusicDriveConnected
    } = useAlbums();

    // Locale-aware labels
    const rtl = useMemo(() => isSystemRTL(), []);
    const labels = useMemo(() => ({
        albums: rtl ? 'אלבומים' : 'Albums',
        connectSpotify: rtl ? 'התחבר ל-Spotify' : 'Connect to Spotify',
        spotifyPremiumRequired: rtl ? 'נדרש Spotify Premium להשמעה' : 'Spotify Premium required for playback',
        spotifyConnected: rtl ? 'Spotify מחובר' : 'Spotify Connected',
        addAlbum: rtl ? 'הוסף אלבום' : 'Add Album',
        noAlbumsYet: rtl ? 'אין אלבומים עדיין. לחץ על "הוסף אלבום" כדי להתחיל.' : 'No albums yet. Click "Add Album" to get started.',
        noAlbumsFound: rtl ? 'לא נמצאו אלבומים' : 'No albums found',
    }), [rtl]);
    const BackArrow = rtl ? ArrowRight : ArrowLeft;

    // View states
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [albumSongs, setAlbumSongs] = useState([]);
    const [showSpotifySearch, setShowSpotifySearch] = useState(false);
    const [musicSource, setMusicSource] = useState(() => localStorage.getItem('music_source') || null);

    // Check Spotify connection on every render - don't cache in state
    const isSpotifyConnected = SpotifyService.isSpotifyLoggedIn();

    // Load songs when album is selected
    useEffect(() => {
        if (selectedAlbum) {
            fetchAlbumSongs(selectedAlbum.id).then(songs => setAlbumSongs(songs || []));
        }
    }, [selectedAlbum, fetchAlbumSongs]);

    const handleAlbumClick = (album) => {
        setSelectedAlbum(album);
    };

    const handleAlbumPlay = async (album) => {
        const songs = await fetchAlbumSongs(album.id);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable, true);
        }
    };

    const handleSongPlay = (song) => {
        if ((song?.myRating || 0) === 1) return;
        playSong(song, albumSongs);
    };

    const handleRate = async (songId, rating) => {
        const songToUpdate = albumSongs.find(s => s.id === songId);
        const currentRating = songToUpdate?.myRating || 0;
        const finalRating = currentRating === rating ? 0 : rating;
        const ok = await rateSong(songId, finalRating);
        if (ok) {
            setAlbumSongs(prev => prev.map(s => s.id === songId ? { ...s, myRating: finalRating } : s));
        }
    };

    const handleBack = () => {
        setSelectedAlbum(null);
        setAlbumSongs([]);
    };

    const handleSelectMusicSource = (source) => {
        setMusicSource(source);
        localStorage.setItem('music_source', source);
        if (source === 'spotify' && !SpotifyService.isSpotifyLoggedIn()) {
            SpotifyService.loginWithSpotify();
        }
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
            console.error('Error adding Spotify album:', err);
        }
    };

    // Album detail view
    if (selectedAlbum) {
        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                        >
                            <BackArrow className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-white truncate">{selectedAlbum.name}</h2>
                            <p className="text-white/50 text-sm truncate">{selectedAlbum.artist?.name}</p>
                        </div>
                        <button
                            onClick={() => handleAlbumPlay(selectedAlbum)}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                        >
                            <Play className="w-6 h-6 text-white fill-white transform scale-x-[-1] ml-[-2px]" />
                        </button>
                    </div>
                </div>

                {/* Songs list */}
                <div className="flex-1 overflow-y-auto p-4">
                    {albumSongs.map((song, index) => (
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
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6 mt-2 text-white">{labels.albums}</h1>

            {/* Spotify Login - Show when NOT connected */}
            {!isSpotifyConnected && (
                <div className="flex flex-col gap-4 mb-6">
                    <button
                        onClick={() => handleSelectMusicSource('spotify')}
                        className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 text-black fill-current">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg">{labels.connectSpotify}</h3>
                            <p className="text-green-400/70 text-sm">{labels.spotifyPremiumRequired}</p>
                        </div>
                    </button>
                </div>
            )}

            {/* Spotify Connected Badge */}
            {isSpotifyConnected && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-400 fill-current">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <span className="text-green-400 text-sm font-medium">{labels.spotifyConnected}</span>
                </div>
            )}

            {isLoading && albums.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {/* Add Album Button */}
                    <div
                        onClick={() => setShowSpotifySearch(true)}
                        className="aspect-square bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                            <Upload className="w-6 h-6 text-white/50" />
                        </div>
                        <span className="text-white/70 font-medium text-sm">{labels.addAlbum}</span>
                    </div>

                    {/* Albums */}
                    {albums.map((album) => (
                        <AlbumCard
                            key={album.id}
                            album={album}
                            onClick={() => handleAlbumClick(album)}
                            onPlay={() => handleAlbumPlay(album)}
                        />
                    ))}
                </div>
            )}

            {albums.length === 0 && !isLoading && musicSource && (
                <div className="text-center text-white/50 py-10">
                    {labels.noAlbumsYet}
                </div>
            )}

            {/* Spotify Album Search Modal */}
            {showSpotifySearch && (
                <SpotifyAlbumSearch
                    onClose={() => setShowSpotifySearch(false)}
                    userAlbumIds={albums.filter(a => a.folder_path?.startsWith('spotify:album:')).map(a => a.folder_path.replace('spotify:album:', ''))}
                    onAddAlbum={handleAddSpotifyAlbum}
                    onRemoveAlbum={removeSpotifyAlbum}
                />
            )}
        </div>
    );
};

export default MobileAlbums;
