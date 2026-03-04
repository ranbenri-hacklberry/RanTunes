import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRanTunesAuth } from './RanTunesAuthContext';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { MUSIC_API_URL, SKIP_THRESHOLD } from '@/constants/music';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
    const { user: currentUser } = useRanTunesAuth();
    const handleNextRef = useRef(() => { });

    // Audio Logic using custom hook (Local/Streamed)
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

    // Current Playlist & Metadata State
    const [currentSong, setCurrentSong] = useState(null);
    const [playlist, setPlaylist] = useState([]);
    const [playlistIndex, setPlaylistIndex] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState('none'); // none, one, all

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [playbackError, setPlaybackError] = useState(null);
    const [toast, setToast] = useState(null);

    // Transition Phase for Vinyl animations
    const [transitionPhase, setTransitionPhase] = useState('stopped');
    const targetVolumeRef = useRef(0.8);
    const isManuallyTransitioningRef = useRef(false);

    const currentSongRef = useRef(currentSong);
    const playlistRef = useRef(playlist);

    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { playlistRef.current = playlist; }, [playlist]);

    // Shared Display State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Keep transitionPhase in sync with playing state
    useEffect(() => {
        if (isManuallyTransitioningRef.current) return;
        setTransitionPhase(isPlaying ? 'playing' : 'stopped');
    }, [isPlaying]);

    // Dynamic volume control
    const updateVolume = useCallback((v) => {
        targetVolumeRef.current = v;
        setVolume(v);
    }, [setVolume]);

    // Sync state from Local Audio
    useEffect(() => {
        setIsPlaying(isLocalPlaying);
        setCurrentTime(localTime);
        setDuration(localDuration);
    }, [isLocalPlaying, localTime, localDuration]);

    const lastLoadTimeRef = useRef(0);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(current =>
            current?.message === message ? null : current
        ), 3000);
    }, []);

    // Sync playback state to Supabase (for iCaffe MiniMusicPlayer)
    const lastSyncedSongRef = useRef(null);
    const lastSyncedPlayingRef = useRef(null);

    useEffect(() => {
        const syncPlaybackToSupabase = async () => {
            if (!currentUser?.email || !currentSong) return;

            const songChanged = lastSyncedSongRef.current !== currentSong.id;
            const playingChanged = lastSyncedPlayingRef.current !== isPlaying;
            if (!songChanged && !playingChanged) return;

            try {
                const playbackData = {
                    user_email: currentUser.email,
                    user_id: currentUser.id,
                    song_id: currentSong.id,
                    song_title: currentSong.title || currentSong.name || 'Unknown',
                    artist_name: currentSong.artist?.name || currentSong.artist_name || 'Unknown Artist',
                    album_name: currentSong.album?.name || currentSong.album_name || '',
                    cover_url: currentSong.album?.cover_url || currentSong.cover_url || '',
                    spotify_uri: null,
                    is_playing: isPlaying,
                    position_ms: Math.floor(currentTime * 1000),
                    duration_ms: Math.floor(duration * 1000),
                    updated_at: new Date().toISOString()
                };

                await supabase
                    .from('music_current_playback')
                    .upsert(playbackData, { onConflict: 'user_email' });

                lastSyncedSongRef.current = currentSong.id;
                lastSyncedPlayingRef.current = isPlaying;
            } catch (err) {
                console.error('Failed to sync playback to Supabase:', err);
            }
        };

        const timeoutId = setTimeout(syncPlaybackToSupabase, 800);
        return () => clearTimeout(timeoutId);
    }, [currentUser, currentSong?.id, isPlaying]);

    // Listen for remote commands from iCaffe
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    useEffect(() => {
        if (!currentUser?.email) return;

        const channel = supabase
            .channel('music-remote-commands')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'music_commands',
                    filter: `user_email=eq.${currentUser.email}`
                },
                async (payload) => {
                    const cmd = payload.new;
                    if (!cmd || cmd.processed_at) return;

                    const playing = isPlayingRef.current;
                    const song = currentSongRef.current;

                    switch (cmd.command) {
                        case 'play':
                            if (!playing) { resumeLocal?.(); setIsPlaying(true); }
                            break;
                        case 'pause':
                            if (playing) { pauseLocal?.(); setIsPlaying(false); }
                            break;
                        case 'next':
                            handleNextRef.current?.();
                            break;
                    }

                    try {
                        await supabase
                            .from('music_commands')
                            .update({ processed_at: new Date().toISOString() })
                            .eq('id', cmd.id);
                    } catch (err) {
                        console.error('Failed to mark command as processed:', err);
                    }
                }
            )
            .subscribe();

        const ratingsChannel = supabase
            .channel('music-ratings-sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'rantunes_ratings',
                    filter: `user_id=eq.${currentUser.id}`
                },
                (payload) => {
                    const newRecord = payload.new;
                    if (!newRecord) return;

                    const { song_id, rating } = newRecord;
                    setPlaylist(prev => prev.map(s => String(s.id) === String(song_id) ? { ...s, myRating: rating } : s));
                    setCurrentSong(prev => {
                        if (prev && String(prev.id) === String(song_id)) {
                            if (rating === 1) setTimeout(() => handleNextRef.current?.(), 100);
                            return { ...prev, myRating: rating };
                        }
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(ratingsChannel);
        };
    }, [currentUser?.email]);

    const playableSongs = useMemo(() =>
        playlist.filter(s => (s?.myRating || 0) !== 1),
        [playlist]);

    const logSkip = useCallback(async (song, wasEarlySkip) => { }, []);

    // Perform smooth fade transition
    const performTransition = useCallback(async (action) => {
        if (!currentSong || !isPlaying) {
            await action();
            return;
        }

        isManuallyTransitioningRef.current = true;

        try {
            setTransitionPhase('fading_out');
            const originalVolume = targetVolumeRef.current;
            const fadeDuration = 800;
            const steps = 10;

            for (let i = steps; i >= 0; i--) {
                setVolume((i / steps) * originalVolume);
                await new Promise(r => setTimeout(r, fadeDuration / steps));
            }

            setTransitionPhase('buffering');
            await action();
            await new Promise(r => setTimeout(r, 600));

            setTransitionPhase('playing');

            const restoreDuration = 400;
            const restoreSteps = 8;
            for (let i = 1; i <= restoreSteps; i++) {
                setVolume((i / restoreSteps) * originalVolume);
                await new Promise(r => setTimeout(r, restoreDuration / restoreSteps));
            }
            setVolume(originalVolume);

        } catch (err) {
            console.error('Transition error:', err);
            setTransitionPhase('playing');
            setVolume(targetVolumeRef.current);
        } finally {
            isManuallyTransitioningRef.current = false;
        }
    }, [currentSong, isPlaying, setVolume]);

    // CONTROLS
    const togglePlay = useCallback(async () => {
        if (isLocalPlaying) pauseLocal();
        else resumeLocal();
    }, [isLocalPlaying, pauseLocal, resumeLocal]);

    // PLAY ACTION
    const playSong = useCallback(async (song, playlistSongs = null, forcePlay = false) => {
        const action = async () => {
            if (!song) return;

            if (currentSong?.id === song.id && !forcePlay) {
                togglePlay();
                return;
            }

            if ((song.myRating || 0) === 1) {
                handleNext();
                return;
            }

            setIsLoading(true);
            setPlaybackError(null);
            setCurrentSong(song);

            try {
                setIsPlaying(true);
                const isBlob = !!(song.isLocalDeviceFile && song.file_blob_url);
                const path = isBlob ? song.file_blob_url : song.file_path;
                await playLocalPath(path, isBlob);

                if (Array.isArray(playlistSongs)) {
                    setPlaylist(playlistSongs);
                    const idx = playlistSongs.findIndex(s => s.id === song.id);
                    setPlaylistIndex(idx >= 0 ? idx : 0);
                }
            } catch (error) {
                console.error('Error playing song:', error);
                setPlaybackError(`שגיאה: ${error.message}`);
            } finally {
                setIsLoading(false);
                lastLoadTimeRef.current = Date.now();
            }
        };

        if (isPlaying && currentSong && currentSong.id !== song.id) {
            performTransition(action);
        } else {
            action();
        }
    }, [currentSong, isPlaying, togglePlay, playlist, playLocalPath, performTransition]);

    const pause = useCallback(() => {
        pauseLocal();
    }, [pauseLocal]);

    const resume = useCallback(() => {
        resumeLocal();
    }, [resumeLocal]);

    const seek = useCallback((time) => {
        seekLocal(time);
    }, [seekLocal]);

    // NAVIGATION
    const handleNext = useCallback(() => {
        performTransition(async () => {
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

            const nextSong = playlist[nextIndex];
            if (nextSong) {
                setCurrentSong(nextSong);
                setPlaylistIndex(nextIndex);
                await playLocalPath(nextSong.file_path);
                setIsPlaying(true);
            }
        });
    }, [playlist, playlistIndex, shuffle, repeat, currentSong, currentTime, duration, playLocalPath, performTransition]);

    const handlePrevious = useCallback(() => {
        performTransition(async () => {
            if (!playlist.length) return;
            if (currentTime > 3) {
                seek(0);
                return;
            }

            const isDisliked = (s) => (s?.myRating || 0) === 1;
            let prevIndex = (playlistIndex - 1 + playlist.length) % playlist.length;

            let guard = 0;
            while (guard < playlist.length && isDisliked(playlist[prevIndex])) {
                prevIndex = (prevIndex - 1 + playlist.length) % playlist.length;
                guard++;
            }

            const prevSong = playlist[prevIndex];
            if (prevSong) {
                setCurrentSong(prevSong);
                setPlaylistIndex(prevIndex);
                await playLocalPath(prevSong.file_path);
                setIsPlaying(true);
            }
        });
    }, [playlist, playlistIndex, currentTime, playLocalPath, performTransition, seek]);

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
        setTransitionPhase('stopped');
    }, [pauseLocal, seekLocal]);

    // Audio Analysis
    const realAmplitude = useAudioAnalyzer(audioRef, isLocalPlaying);

    const value = {
        isPlaying,
        currentSong,
        currentTime,
        duration,
        volume: targetVolumeRef.current,
        setVolume: updateVolume,
        isLoading,
        playbackError,
        toast,
        transitionPhase,
        playableSongs,
        showToast,
        playSong,
        togglePlay,
        pause,
        resume,
        handleNext,
        handlePrevious,
        seek,
        rateSong,
        stop,
        setShuffle,
        setRepeat,
        setPlaylist,
        clearError: () => setPlaybackError(null),
        audioRef,
        currentAmplitude: realAmplitude,
        playlist,
        playlistIndex,
        shuffle,
        repeat,
    };

    return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) throw new Error('useMusic must be used within a MusicProvider');
    return context;
};

export default MusicContext;
