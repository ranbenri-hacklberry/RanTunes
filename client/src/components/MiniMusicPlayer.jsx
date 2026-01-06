import React from 'react';
import { Play, Pause, SkipForward, SkipBack, ThumbsUp, ThumbsDown, Music } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';

/**
 * Mini music player for headers - RanTunes Dark Version
 */
const MiniMusicPlayer = ({ onClick }) => {
    const {
        currentSong,
        isPlaying,
        togglePlay,
        handleNext,
        rateSong,
        currentTime,
        duration
    } = useMusic();

    if (!currentSong) return null;

    const myRating = currentSong.myRating || 0;
    const isLiked = myRating === 5;
    const isDisliked = myRating === 1;

    const handleRate = async (rating) => {
        const finalRating = myRating === rating ? 0 : rating;
        await rateSong(currentSong.id, finalRating);
    };

    // Format time (seconds to MM:SS)
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-1 min-w-[340px] max-w-[450px]">
            <div
                className="flex items-center gap-4 px-4 py-2 music-glass rounded-2xl border border-white/10 cursor-pointer group"
                onClick={onClick}
            >
                {/* Song Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border border-white/10 group-hover:scale-105 transition-transform">
                        {currentSong.album?.cover_url ? (
                            <img
                                src={currentSong.album.cover_url}
                                alt={currentSong.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Music size={18} className="text-purple-400" />
                        )}
                    </div>
                    <div className="min-w-0" dir="rtl">
                        <p className="text-sm font-bold text-white truncate leading-tight">
                            {currentSong.title}
                        </p>
                        <p className="text-[11px] font-medium text-white/50 truncate leading-tight">
                            {currentSong.artist?.name || 'אמן לא ידוע'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
                    {/* Dislike */}
                    <button
                        onClick={() => handleRate(1)}
                        className={`p-2 rounded-lg transition-all ${isDisliked
                            ? 'bg-red-500/20 text-red-400 shadow-sm'
                            : 'text-white/40 hover:bg-white/10 hover:text-white'
                            }`}
                        title="לא אהבתי"
                    >
                        <ThumbsDown size={16} fill={isDisliked ? 'currentColor' : 'none'} />
                    </button>

                    {/* Like */}
                    <button
                        onClick={() => handleRate(5)}
                        className={`p-2 rounded-lg transition-all ${isLiked
                            ? 'bg-green-500/20 text-green-400 shadow-sm'
                            : 'text-white/40 hover:bg-white/10 hover:text-white'
                            }`}
                        title="אהבתי"
                    >
                        <ThumbsUp size={16} fill={isLiked ? 'currentColor' : 'none'} />
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        className="p-2 w-10 h-10 rounded-full bg-white text-black hover:bg-white/90 transition-all flex items-center justify-center shadow-lg mx-1"
                    >
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="transform scale-x-[-1] ml-[-2px]" />}
                    </button>

                    {/* Next (Left in RTL scenario) */}
                    <button
                        onClick={handleNext}
                        className="p-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-all transform scale-x-[-1]"
                        title="הבא"
                    >
                        <SkipForward size={18} />
                    </button>
                </div>
            </div>

            {/* Progress Bar (RTL) */}
            <div className="px-2" dir="rtl">
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden relative">
                    <div
                        className="h-full bg-gradient-to-l from-purple-500 to-pink-500 absolute right-0 top-0 transition-all duration-300 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-white/30 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default MiniMusicPlayer;
