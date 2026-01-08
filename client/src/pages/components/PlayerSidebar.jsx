import React from 'react';
import { Music, ThumbsUp, ThumbsDown, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import VinylTurntable from '@/components/VinylTurntable';

const PlayerSidebar = ({
    currentSong,
    isPlaying,
    togglePlay,
    handleNext,
    handlePrevious,
    rateSong,
    currentTime = 0,
    duration = 0,
    seek = () => { },
    transitionPhase = 'playing'
}) => {
    // Format time (seconds to MM:SS)
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Progress percentage
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Handle seek (RTL support)
    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate percent from right to left for RTL
        const percent = (rect.right - e.clientX) / rect.width;
        seek(Math.max(0, Math.min(1, percent)) * duration);
    };
    return (
        <div className="w-[320px] shrink-0 border-l border-white/10 flex flex-col items-center p-6 pb-24 bg-black/20 overflow-y-auto music-scrollbar h-full">
            {currentSong ? (
                <>
                    <VinylTurntable
                        song={currentSong}
                        isPlaying={isPlaying}
                        transitionPhase={transitionPhase}
                    />

                    {/* Progress Bar (RTL) */}
                    <div className="w-full mt-4 px-2" dir="rtl">
                        <div
                            className="music-progress-container relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                            onClick={handleSeek}
                        >
                            <div
                                className="music-progress-bar absolute right-0 top-0 h-full bg-gradient-to-l from-purple-600 to-pink-500 rounded-full transition-all duration-300 ease-linear"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-white/40 font-mono">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Main Controls (RTL Swapped) */}
                    <div className="flex items-center gap-6 mt-8">
                        {/* Next (Left) */}
                        <button
                            onClick={handleNext}
                            className="p-3 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all transform hover:scale-110"
                        >
                            <SkipForward className="w-5 h-5 transform scale-x-[-1]" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full music-gradient-purple flex items-center justify-center text-white shadow-xl transform active:scale-95 hover:scale-105 transition-all"
                        >
                            {isPlaying ? <Pause className="w-8 h-8 fill-white" /> : <Play className="w-8 h-8 fill-white transform scale-x-[-1] ml-[-4px]" />}
                        </button>

                        {/* Previous (Right) */}
                        <button
                            onClick={handlePrevious}
                            className="p-3 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all transform hover:scale-110"
                        >
                            <SkipBack className="w-5 h-5 transform scale-x-[-1]" />
                        </button>
                    </div>

                    {/* Like/Dislike Buttons */}
                    <div className="flex items-center gap-6 mt-6">
                        <button
                            onClick={() => rateSong(currentSong?.id, currentSong?.myRating === 1 ? 0 : 1)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-110
                                ${currentSong?.myRating === 1
                                    ? 'bg-red-500/30 text-red-400 ring-2 ring-red-400/50'
                                    : 'music-glass text-white/50 hover:text-red-400'}`}
                            title="לא אהבתי"
                        >
                            <ThumbsDown className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => rateSong(currentSong?.id, currentSong?.myRating === 5 ? 0 : 5)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-110
                                ${currentSong?.myRating === 5
                                    ? 'bg-green-500/30 text-green-400 ring-2 ring-green-400/50'
                                    : 'music-glass text-white/50 hover:text-green-400'}`}
                            title="אהבתי"
                        >
                            <ThumbsUp className="w-5 h-5" />
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center mt-8 bg-black/20 p-6 rounded-3xl backdrop-blur-sm border border-white/5 max-w-[280px]">
                    <Music className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 font-medium">בחר שיר כדי להתחיל לנגן</p>
                    <p className="text-white/30 text-sm mt-1">האלבומים שלך מופיעים מצד ימין</p>
                </div>
            )}
        </div>
    );
};

export default PlayerSidebar;
