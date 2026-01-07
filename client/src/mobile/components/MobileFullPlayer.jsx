import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, MoreHorizontal, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, ThumbsUp, ThumbsDown, Monitor, Settings } from 'lucide-react';
import { useMusic } from '@/context/MusicContext';
import VinylTurntable from '@/components/VinylTurntable';
import SpotifyDevicePicker from '@/components/SpotifyDevicePicker';
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
        playSong,
        currentAmplitude, // Get real audio data
        trackFeatures,
        transitionPhase,
        isRemoteMode,
        remoteDeviceName
    } = useMusic();

    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);
    const [showDevicePicker, setShowDevicePicker] = useState(false);

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
            {/* Premium Top Bar */}
            <div className="flex items-center justify-between p-4 pt-12 shrink-0 z-30 bg-gradient-to-b from-black/40 to-transparent">
                <button onClick={onClose} className="p-2 -ml-2 text-white/80 hover:text-white transition-colors">
                    <ChevronDown size={32} />
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mb-1">{labels.nowPlaying}</span>
                    <div className="flex items-center gap-2">
                        {currentSong?.file_path?.startsWith('spotify:') && (
                            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-tight">
                                    {isRemoteMode ? `Remote: ${remoteDeviceName || 'Spotify'}` : 'Spotify'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {currentSong?.file_path?.startsWith('spotify:') && (
                        <button
                            onClick={() => setShowDevicePicker(true)}
                            className="p-2 text-green-400 hover:text-green-300 transition-colors"
                        >
                            <Monitor size={22} />
                        </button>
                    )}
                    <button className="p-2 text-white/80 hover:text-white transition-colors">
                        <Settings size={22} />
                    </button>
                </div>
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

            {/* Main Content Areas */}
            <div className="flex-1 flex flex-col w-full relative z-10 px-4 pb-8 overflow-hidden">

                {/* 1. Vinyl - Top Centered (Flexible space above and below) */}
                <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="relative" style={{ transform: 'scale(1)' }}>
                        <VinylTurntable
                            song={currentSong}
                            isPlaying={isPlaying}
                            albumArt={currentSong?.album?.cover_url}
                            hideInfo={true}
                            transitionPhase={transitionPhase}
                        />
                    </div>
                </div>

                {/* 2. Analog Amplifier - Visualizer ONLY */}
                <div className="w-full max-w-[400px] mx-auto mb-6 shrink-0">
                    <AnalogAmplifier isPlaying={isPlaying} realAmplitude={currentAmplitude} trackFeatures={trackFeatures} />
                </div>

                {/* 3. Song Carousel (Mini Player Style) */}
                <div className="w-full max-w-[400px] mx-auto shrink-0 relative mb-4">
                    <div className="absolute inset-y-0 -left-4 w-4 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none"></div>
                    <div className="absolute inset-y-0 -right-4 w-4 bg-gradient-to-l from-black/20 to-transparent z-20 pointer-events-none"></div>

                    <div className="h-[60px] relative overflow-hidden">
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            className="absolute inset-0 flex items-center justify-between cursor-grab active:cursor-grabbing mini-player-card"
                            key={viewIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => !isViewedSongPlaying && playSong(viewedSong)}
                        >
                            <div className="mini-player-info">
                                {/* Album Art Icon */}
                                <img
                                    src={viewedSong?.album?.cover_url || viewedSong?.album?.images?.[0]?.url}
                                    className="mini-player-art"
                                    alt=""
                                />

                                {/* Text Info */}
                                <div className="mini-player-text">
                                    <span className={`mini-player-title ${!isViewedSongPlaying ? 'text-white/60' : 'text-white'}`}>
                                        {viewedSong?.title || 'Unknown Title'}
                                    </span>
                                    <span className="mini-player-artist">
                                        {viewedSong?.artist?.name || 'Unknown Artist'}
                                    </span>
                                </div>
                            </div>

                            <div className="mini-player-actions">
                                {/* Like Heart */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); rateSong(viewedSong.id, viewedSong.myRating === 5 ? 0 : 5); }}
                                    className={`transition-colors ${viewedSong?.myRating === 5 ? 'text-green-500' : 'text-white/30'}`}
                                >
                                    <ThumbsUp size={20} fill={viewedSong?.myRating === 5 ? 'currentColor' : 'none'} />
                                </button>

                                {/* Play Button (If not playing/current) */}
                                {!isViewedSongPlaying ? (
                                    <button className="text-green-500">
                                        <Play size={24} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white">
                                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 4. Progress Bar (Below Carousel) */}
                <div className="w-full max-w-[400px] mx-auto shrink-0 px-1 mb-8">
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

                <AnimatePresence>
                    {showDevicePicker && (
                        <SpotifyDevicePicker onClose={() => setShowDevicePicker(false)} />
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default MobileFullPlayer;
