import React from 'react';
import { Play, Pause, ThumbsUp, ThumbsDown } from 'lucide-react';

/**
 * Song row component for album view
 */
const SongRow = ({
    song,
    index,
    isPlaying = false,
    isCurrentSong = false,
    onPlay,
    onEdit,
    onRate
}) => {
    const handlePlay = () => {
        const fn = onPlay || onEdit;
        fn?.(song);
    };

    const handleRate = (rating) => {
        // Like (5) or Dislike (1)
        onRate?.(song.id, rating);
    };

    const myRating = song?.myRating || 0;
    const isLiked = myRating === 5;
    const isDisliked = myRating === 1;

    // Format duration (seconds to MM:SS)
    const formatDuration = (seconds) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const trackNumber = typeof index === 'number' && !isNaN(index) ? index + 1 : (song.track_number || '');
    const artistName = (song.artist && song.artist.name) || song.artist || '';

    return (
        <div
            id={`song-${song.id}`}
            className={`music-song-row ${isCurrentSong ? 'playing' : ''} group cursor-pointer hover:bg-white/5 transition-colors`}
            onClick={handlePlay}
        >
            {/* Track number / Playing indicator */}
            <div className="w-10 flex-shrink-0 flex justify-center">
                {isCurrentSong && isPlaying ? (
                    <div className="music-playing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                ) : isCurrentSong ? (
                    <Pause className="w-4 h-4 text-purple-400" />
                ) : (
                    <span className="text-white/40 text-sm font-medium track-number">
                        {trackNumber}
                    </span>
                )}
            </div>

            {/* Song info */}
            <div className="flex-1 min-w-0 mr-3">
                <h4 className={`font-medium truncate ${isCurrentSong ? 'text-purple-400' : 'text-white'}`}>
                    {song.title}
                </h4>
                {artistName && (
                    <p className="text-white/50 text-sm truncate">
                        {artistName}
                    </p>
                )}
            </div>

            {/* Duration */}
            <div className="w-12 flex-shrink-0 text-left text-white/40 text-sm">
                {formatDuration(song.duration_seconds)}
            </div>

            {/* Play button */}
            <button
                onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500
                   flex items-center justify-center
                   transition-all ml-2 flex-shrink-0 shadow-md"
                title="נגן"
            >
                {isCurrentSong && isPlaying ? (
                    <Pause className="w-4 h-4 text-white fill-white" />
                ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                )}
            </button>
        </div>
    );
};

// Memoized for performance - re-render only when song or playing state changes
export default React.memo(SongRow, (prevProps, nextProps) => {
    return (
        prevProps.song?.id === nextProps.song?.id &&
        prevProps.song?.myRating === nextProps.song?.myRating &&
        prevProps.isCurrentSong === nextProps.isCurrentSong &&
        prevProps.isPlaying === nextProps.isPlaying
    );
});
