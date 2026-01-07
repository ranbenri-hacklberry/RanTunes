import React, { useState, useEffect } from 'react';
import { ArrowRight, Upload, Loader2, ListMusic, Play } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import { useAlbums } from '@/hooks/useAlbums';
import SongRow from '@/components/SongRow';
import SpotifyPlaylistSearch from '@/pages/components/SpotifyPlaylistSearch';

const MobilePlaylists = () => {
    const { playSong, currentSong, isPlaying, rateSong } = useMusic();
    const {
        playlists,
        isLoading,
        fetchPlaylistSongs,
        addSpotifyPlaylist,
        deletePlaylist,
        refreshAll
    } = useAlbums();

    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistSongs, setPlaylistSongs] = useState([]);
    const [showSpotifySearch, setShowSpotifySearch] = useState(false);

    // Load songs when playlist is selected
    useEffect(() => {
        if (selectedPlaylist) {
            fetchPlaylistSongs(selectedPlaylist.id).then(songs => setPlaylistSongs(songs || []));
        }
    }, [selectedPlaylist, fetchPlaylistSongs]);

    const handlePlaylistClick = (playlist) => {
        setSelectedPlaylist(playlist);
    };

    const handlePlaylistPlay = async (playlist) => {
        const songs = await fetchPlaylistSongs(playlist.id);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable, true);
        }
    };

    const handleSongPlay = (song) => {
        if ((song?.myRating || 0) === 1) return;
        playSong(song, playlistSongs);
    };

    const handleRate = async (songId, rating) => {
        const songToUpdate = playlistSongs.find(s => s.id === songId);
        const currentRating = songToUpdate?.myRating || 0;
        const finalRating = currentRating === rating ? 0 : rating;
        const ok = await rateSong(songId, finalRating);
        if (ok) {
            setPlaylistSongs(prev => prev.map(s => s.id === songId ? { ...s, myRating: finalRating } : s));
        }
    };

    const handleBack = () => {
        setSelectedPlaylist(null);
        setPlaylistSongs([]);
    };

    // Playlist detail view
    if (selectedPlaylist) {
        return (
            <div className="flex flex-col h-full">
                <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                        >
                            <ArrowRight className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-white truncate">{selectedPlaylist.name}</h2>
                            <p className="text-white/50 text-sm">{playlistSongs.length} שירים</p>
                        </div>
                        <button
                            onClick={() => handlePlaylistPlay(selectedPlaylist)}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                        >
                            <Play className="w-6 h-6 text-white fill-white transform scale-x-[-1] ml-[-2px]" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {playlistSongs.map((song, index) => (
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

    // Playlists grid view
    return (
        <div className="p-4 pt-0">
            {isLoading && playlists.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {/* Add Playlist Button */}
                    <div
                        onClick={() => setShowSpotifySearch(true)}
                        className="aspect-square bg-white/5 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-400 fill-current">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                        </div>
                        <span className="text-white/70 font-medium text-sm">ייבוא מ-Spotify</span>
                    </div>

                    {/* Playlists */}
                    {playlists.map((playlist) => (
                        <div
                            key={playlist.id}
                            onClick={() => handlePlaylistClick(playlist)}
                            className="aspect-square bg-white/5 rounded-2xl overflow-hidden cursor-pointer relative group active:scale-95 transition-transform"
                        >
                            {playlist.cover_url ? (
                                <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                                    <ListMusic className="w-12 h-12 text-white/30" />
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm p-3">
                                <h3 className="text-white text-sm font-bold truncate">{playlist.name}</h3>
                            </div>
                            {/* Play button overlay */}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handlePlaylistPlay(playlist); }}
                                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                                >
                                    <Play className="w-6 h-6 text-white fill-white transform scale-x-[-1] ml-[-2px]" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {playlists.length === 0 && !isLoading && (
                <div className="text-center text-white/50 py-10">
                    אין פלייליסטים עדיין. ייבא מ-Spotify כדי להתחיל.
                </div>
            )}

            {/* Spotify Playlist Search Modal */}
            {showSpotifySearch && (
                <SpotifyPlaylistSearch
                    onClose={() => setShowSpotifySearch(false)}
                    userPlaylistIds={playlists.map(p => p.id)}
                    onAddPlaylist={async (playlist, tracks) => {
                        await addSpotifyPlaylist(playlist, tracks);
                        setShowSpotifySearch(false);
                    }}
                />
            )}
        </div>
    );
};

export default MobilePlaylists;
