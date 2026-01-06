import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRanTunesAuth } from './RanTunesAuthContext';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { MUSIC_API_URL, SKIP_THRESHOLD } from '@/constants/music';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
    const { user: currentUser } = useRanTunesAuth();
    const handleNextRef = useRef(() => { });

    // 1. Audio Logic using custom hook (Local/Streamed)
    const {
        audioRef,
        isPlaying: isLocalPlaying,
        currentTime: localTime,
        duration: localDuration,
        volume,
        setVolume,
        playLocalPath,
        pause: pauseLocal,
        resume: resumeLocal,
        seek: seekLocal
    } = useAudioPlayer(useCallback(() => handleNextRef.current(), []));

    // 2. Spotify Player Hook
    const sdk = useSpotifyPlayer();

    // 3. Current Playlist & Metadata State
    const [currentSong, setCurrentSong] = useState(null);
    const [playlist, setPlaylist] = useState([]);
    const [playlistIndex, setPlaylistIndex] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState('none'); // none, one, all

    // 4. Shared Display State (Synchronized from either Source)
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Sync state from Local Audio
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (!isSpotify) {
            setIsPlaying(isLocalPlaying);
            setCurrentTime(localTime);
            setDuration(localDuration);
        }
    }, [isLocalPlaying, localTime, localDuration, currentSong]);

    // Sync state from Spotify SDK
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (isSpotify && sdk.isReady) {
            // Only sync isPlaying from SDK if we AREN'T in a loading state
            // and add a small delay after loading to let SDK catch up
            if (!isLoading) {
                // If it was just loading, wait 1s before trusting SDK's isPlaying state
                // This prevents the "start-stop-start" flicker
                setIsPlaying(sdk.isPlaying);
            }
            if (sdk.position > 0) setCurrentTime(sdk.position / 1000);
            if (sdk.duration > 0) setDuration(sdk.duration / 1000);
        }
    }, [sdk.isPlaying, sdk.position, sdk.duration, sdk.isReady, currentSong, isLoading]);

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [playbackError, setPlaybackError] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(current =>
            current?.message === message ? null : current
        ), 3000);
    }, []);

    const playableSongs = useMemo(() =>
        playlist.filter(s => (s?.myRating || 0) !== 1),
        [playlist]);

    // Log skip (placeholder for future metrics)
    const logSkip = useCallback(async (song, wasEarlySkip) => {
        // Not implemented in current schema
    }, []);

    // CONTROLS
    const togglePlay = useCallback(async () => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (isSpotify && sdk.isReady) {
            await sdk.togglePlay();
        } else {
            if (isLocalPlaying) pauseLocal();
            else resumeLocal();
        }
    }, [currentSong, sdk, isLocalPlaying, pauseLocal, resumeLocal]);

    // PLAY ACTION
    const playSong = useCallback(async (song, playlistSongs = null) => {
        if (!song) return;

        // If same song is already playing/current, toggle instead of restart
        if (currentSong?.id === song.id) {
            togglePlay();
            return;
        }

        // Never play disliked songs
        if ((song.myRating || 0) === 1) {
            if (Array.isArray(playlistSongs) || playlist.length > 0) {
                if (Array.isArray(playlistSongs)) setPlaylist(playlistSongs);
                setTimeout(() => handleNextRef.current(), 100);
            }
            return;
        }

        setIsLoading(true);
        setPlaybackError(null);

        try {
            const isSpotifyTrack = song.file_path?.startsWith('spotify:');
            const currentPlaylist = Array.isArray(playlistSongs) ? playlistSongs : (Array.isArray(playlist) ? playlist : []);

            if (isSpotifyTrack) {
                const allSpotifyUris = currentPlaylist
                    .filter(s => s.file_path?.startsWith('spotify:track:') && (s.myRating || 0) !== 1)
                    .map(s => s.file_path);

                try {
                    if (sdk.isReady && sdk.deviceId) {
                        // Optimistic UI update
                        setIsPlaying(true);
                        await sdk.play(song.file_path, 0, allSpotifyUris);
                    } else if (song.preview_url) {
                        setIsPlaying(true);
                        await playLocalPath(song.preview_url, true);
                        showToast('מנגן תצוגה מקדימה (Spotify SDK לא זמין)', 'info');
                    } else {
                        const service = await import('@/lib/spotifyService');
                        const SpotifyService = service.default || service;
                        await SpotifyService.play({ uris: [song.file_path] });
                        setIsPlaying(true);
                        showToast('מנגן דרך Spotify Connect', 'info');
                    }
                } catch (err) {
                    const errorMsg = err.message || 'לא ניתן לנגן את הרצועה';
                    setPlaybackError(`שגיאת Spotify: ${errorMsg}`);
                    showToast(errorMsg, 'error');
                    setIsPlaying(false);
                }
            } else {
                try {
                    setIsPlaying(true);
                    const isBlob = !!(song.isLocalDeviceFile && song.file_blob_url);
                    const path = isBlob ? song.file_blob_url : song.file_path;
                    await playLocalPath(path, isBlob);
                } catch (playError) {
                    console.error('Audio play failed:', playError);
                    setPlaybackError('שגיאה בנגינת הקובץ.');
                    showToast('שגיאה בנגינת הקובץ', 'error');
                    setIsPlaying(false);
                }
            }

            setCurrentSong(song);

            if (Array.isArray(playlistSongs)) {
                setPlaylist(playlistSongs);
                const idx = playlistSongs.findIndex(s => s.id === song.id);
                setPlaylistIndex(idx >= 0 ? idx : 0);
            }
        } catch (error) {
            console.error('Error playing song:', error);
            setPlaybackError(`שגיאה לא צפויה: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [currentSong, togglePlay, playlist, sdk.isReady, sdk.deviceId, sdk.play, showToast, playLocalPath]);

    const pause = useCallback(async () => {
        if (currentSong?.file_path?.startsWith('spotify:')) {
            if (sdk.isReady) await sdk.pause();
            else (await import('@/lib/spotifyService')).default.pause();
        } else {
            pauseLocal();
        }
    }, [currentSong, sdk, pauseLocal]);

    const resume = useCallback(async () => {
        if (currentSong?.file_path?.startsWith('spotify:')) {
            if (sdk.isReady) await sdk.resume();
            else (await import('@/lib/spotifyService')).default.play();
        } else {
            resumeLocal();
        }
    }, [currentSong, sdk, resumeLocal]);

    const seek = useCallback((time) => {
        if (currentSong?.file_path?.startsWith('spotify:') && sdk.isReady) {
            sdk.seek(time * 1000);
        } else {
            seekLocal(time);
        }
    }, [currentSong, sdk, seekLocal]);

    // NAVIGATION
    const handleNext = useCallback(() => {
        if (!playlist.length) return;

        const wasEarlySkip = currentTime < duration * SKIP_THRESHOLD;
        if (currentSong && wasEarlySkip) logSkip(currentSong, true);

        const isDisliked = (s) => (s?.myRating || 0) === 1;
        const playableList = playlist.filter(s => !isDisliked(s));

        if (playableList.length === 0) {
            setIsPlaying(false);
            showToast('אין שירים להשמעה', 'error');
            return;
        }

        let nextIndex;
        if (shuffle) {
            const random = playableList[Math.floor(Math.random() * playableList.length)];
            nextIndex = playlist.findIndex(s => s.id === random.id);
        } else if (repeat === 'one') {
            nextIndex = playlistIndex;
        } else {
            nextIndex = (playlistIndex + 1) % playlist.length;
            if (nextIndex === 0 && repeat !== 'all') {
                setIsPlaying(false);
                return;
            }
        }

        // Guard against disliked songs skip
        let guard = 0;
        while (guard < playlist.length && isDisliked(playlist[nextIndex])) {
            nextIndex = (nextIndex + 1) % playlist.length;
            if (nextIndex === 0 && repeat !== 'all') {
                setIsPlaying(false);
                return;
            }
            guard++;
        }

        setPlaylistIndex(nextIndex);
        playSong(playlist[nextIndex]);
    }, [playlist, playlistIndex, shuffle, repeat, currentTime, duration, playSong, logSkip, showToast]);

    const handlePrevious = useCallback(() => {
        if (!playlist.length) return;
        if (currentTime > 3) {
            seek(0);
            return;
        }

        const isDisliked = (s) => (s?.myRating || 0) === 1;
        let prevIndex = (playlistIndex - 1 + playlist.length) % playlist.length;

        // Guard against disliked
        let guard = 0;
        while (guard < playlist.length && isDisliked(playlist[prevIndex])) {
            prevIndex = (prevIndex - 1 + playlist.length) % playlist.length;
            guard++;
        }

        setPlaylistIndex(prevIndex);
        playSong(playlist[prevIndex]);
    }, [playlist, playlistIndex, currentTime, playSong, seek]);

    // Lifecycle
    useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

    // RATINGS
    const rateSong = useCallback(async (songId, rating) => {
        if (!currentUser || !songId) return false;
        try {
            const { error } = await supabase
                .from('rantunes_ratings')
                .upsert({
                    song_id: String(songId),
                    user_id: currentUser.id,
                    rating,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, song_id' });

            if (error) throw error;

            setPlaylist(prev => prev.map(s => s.id === songId ? { ...s, myRating: rating } : s));
            if (currentSong?.id === songId) {
                setCurrentSong(prev => ({ ...prev, myRating: rating }));
                if (rating === 1) handleNext();
            }
            return true;
        } catch (error) {
            console.error('Error rating song:', error);
            return false;
        }
    }, [currentUser, currentSong, handleNext]);

    const stop = useCallback(() => {
        pauseLocal();
        seekLocal(0);
        setCurrentSong(null);
        setIsPlaying(false);
    }, [pauseLocal, seekLocal]);

    const value = {
        isPlaying, currentSong, currentTime, duration, volume,
        playlist, playlistIndex, shuffle, repeat, isLoading, playbackError, toast,
        playableSongs, showToast, playSong, togglePlay, pause, resume,
        handleNext, handlePrevious, seek, setVolume, rateSong, stop,
        setShuffle, setRepeat, setPlaylist,
        clearError: () => setPlaybackError(null),
        audioRef
    };

    return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) throw new Error('useMusic must be used within a MusicProvider');
    return context;
};

export default MusicContext;
