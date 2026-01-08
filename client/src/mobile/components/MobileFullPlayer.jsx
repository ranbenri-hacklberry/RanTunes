import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '@/context/MusicContext';
import VinylTurntable from '@/components/VinylTurntable';
import SpotifyDevicePicker from '@/components/SpotifyDevicePicker';
import { getSystemDirection, isSystemRTL } from '@/lib/localeUtils';

// Sub-components
import PlayerHeader from './PlayerHeader';
import PlaybackControls from './PlaybackControls';
import SeekControl from './SeekControl';
import SongInfoCarousel from './SongInfoCarousel';

// Constants
const SWIPE_THRESHOLD = 100;
const GRADIENT_STYLE = {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
};

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
        transitionPhase,
        isRemoteMode,
        remoteDeviceName
    } = useMusic();

    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);
    const [showDevicePicker, setShowDevicePicker] = useState(false);
    const [error, setError] = useState(null);

    // Carousel State
    const [viewIndex, setViewIndex] = useState(playlistIndex);

    // Dynamic direction based on system language
    const direction = useMemo(() => getSystemDirection(), []);
    // Note: In a real app with dynamic language switching, this might need to listen to a context.
    const isRtl = useMemo(() => isSystemRTL(), []);

    const nowPlayingLabel = useMemo(() => isRtl ? 'מנגן כעת' : 'Now Playing', [isRtl]);

    // Sync view index with actual song when the *active* song changes (e.g. natural progression)
    useEffect(() => {
        if (playlistIndex !== undefined && playlistIndex !== -1) {
            setViewIndex(playlistIndex);
        }
    }, [playlistIndex]);

    // Update scrubbing value when not scrubbing
    useEffect(() => {
        if (!isScrubbing) {
            setScrubValue(currentTime);
        }
    }, [currentTime, isScrubbing]);

    const handleScrub = useCallback((e) => {
        setScrubValue(parseFloat(e.target.value));
    }, []);

    const handleScrubEnd = useCallback(async () => {
        try {
            await seek(scrubValue);
            setError(null);
        } catch (err) {
            console.error('Seek failed:', err);
            setError('Seek failed');
            // Clear error after 3 seconds
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsScrubbing(false);
        }
    }, [seek, scrubValue]);

    const handleDragEnd = useCallback((e, { offset }) => {
        if (!playlist || playlist.length === 0) return;
        const swipe = offset.x;

        if (swipe < -SWIPE_THRESHOLD) {
            // Next visual item
            const nextIdx = (viewIndex + 1) % playlist.length;
            setViewIndex(nextIdx);
        } else if (swipe > SWIPE_THRESHOLD) {
            // Prev visual item
            const prevIdx = (viewIndex - 1 + playlist.length) % playlist.length;
            setViewIndex(prevIdx);
        }
    }, [playlist, viewIndex]);

    const viewedSong = (playlist && playlist[viewIndex]) || currentSong;
    const isViewedSongPlaying = viewedSong?.id === currentSong?.id;

    const handleCarouselPlayPause = useCallback((e) => {
        e.stopPropagation();
        if (isViewedSongPlaying) {
            togglePlay();
        } else {
            playSong(viewedSong);
        }
    }, [isViewedSongPlaying, togglePlay, playSong, viewedSong]);

    const handleCarouselLike = useCallback((e) => {
        e.stopPropagation();
        rateSong(viewedSong.id, viewedSong.myRating === 5 ? 0 : 5);
    }, [rateSong, viewedSong]);


    if (!currentSong) return (
        <div className="fixed inset-0 z-50 bg-[#1a1a2e] flex flex-col items-center justify-center p-12">
            <div className="w-12 h-12 border-4 border-white/10 border-t-green-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white/40 text-[10px] font-bold tracking-widest uppercase">Connecting Spotify...</p>
        </div>
    );

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 top-0 bottom-16 z-50 flex flex-col overflow-hidden" // bottom-16 to leave space for navbar
            style={GRADIENT_STYLE}
            dir={direction}
        >
            <PlayerHeader
                onClose={onClose}
                isRemoteMode={isRemoteMode}
                remoteDeviceName={remoteDeviceName}
                isSpotifyTrack={currentSong?.file_path?.startsWith('spotify:')}
                nowPlayingLabel={nowPlayingLabel}
                onDevicePickerClick={() => setShowDevicePicker(true)}
            />

            {/* Background Album Art Blur */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {currentSong.album?.cover_url && (
                    <img
                        src={currentSong.album.cover_url}
                        className="w-full h-full object-cover opacity-20 blur-3xl scale-125"
                        alt=""
                        aria-hidden="true"
                    />
                )}
            </div>

            {/* Error Toast */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Areas - Scrollable Container */}
            <div className="flex-1 w-full relative z-10 overflow-y-auto no-scrollbar scroll-smooth">

                {/* Screen 1: Player Controls (Min Height to fill viewport above navbar) */}
                <div className="min-h-[calc(100vh-64px)] flex flex-col px-4 pb-4">

                    {/* 1. Vinyl - Flexible space */}
                    <div className="flex-1 flex items-center justify-center min-h-[300px] mb-4">
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

                    {/* 2. Controls & Seek */}
                    <div className="w-full max-w-[400px] mx-auto shrink-0 mb-4">
                        <SeekControl
                            currentTime={currentTime}
                            duration={duration}
                            scrubValue={scrubValue}
                            isScrubbing={isScrubbing}
                            onScrub={handleScrub}
                            onScrubEnd={handleScrubEnd}
                        />

                        <PlaybackControls
                            isPlaying={isPlaying}
                            onPlayPause={togglePlay}
                            onNext={handleNext}
                            onPrevious={handlePrevious}
                            isShuffle={shuffle}
                            onShuffleToggle={() => setShuffle(!shuffle)}
                            repeatMode={repeat}
                            onRepeatToggle={() => {
                                const nextMode = repeat === 'off' ? 'context' : (repeat === 'context' ? 'track' : 'off');
                                setRepeat(nextMode);
                            }}
                        />
                    </div>

                    {/* 3. Current Song Info (The Anchor for scrolling) */}
                    <SongInfoCarousel
                        playlist={playlist}
                        viewIndex={viewIndex}
                        viewedSong={viewedSong}
                        isViewedSongPlaying={isViewedSongPlaying}
                        onDragEnd={handleDragEnd}
                        onLike={handleCarouselLike}
                        onPlayPause={handleCarouselPlayPause}
                        isPlaying={isPlaying}
                    />

                    {/* Scroll Hint */}
                    <div className="flex justify-center -mt-2 opacity-50 animate-bounce">
                        <ChevronDown size={20} className="text-white" />
                    </div>
                </div>

                {/* Create Space for Playlist below */}
                <div className="px-4 pb-20 bg-black/40 backdrop-blur-md min-h-[50vh]">
                    <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4 sticky top-0 py-4 bg-[#111] z-20">Up Next</h3>

                    <div className="space-y-2">
                        {playlist && playlist.map((song, idx) => {
                            // Only show songs AFTER current index (or all if repeat context?)
                            // Let's show all for now, highlighting current
                            const isCurrent = currentSong?.id === song.id;
                            return (
                                <div
                                    key={song.id}
                                    onClick={() => playSong(song)}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}
                                >
                                    <span className="text-white/30 font-mono text-xs w-6 text-center">{idx + 1}</span>
                                    <img src={song.album?.cover_url} className="w-10 h-10 rounded-md object-cover opacity-80" alt="" />
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className={`text-sm font-medium truncate ${isCurrent ? 'text-green-400' : 'text-white'}`}>{song.title}</span>
                                        <span className="text-xs text-white/50 truncate">{song.artist?.name}</span>
                                    </div>
                                    {isCurrent && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                </div>
                            );
                        })}
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
