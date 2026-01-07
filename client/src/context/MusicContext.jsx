import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRanTunesAuth } from './RanTunesAuthContext';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { MUSIC_API_URL, SKIP_THRESHOLD } from '@/constants/music';
import SpotifyService from '@/lib/spotifyService';

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

    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [playbackError, setPlaybackError] = useState(null);
    const [toast, setToast] = useState(null);

    // 5.5 Transition Phase for Vinyl animations (Killer Feature)
    const [transitionPhase, setTransitionPhase] = useState('stopped');
    const targetVolumeRef = useRef(0.8);
    const isManuallyTransitioningRef = useRef(false);

    // Dynamic volume control - sync with targetVolumeRef
    const updateVolume = useCallback((v) => {
        targetVolumeRef.current = v;
        if (currentSong?.file_path?.startsWith('spotify:')) {
            if (sdk.isReady) sdk.setVolume(v);
        } else {
            setVolume(v);
        }
    }, [currentSong, sdk, setVolume]);

    // 4. Shared Display State (Synchronized from either Source)
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Keep transitionPhase in sync with playing state when not manually transitioning
    useEffect(() => {
        if (isManuallyTransitioningRef.current) return;
        setTransitionPhase(isPlaying ? 'playing' : 'stopped');
    }, [isPlaying]);

    // Perform smooth fade transition
    const performTransition = useCallback(async (action) => {
        if (!currentSong || !isPlaying) {
            await action();
            return;
        }

        isManuallyTransitioningRef.current = true;

        try {
            // 1. Fade Out & Slow Vinyl
            setTransitionPhase('fading_out');
            const originalVolume = targetVolumeRef.current;
            const fadeDuration = 1000;
            const steps = 10;

            for (let i = steps; i >= 0; i--) {
                const v = (i / steps) * originalVolume;
                if (currentSong?.file_path?.startsWith('spotify:')) {
                    if (sdk.isReady) await sdk.setVolume(v);
                } else {
                    setVolume(v);
                }
                await new Promise(r => setTimeout(r, fadeDuration / steps));
            }

            // 2. Buffer / Switch Song
            setTransitionPhase('buffering');
            await action();

            // Short natural delay (0.5s) for a seamless song-change feel
            await new Promise(r => setTimeout(r, 500));

            // 3. Set volume immediately and resume
            setTransitionPhase('playing');
            if (sdk.isReady) sdk.setVolume(originalVolume);
            setVolume(originalVolume);
        } finally {
            isManuallyTransitioningRef.current = false;
        }
    }, [currentSong, isPlaying, sdk, setVolume]);

    // Sync state from Local Audio
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (!isSpotify) {
            setIsPlaying(isLocalPlaying);
            setCurrentTime(localTime);
            setDuration(localDuration);
        }
    }, [isLocalPlaying, localTime, localDuration, currentSong]);

    // 5. JUST LOADED PROTECTION
    const lastLoadTimeRef = useRef(0);

    // Sync state from Spotify SDK
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (isSpotify && sdk.isReady && !sdk.error) {
            // 1. Sync Playback State
            const now = Date.now();
            const recentlyLoaded = now - lastLoadTimeRef.current < 2000;

            if (!isLoading && !recentlyLoaded) {
                setIsPlaying(sdk.isPlaying);
            }

            if (sdk.position > 0) setCurrentTime(sdk.position / 1000);
            if (sdk.duration > 0) setDuration(sdk.duration / 1000);

            // 2. Sync Metadata (Handle auto-advance/external changes)
            if (sdk.currentTrack) {
                const spotifyUri = `spotify:track:${sdk.currentTrack.id}`;
                if (currentSong?.file_path !== spotifyUri) {
                    const matchedSong = playlist.find(s => s.file_path === spotifyUri);
                    if (matchedSong) {
                        setCurrentSong(matchedSong);
                        const idx = playlist.findIndex(s => s.id === matchedSong.id);
                        if (idx >= 0) setPlaylistIndex(idx);
                    }
                }
            }
        }
    }, [sdk.isPlaying, sdk.position, sdk.duration, sdk.isReady, sdk.currentTrack, currentSong, isLoading, playlist]);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(current =>
            current?.message === message ? null : current
        ), 3000);
    }, []);

    // 🔄 SYNC PLAYBACK STATE TO SUPABASE (for iCaffe MiniMusicPlayer)
    // Only sync when song or playing state changes - NOT on time updates
    const lastSyncedSongRef = useRef(null);
    const lastSyncedPlayingRef = useRef(null);

    useEffect(() => {
        const syncPlaybackToSupabase = async () => {
            if (!currentUser?.email || !currentSong) return;

            // Only sync if song or playing state actually changed
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
                    cover_url: currentSong.album?.cover_url || currentSong.cover_url || currentSong.album?.images?.[0]?.url || '',
                    spotify_uri: currentSong.file_path?.startsWith('spotify:') ? currentSong.file_path : null,
                    is_playing: isPlaying,
                    position_ms: Math.floor(currentTime * 1000),
                    duration_ms: Math.floor(duration * 1000),
                    updated_at: new Date().toISOString()
                };

                await supabase
                    .from('music_current_playback')
                    .upsert(playbackData, { onConflict: 'user_email' });

                // Update refs after successful sync
                lastSyncedSongRef.current = currentSong.id;
                lastSyncedPlayingRef.current = isPlaying;

                console.log('🔄 Synced playback:', currentSong.title, isPlaying ? '▶️' : '⏸️');

            } catch (err) {
                console.error('Failed to sync playback to Supabase:', err);
            }
        };

        // Small debounce to let playback actually start
        const timeoutId = setTimeout(syncPlaybackToSupabase, 800);
        return () => clearTimeout(timeoutId);
    }, [currentUser, currentSong?.id, isPlaying]);

    // 🎮 LISTEN FOR REMOTE COMMANDS FROM iCaffe MiniMusicPlayer
    // TEMPORARILY DISABLED FOR DEBUGGING
    /*
    const isPlayingRef = useRef(isPlaying);
    const currentSongRef = useRef(currentSong);
    const sdkRef = useRef(sdk);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { sdkRef.current = sdk; }, [sdk]);

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

                    console.log('🎮 Received remote command:', cmd.command);

                    // Use refs for current state
                    const playing = isPlayingRef.current;
                    const song = currentSongRef.current;
                    const spotifySdk = sdkRef.current;

                    // Execute the command
                    switch (cmd.command) {
                        case 'play':
                            if (!playing) {
                                const isSpotify = song?.file_path?.startsWith('spotify:');
                                if (isSpotify && spotifySdk?.isReady) {
                                    await spotifySdk.resume();
                                } else {
                                    resumeLocal?.();
                                }
                                setIsPlaying(true);
                            }
                            break;
                        case 'pause':
                            if (playing) {
                                const isSpotify = song?.file_path?.startsWith('spotify:');
                                if (isSpotify && spotifySdk?.isReady) {
                                    await spotifySdk.pause();
                                } else {
                                    pauseLocal?.();
                                }
                                setIsPlaying(false);
                            }
                            break;
                        case 'next':
                            handleNextRef.current?.();
                            break;
                        case 'previous':
                            // Will be implemented if needed
                            break;
                    }

                    // Mark command as processed
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.email]); // Only depends on email - stable connection
    */

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
            // Optimistic update to UI
            setIsPlaying(prev => !prev);
            await sdk.togglePlay();
        } else if (!isSpotify) {
            if (isLocalPlaying) pauseLocal();
            else resumeLocal();
        }
    }, [currentSong, sdk, isLocalPlaying, pauseLocal, resumeLocal]);

    // PLAY ACTION
    const playSong = useCallback(async (song, playlistSongs = null, forcePlay = false) => {
        // Use transition for song changes, but not for initial play from stop
        const action = async () => {
            if (!song) return;

            console.log('🎵 [MusicContext] playSong Execution:', {
                title: song.title,
                id: song.id
            });

            // If same song is already playing/current, toggle instead of restart
            if (currentSong?.id === song.id && !forcePlay) {
                togglePlay();
                return;
            }

            // Disliked protection
            if ((song.myRating || 0) === 1) {
                handleNext();
                return;
            }

            setIsLoading(true);
            setPlaybackError(null);
            setCurrentSong(song);

            try {
                const isSpotifyTrack = song.file_path?.startsWith('spotify:');
                const currentPlaylist = Array.isArray(playlistSongs) ? playlistSongs : (Array.isArray(playlist) ? playlist : []);

                if (isSpotifyTrack) {
                    const allSpotifyUris = currentPlaylist
                        .filter(s => s.file_path?.startsWith('spotify:track:') && (s.myRating || 0) !== 1)
                        .map(s => s.file_path);

                    pauseLocal();
                    if (sdk.isReady && sdk.deviceId) {
                        setIsPlaying(true);
                        await sdk.play(song.file_path, 0, allSpotifyUris);
                    } else if (song.preview_url) {
                        setIsPlaying(true);
                        await playLocalPath(song.preview_url, true);
                    }
                } else {
                    setIsPlaying(true);
                    const isBlob = !!(song.isLocalDeviceFile && song.file_blob_url);
                    const path = isBlob ? song.file_blob_url : song.file_path;
                    await playLocalPath(path, isBlob);
                }

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
    }, [currentSong, isPlaying, togglePlay, playlist, sdk, playLocalPath, pauseLocal, performTransition]);

    // 7. Spotify Audio Features (Smart Simulation)
    const [trackFeatures, setTrackFeatures] = useState(null);

    useEffect(() => {
        const fetchFeatures = async () => {
            if (currentSong?.file_path?.startsWith('spotify:track:')) {
                try {
                    const trackId = currentSong.file_path.split(':')[2];
                    const features = await SpotifyService.getAudioFeatures(trackId);
                    setTrackFeatures(features);
                } catch (e) {
                    console.warn('Failed to fetch audio features:', e);
                    setTrackFeatures(null);
                }
            } else {
                setTrackFeatures(null);
            }
        };
        fetchFeatures();
    }, [currentSong]);

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
                // Re-implementation of minimal play logic for speed inside transition
                setCurrentSong(nextSong);
                setPlaylistIndex(nextIndex);

                const isSpotify = nextSong.file_path?.startsWith('spotify:');
                if (isSpotify && sdk.isReady) {
                    const allUris = playlist
                        .filter(s => s.file_path?.startsWith('spotify:track:') && !isDisliked(s))
                        .map(s => s.file_path);
                    await sdk.play(nextSong.file_path, 0, allUris);
                } else if (!isSpotify) {
                    await playLocalPath(nextSong.file_path);
                }
                setIsPlaying(true);
            }
        });
    }, [playlist, playlistIndex, shuffle, repeat, currentSong, currentTime, duration, sdk, playLocalPath, performTransition]);
    const handlePrevious = useCallback(() => {
        performTransition(async () => {
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

            const prevSong = playlist[prevIndex];
            if (prevSong) {
                setCurrentSong(prevSong);
                setPlaylistIndex(prevIndex);

                const isSpotify = prevSong.file_path?.startsWith('spotify:');
                if (isSpotify && sdk.isReady) {
                    const allUris = playlist
                        .filter(s => s.file_path?.startsWith('spotify:track:') && !isDisliked(s))
                        .map(s => s.file_path);
                    await sdk.play(prevSong.file_path, 0, allUris);
                } else if (!isSpotify) {
                    await playLocalPath(prevSong.file_path);
                }
                setIsPlaying(true);
            }
        });
    }, [playlist, playlistIndex, currentTime, sdk, playLocalPath, performTransition, seek]);

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
        setTransitionPhase('stopped');
    }, [pauseLocal, seekLocal]);

    // 6. Audio Analysis
    const realAmplitude = useAudioAnalyzer(audioRef, isLocalPlaying || (isPlaying && currentSong?.preview_url && !sdk.isPlaying));

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
        trackFeatures
    };

    return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) throw new Error('useMusic must be used within a MusicProvider');
    return context;
};

export default MusicContext;
