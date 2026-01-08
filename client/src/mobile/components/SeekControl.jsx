import React, { memo } from 'react';

/**
 * Helper to format seconds into MM:SS
 * @param {number} seconds
 * @returns {string}
 */
const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * @typedef {Object} SeekControlProps
 * @property {number} currentTime - Current playback time in seconds
 * @property {number} duration - Total track duration in seconds
 * @property {number} scrubValue - Value while user is dragging
 * @property {boolean} isScrubbing - Whether user is currently dragging
 * @property {(e: React.ChangeEvent<HTMLInputElement>) => void} onScrub - Input change handler
 * @property {() => void} onScrubEnd - Drag end handler
 */

/**
 * Progress bar with time labels
 * @param {SeekControlProps} props
 */
const SeekControl = memo(({
    currentTime,
    duration,
    scrubValue,
    isScrubbing,
    onScrub,
    onScrubEnd
}) => {
    return (
        <div className="w-full max-w-[400px] mx-auto shrink-0 px-1 mb-8">
            <input
                type="range"
                min="0"
                max={duration || 100}
                value={isScrubbing ? scrubValue : currentTime}
                onChange={onScrub}
                onTouchEnd={onScrubEnd}
                onMouseUp={onScrubEnd}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:h-2 transition-all"
                dir="ltr"
                aria-label="Seek playback position"
                aria-valuemin={0}
                aria-valuemax={duration || 100}
                aria-valuenow={isScrubbing ? scrubValue : currentTime}
                aria-valuetext={`${formatTime(isScrubbing ? scrubValue : currentTime)} of ${formatTime(duration)}`}
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1 font-mono" dir="ltr">
                <span aria-hidden="true">{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
                <span aria-hidden="true">{formatTime(duration)}</span>
            </div>
        </div>
    );
});

export default SeekControl;
