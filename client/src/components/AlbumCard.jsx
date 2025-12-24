import React from 'react';
import { Play, Music } from 'lucide-react';

const MUSIC_API_URL = import.meta.env.VITE_MUSIC_API_URL ||
    import.meta.env.VITE_MANAGER_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8080';

// Helper to convert local path to backend URL
const getCoverUrl = (localPath) => {
    if (!localPath) return null;
    if (localPath.startsWith('http')) return localPath;
    return `${MUSIC_API_URL}/music/cover?path=${encodeURIComponent(localPath)}`;
};

/**
 * Album card with cover art, hover effects, and play button
 */
const AlbumCard = ({
    album,
    onPlay,
    onClick,
    showPlayCount = false
}) => {
    const handlePlay = (e) => {
        e.stopPropagation();
        onPlay?.(album);
    };

    const handleClick = () => {
        onClick?.(album);
    };

    // Generate a gradient based on album name for albums without covers
    const getGradient = (name) => {
        const gradients = [
            'music-gradient-purple',
            'music-gradient-pink',
            'music-gradient-blue',
            'music-gradient-orange',
            'music-gradient-green',
            'music-gradient-sunset'
        ];
        const index = name?.charCodeAt(0) % gradients.length || 0;
        return gradients[index];
    };

    const coverUrl = getCoverUrl(album.cover_url);

    return (
        <div
            className="music-album-card group relative aspect-square bg-white/5 rounded-2xl overflow-hidden cursor-pointer"
            onClick={handleClick}
        >
            {/* Album Cover */}
            <div className="w-full h-full relative">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt={album.name}
                        className="music-album-cover w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className={`w-full h-full ${getGradient(album.name)} flex items-center justify-center`}>
                        <Music className="w-16 h-16 text-white/50" />
                    </div>
                )}

                {/* Dark Overlay on Hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Info - Only visible on hover */}
            <div className="music-album-info absolute inset-x-0 bottom-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <h3 className="text-white font-bold text-lg truncate">
                    {album.name}
                </h3>
                <p className="text-white/70 text-sm truncate">
                    {album.artist?.name || 'אמן לא ידוע'}
                </p>
            </div>

            {/* Play button */}
            <button
                onClick={handlePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                   w-14 h-14 rounded-full music-gradient-purple
                   flex items-center justify-center
                   opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300
                   shadow-lg hover:scale-110 z-10"
            >
                <Play className="w-6 h-6 text-white fill-white mr-[-2px]" />
            </button>
        </div>
    );
};

export default AlbumCard;
