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
            className="fixed inset-x-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
            }}
            dir={direction}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-12 shrink-0 z-30">
                <button onClick={onClose} className="text-white/80 hover:text-white">
                    <ChevronDown size={28} />
                </button>
                <span className="text-xs font-bold tracking-widest uppercase text-white/50">{labels.nowPlaying}</span>
                <button className="text-white/80 hover:text-white">
                    <MoreHorizontal size={24} />
                </button>
            </div>

            {/* Background Album Art Blur */}
            <div className="absolute inset-0 z-0">
                {currentSong.album?.cover_url && (
                    <img
                        src={currentSong.album.cover_url}
                        className="w-full h-full object-cover opacity-20 blur-3xl scale-125"
                        alt=""
                    />
                )}
            </div>

            {/* Main Content: Vinyl + Amplifier */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full px-4 -mt-20">
                {/* Vinyl - Properly Scaled */}
                <div className="relative z-10 flex items-center justify-center mb-6" style={{ transform: 'scale(1)' }}>
                    <VinylTurntable
                        song={currentSong}
                        isPlaying={isPlaying}
                        albumArt={currentSong?.album?.cover_url}
                        hideInfo={true}
                    />
                </div>

                {/* Analog Amplifier WITH Controls */}
                <div className="relative z-20 w-full max-w-[400px]">
                    <AnalogAmplifier
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        onNext={handleNext}
                        onPrev={handlePrevious}
                    />
                </div>
            </div>

            {/* Bottom Section: Floating Song Card */}
            <div className="relative z-30 pb-4 px-4">
                {/* Floating Glass Card */}
                <div className="song-card-glass w-full">
                    <div className="song-card-handle"></div>

                    {/* Swipeable Carousel */}
                    <div className="relative w-full overflow-hidden h-20 mb-2">
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            className="absolute inset-0 flex items-center justify-between cursor-grab active:cursor-grabbing text-center"
                            key={viewIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="w-full flex flex-col items-center" onClick={() => !isViewedSongPlaying && playSong(viewedSong)}>
                                <h2 className={`text-xl font-bold leading-tight line-clamp-1 px-4 ${!isViewedSongPlaying ? 'text-white/60' : 'text-white'}`}>
                                    {viewedSong?.title || 'Unknown Title'}
                                </h2>
                                <p className="text-white/60 text-sm mt-1 line-clamp-1">{viewedSong?.artist?.name || 'Unknown Artist'}</p>
                            </div>
                        </motion.div>

                        {/* Like Button (Absolute) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); rateSong(viewedSong.id, viewedSong.myRating === 5 ? 0 : 5); }}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 transition-colors ${viewedSong?.myRating === 5 ? 'text-green-500' : 'text-white/30'}`}
                        >
                            <ThumbsUp size={20} fill={viewedSong?.myRating === 5 ? 'currentColor' : 'none'} />
                        </button>
                        {/* Shuffle Button (Absolute Left) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShuffle(!shuffle); }}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 p-2 transition-colors ${shuffle ? 'text-green-500' : 'text-white/30'}`}
                        >
                            <Shuffle size={20} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full group px-2">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={isScrubbing ? scrubValue : currentTime}
                            onChange={(e) => { setIsScrubbing(true); handleScrub(e); }}
                            onTouchEnd={handleScrubEnd}
                            onMouseUp={handleScrubEnd}
                            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:h-2 transition-all"
                            dir="ltr"
                        />
                        <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono" dir="ltr">
                            <span>{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MobileFullPlayer;
