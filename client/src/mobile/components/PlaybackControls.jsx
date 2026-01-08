import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';

/**
 * @typedef {Object} PlaybackControlsProps
 * @property {boolean} isPlaying - Current playback state
 * @property {() => void} onPlayPause - Toggle play/pause handler
 * @property {() => void} onNext - Next track handler
 * @property {() => void} onPrevious - Previous track handler
 * @property {boolean} isShuffle - Shuffle state
 * @property {() => void} onShuffleToggle - Toggle shuffle handler
 * @property {boolean | string} repeatMode - Repeat mode ('off', 'context', 'track')
 * @property {() => void} onRepeatToggle - Toggle repeat handler
 */

/**
 * Standard playback controls (Play, Pause, Next, Prev, Shuffle, Repeat)
 * @param {PlaybackControlsProps} props
 */
const PlaybackControls = ({
    isPlaying,
    onPlayPause,
    onNext,
    onPrevious,
    isShuffle,
    onShuffleToggle,
    repeatMode,
    onRepeatToggle
}) => {
    return (
        <div className="w-full max-w-[400px] mx-auto mb-6 shrink-0 flex items-center justify-between px-6">
            {/* Shuffle */}
            <button
                onClick={onShuffleToggle}
                className={`p-2 transition-colors ${isShuffle ? 'text-green-500' : 'text-white/40 hover:text-white/60'}`}
                aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
            >
                <Shuffle size={20} />
            </button>

            {/* Previous */}
            <button
                onClick={onPrevious}
                className="p-2 text-white/80 hover:text-white transition-colors"
                aria-label="Previous track"
            >
                <SkipBack size={28} fill="currentColor" />
            </button>

            {/* Play/Pause - Prominent */}
            <button
                onClick={onPlayPause}
                className="w-16 h-16 flex items-center justify-center bg-white rounded-full text-black hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-white/10"
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                )}
            </button>

            {/* Next */}
            <button
                onClick={onNext}
                className="p-2 text-white/80 hover:text-white transition-colors"
                aria-label="Next track"
            >
                <SkipForward size={28} fill="currentColor" />
            </button>

            {/* Repeat */}
            <button
                onClick={onRepeatToggle}
                className={`p-2 transition-colors ${repeatMode === 'track' || repeatMode === 'context' ? 'text-green-500' : 'text-white/40 hover:text-white/60'}`}
                aria-label="Toggle repeat mode"
            >
                <Repeat size={20} />
                {repeatMode === 'track' && (
                    <span className="absolute text-[8px] font-bold -mt-2 ml-2.5 bg-[#1a1a2e] px-0.5" aria-hidden="true">1</span>
                )}
            </button>
        </div>
    );
};

export default PlaybackControls;
