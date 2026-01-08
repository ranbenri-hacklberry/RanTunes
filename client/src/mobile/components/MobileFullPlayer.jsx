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
            className="fixed inset-x-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
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

                {/* 2. Song Info Carousel (Restored full card swipe) */}
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

                {/* 3. Progress Bar */}
                <SeekControl
                    currentTime={currentTime}
                    duration={duration}
                    scrubValue={scrubValue}
                    isScrubbing={isScrubbing}
                    onScrub={handleScrub}
                    onScrubEnd={handleScrubEnd}
                />

                {/* 4. Playback Controls (Restored replacing Amplifier) */}
                <PlaybackControls
                    isPlaying={isPlaying}
                    onPlayPause={togglePlay}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    isShuffle={shuffle}
                    onShuffleToggle={() => setShuffle(!shuffle)}
                    repeatMode={repeat} // 'off', 'context', 'track'
                    onRepeatToggle={() => {
                        // Cycle repeat modes: off -> context -> track -> off
                        const nextMode = repeat === 'off' ? 'context' : (repeat === 'context' ? 'track' : 'off');
                        setRepeat(nextMode);
                    }}
                />

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
