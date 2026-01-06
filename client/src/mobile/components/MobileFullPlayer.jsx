import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, MoreHorizontal, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import VinylTurntable from '@/components/VinylTurntable';
import { getSystemDirection, isSystemRTL } from '@/lib/localeUtils';

const MobileFullPlayer = ({ onClose }) => {
    const {
        currentSong,
        isPlaying,
        togglePlay,
        handleNext,
        handlePrevious,
        currentTime,
        duration,
        seek,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        rateSong
    } = useMusic();

    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);

    // Dynamic direction based on system language
    const direction = useMemo(() => getSystemDirection(), []);
    const rtl = useMemo(() => isSystemRTL(), []);
    const labels = useMemo(() => ({
        nowPlaying: rtl ? 'מנגן כעת' : 'Now Playing'
    }), [rtl]);

    useEffect(() => {
        if (!isScrubbing) {
            setScrubValue(currentTime);
        }
    }, [currentTime, isScrubbing]);

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleScrub = (e) => {
        setScrubValue(parseFloat(e.target.value));
    };

    const handleScrubEnd = () => {
        seek(scrubValue);
        setIsScrubbing(false);
    };

    if (!currentSong) return null;

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#000000] flex flex-col"
            dir={direction}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-12">
                <button onClick={onClose} className="text-white">
                    <ChevronDown size={28} />
                </button>
                <span className="text-xs font-bold tracking-widest uppercase text-white/50">{labels.nowPlaying}</span>
                <button className="text-white">
                    <MoreHorizontal size={24} />
                </button>
            </div>

            {/* Vinyl Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
                {/* Background Blur */}
                <div className="absolute inset-0 z-0 opacity-30 blur-3xl scale-150">
                    {currentSong.album?.cover_url && (
                        <img src={currentSong.album.cover_url} className="w-full h-full object-cover" />
                    )}
                </div>
                <div className="relative z-10 w-full aspect-square max-w-sm">
                    <VinylTurntable
                        song={currentSong}
                        isPlaying={isPlaying}
                        albumArt={currentSong?.album?.cover_url}
                        hideInfo={true}
                    />
                </div>
            </div>

            {/* Controls Area */}
            <div className="px-8 pb-12 pt-4 flex flex-col gap-6">

                {/* Song Info */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{currentSong.title || 'Unknown Title'}</h2>
                        <p className="text-white/60 text-lg mt-1">{currentSong.artist?.name || 'Unknown Artist'}</p>
                    </div>
                    {/* Like Button */}
                    <button
                        onClick={() => rateSong(currentSong.id, currentSong.myRating === 5 ? 0 : 5)}
                        className={`transition-colors ${currentSong.myRating === 5 ? 'text-green-500' : 'text-white/30'}`}
                    >
                        <ThumbsUp size={24} fill={currentSong.myRating === 5 ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full group">
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={isScrubbing ? scrubValue : currentTime}
                        onChange={(e) => { setIsScrubbing(true); handleScrub(e); }}
                        onTouchEnd={handleScrubEnd}
                        onMouseUp={handleScrubEnd}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:h-2 transition-all"
                        dir="ltr" // Range input standard is LTR
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-2 font-mono" dir="ltr">
                        <span>{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between">
                    <button onClick={() => setShuffle(!shuffle)} className={`${shuffle ? 'text-green-500' : 'text-white/30'}`}>
                        <Shuffle size={20} />
                    </button>

                    <div className="flex items-center gap-6">
                        <button onClick={handleNext} className="text-white hover:text-white/70">
                            <SkipForward size={32} className="transform scale-x-[-1]" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>

                        <button onClick={handlePrevious} className="text-white hover:text-white/70">
                            <SkipBack size={32} className="transform scale-x-[-1]" />
                        </button>
                    </div>

                    <button onClick={() => {
                        const modes = ['none', 'all', 'one'];
                        const idx = modes.indexOf(repeat);
                        setRepeat(modes[(idx + 1) % modes.length]);
                    }} className={`${repeat !== 'none' ? 'text-green-500' : 'text-white/30'}`}>
                        <Repeat size={20} />
                        {repeat === 'one' && <span className="text-[8px] absolute ml-3 -mt-2">1</span>}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default MobileFullPlayer;
