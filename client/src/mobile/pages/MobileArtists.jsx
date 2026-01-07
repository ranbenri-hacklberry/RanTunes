import React from 'react';
import { User, Loader2 } from 'lucide-react';
import { useAlbums } from '@/hooks/useAlbums';

const MobileArtists = () => {
    const { artists, isLoading } = useAlbums();

    return (
        <div className="p-4 pt-0">
            {isLoading && artists.length === 0 ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4">
                    {artists.map((artist) => (
                        <div
                            key={artist.id}
                            className="flex flex-col items-center p-4 bg-white/5 rounded-2xl"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center mb-3">
                                <User className="w-8 h-8 text-white/50" />
                            </div>
                            <h3 className="text-white text-sm font-medium text-center truncate w-full">
                                {artist.name}
                            </h3>
                        </div>
                    ))}
                </div>
            )}

            {artists.length === 0 && !isLoading && (
                <div className="text-center text-white/50 py-10">
                    אין אמנים עדיין. הוסף אלבומים כדי לראות אמנים.
                </div>
            )}
        </div>
    );
};

export default MobileArtists;
