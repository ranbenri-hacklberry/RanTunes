import { useState, useRef, useCallback, useEffect } from 'react';
import { MUSIC_API_URL } from '@/constants/music';

/**
 * Custom hook to handle HTML5 Audio logic
 * @returns {Object} Audio state and controls
 */
export const useAudioPlayer = (onEnded) => {
    const audioRef = useRef(new Audio());
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.7);

    useEffect(() => {
        const audio = audioRef.current;
        let lastUpdateTime = 0;

        const handleTimeUpdate = () => {
            const now = Date.now();
            if (now - lastUpdateTime > 500) {
                setCurrentTime(audio.currentTime);
                lastUpdateTime = now;
            }
        };

        const handleDurationChange = () => setDuration(audio.duration || 0);
        const handleEnded = () => onEnded();
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.pause();
            audio.src = '';
        };
    }, [onEnded]);

    useEffect(() => {
        audioRef.current.volume = volume;
    }, [volume]);

    /**
     * Plays a local or streamed audio file
     * @param {string} path - File path or URL
     */
    const playLocalPath = useCallback(async (path, isBlob = false) => {
        const url = isBlob ? path : `${MUSIC_API_URL}/music/stream?path=${encodeURIComponent(path)}`;
        audioRef.current.src = url;
        audioRef.current.load();
        await audioRef.current.play();
    }, []);

    const pause = useCallback(() => audioRef.current.pause(), []);
    const resume = useCallback(() => audioRef.current.play(), []);
    const seek = useCallback((time) => { audioRef.current.currentTime = time; }, []);

    return {
        audioRef,
        isPlaying,
        currentTime,
        duration,
        volume,
        setVolume,
        playLocalPath,
        pause,
        resume,
        seek
    };
};
