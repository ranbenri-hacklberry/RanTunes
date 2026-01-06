import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, ChevronUp } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import { motion } from 'framer-motion';

const MobileMiniPlayer = ({ onExpand }) => {
    const {
        currentSong,
        isPlaying,
        togglePlay,
        handleNext,
        currentTime,
        duration
    } = useMusic();

    if (!currentSong) return null;

    // RTL progress calculation
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-[64px] left-0 right-0 z-40 px-2 pb-2"
        >
            <div
                className="bg-[#1E1E1E] rounded-xl overflow-hidden shadow-2xl border border-white/10 flex items-center pr-2 pl-4 py-2 gap-3"
                onClick={onExpand}
            >
                {/* Album Art */}
                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 relative">
                    {currentSong.album?.cover_url && (
                        <img
                            src={currentSong.album.cover_url}
                            alt={currentSong.album.name || 'Album Art'}
                            className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                        />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center text-right" dir="rtl">
                    <h4 className="text-white text-sm font-bold truncate leading-tight">
                        {currentSong.title || 'Unknown Title'}
                    </h4>
                    <p className="text-white/50 text-xs truncate leading-tight">
                        {currentSong.artist?.name || 'Unknown Artist'}
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center text-white">
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={handleNext} className="text-white/70">
                        <SkipForward size={22} className="transform scale-x-[-1]" />
                    </button>
                </div>


            </div>
            {/* Playing Bar - Attached to bottom of player card */}
            <div className="mx-2 -mt-[2px]" dir="rtl">
                <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden relative">
                    <div
                        className="h-full bg-purple-500 absolute right-0 top-0 transition-all duration-300 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default MobileMiniPlayer;
