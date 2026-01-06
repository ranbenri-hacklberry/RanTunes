import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, MoreHorizontal, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import VinylTurntable from '@/components/VinylTurntable';
import { getSystemDirection, isSystemRTL } from '@/lib/localeUtils';

import AnalogAmplifier from './AnalogAmplifier';

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
        rateSong,
        playlist,
        playlistIndex,
        playSong
    } = useMusic();

    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);

    // Carousel State
    const [viewIndex, setViewIndex] = useState(playlistIndex);
    const [dragDirection, setDragDirection] = useState(0);

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

    // Sync view index with actual song when it changes
    useEffect(() => {
        setViewIndex(playlistIndex);
    }, [playlistIndex]);

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

    // Carousel Logic
    const handleDragEnd = (e, { offset, velocity }) => {
        const swipe = offset.x; // RTL considerations? Framer Motion usually handles LTR coordinates

        // If RTL, swipe left (negative) means NEXT? No, keep standard swipe behavior:
        // Swipe Left (negative x) -> Next Item
        // Swipe Right (positive x) -> Prev Item

        if (swipe < -100) {
            // Next
            const nextIdx = (viewIndex + 1) % playlist.length;
            setViewIndex(nextIdx);
        } else if (swipe > 100) {
            // Prev
            const prevIdx = (viewIndex - 1 + playlist.length) % playlist.length;
            setViewIndex(prevIdx);
        }
    };

    const viewedSong = playlist[viewIndex] || currentSong;
    const isViewedSongPlaying = viewedSong?.id === currentSong?.id;

    if (!currentSong) return null;

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 top-0 bottom-16 z-40 flex flex-col overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
            }}
            dir={direction}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-10 shrink-0">
                <button onClick={onClose} className="text-white/80 hover:text-white">
                    <ChevronDown size={28} />
                </button>
                <span className="text-xs font-bold tracking-widest uppercase text-white/50">{labels.nowPlaying}</span>
                <button className="text-white/80 hover:text-white">
                    <MoreHorizontal size={24} />
                </button>
            </div>

            {/* Vinyl Area - with album art blur background */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-0">
                {/* Background Blur Effect */}
                <div className="absolute inset-0 z-0">
                    {currentSong.album?.cover_url && (
                        <img
                            src={currentSong.album.cover_url}
                            className="w-full h-full object-cover opacity-20 blur-3xl scale-125"
                            alt=""
                        />
                    )}
                </div>

                {/* Vinyl - scaled to fit */}
                <div className="relative z-10 flex items-center justify-center mb-4" style={{ transform: 'scale(0.85)' }}>
                    <VinylTurntable
                        song={currentSong}
                        isPlaying={isPlaying}
                        albumArt={currentSong?.album?.cover_url}
                        hideInfo={true}
                    />
                </div>

                {/* 80s Analog Amplifier Visualizer - Placed directly under vinyl */}
                <div className="relative z-10 w-full px-6 mb-4">
                    <AnalogAmplifier isPlaying={isPlaying} />
                </div>
            </div>

            {/* Controls Area */}
            <div className="px-8 pb-12 pt-2 flex flex-col gap-6 bg-gradient-to-t from-black/50 via-black/20 to-transparent">

                {/* Swipeable Song Info Carousel */}
                <div className="relative h-20 w-full overflow-hidden">
                    <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0 flex items-center justify-between cursor-grab active:cursor-grabbing text-center"
                        key={viewIndex} // Re-render animation on change
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Card Content */}
                        <div className="w-full flex flex-col items-center" onClick={() => !isViewedSongPlaying && playSong(viewedSong)}>
                            <div className="flex items-center gap-2">
                                <h2 className={`text-2xl font-bold leading-tight ${!isViewedSongPlaying ? 'text-white/60' : 'text-white'}`}>
                                    {viewedSong?.title || 'Unknown Title'}
                                </h2>
                                {!isViewedSongPlaying && (
                                    <div className="px-2 py-0.5 rounded-full bg-green-500 text-black text-[10px] font-bold uppercase tracking-wider">
                                        PLAY
                                    </div>
                                )}
                            </div>
                            <p className="text-white/60 text-lg mt-1">{viewedSong?.artist?.name || 'Unknown Artist'}</p>

                            {/* Pagination Dots to hint carousel */}
                            <div className="flex gap-1 mt-2">
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <div className="w-1 h-1 rounded-full bg-white/60"></div>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Buttons (Like) - Absolute positioned to stay valid */}
                    <button
                        onClick={(e) => { e.stopPropagation(); rateSong(viewedSong.id, viewedSong.myRating === 5 ? 0 : 5); }}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 transition-colors ${viewedSong?.myRating === 5 ? 'text-green-500' : 'text-white/30'}`}
                    >
                        <ThumbsUp size={24} fill={viewedSong?.myRating === 5 ? 'currentColor' : 'none'} />
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
                            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
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
