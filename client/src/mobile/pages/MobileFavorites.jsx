import React, { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useRanTunes } from '@/context/RanTunesContext';
import { useAlbums } from '@/hooks/useAlbums';
import SongRow from '@/components/SongRow';

const MobileFavorites = () => {
    const { playSong, currentSong, isPlaying, rateSong } = useRanTunes();
    const { fetchFavoritesSongs, isLoading } = useAlbums();

    const [favoriteSongs, setFavoriteSongs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFavorites = async () => {
            setLoading(true);
            const songs = await fetchFavoritesSongs();
            setFavoriteSongs(songs || []);
            setLoading(false);
        };
        loadFavorites();
    }, [fetchFavoritesSongs]);

    const handleSongPlay = (song) => {
        if ((song?.myRating || 0) === 1) return;
        playSong(song, favoriteSongs);
    };

    const handleRate = async (songId, rating) => {
        const songToUpdate = favoriteSongs.find(s => s.id === songId);
        const currentRating = songToUpdate?.myRating || 0;
        const finalRating = currentRating === rating ? 0 : rating;
        const ok = await rateSong(songId, finalRating);
        if (ok) {
            if (finalRating !== 5) {
                // Remove from favorites if not rated 5
                setFavoriteSongs(prev => prev.filter(s => s.id !== songId));
            } else {
                setFavoriteSongs(prev => prev.map(s => s.id === songId ? { ...s, myRating: finalRating } : s));
            }
        }
    };

    return (
        <div className="p-4 pt-0">
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : favoriteSongs.length === 0 ? (
                <div className="text-center text-white/50 py-10">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-white/20" />
                    <p>אין שירים מועדפים עדיין.</p>
                    <p className="text-sm mt-2">לחץ על 👍 על שירים כדי להוסיף אותם למועדפים.</p>
                </div>
            ) : (
                <div>
                    <p className="text-white/50 text-sm mb-4">{favoriteSongs.length} שירים</p>
                    {favoriteSongs.map((song, index) => (
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
            )}
        </div>
    );
};

export default MobileFavorites;
