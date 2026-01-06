import React, { useEffect } from 'react';
import { useMusic } from '@/context/MusicContext';
import { useAlbums } from '@/hooks/useAlbums';
import AlbumCard from '@/components/AlbumCard';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MobileHome = () => {
    const { playSong } = useMusic();
    const { albums, isLoading, refreshAll, fetchAlbumSongs } = useAlbums();
    const navigate = useNavigate();

    useEffect(() => {
        refreshAll();
    }, []); // Fetch on mount

    const handleAlbumPlay = async (album) => {
        // Quick play action
        const songs = await fetchAlbumSongs(album.id);
        const playable = (songs || []).filter(s => (s?.myRating || 0) !== 1);
        if (playable.length > 0) {
            playSong(playable[0], playable, true);
        }
    };

    return (
        <div className="p-4 pb-24">
            <h1 className="text-2xl font-bold mb-6 mt-2 text-white">בוקר טוב</h1>

            {isLoading && albums.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {albums.map((album) => (
                        <AlbumCard
                            key={album.id}
                            album={album}
                            // In mobile, we might want to navigate on click rather than play distinct
                            // but let's keep it simple: play on play button, maybe details on card?
                            // For now, Play button works, Card -> Play
                            onClick={() => handleAlbumPlay(album)}
                            onPlay={() => handleAlbumPlay(album)}
                        />
                    ))}

                    {albums.length === 0 && !isLoading && (
                        <div className="col-span-2 text-center text-white/50 py-10">
                            לא נמצאו אלבומים
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileHome;
