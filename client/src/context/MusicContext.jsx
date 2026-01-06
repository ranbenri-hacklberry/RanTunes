import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRanTunesAuth } from './RanTunesAuthContext';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';
import { MUSIC_API_URL, SKIP_THRESHOLD, REPEAT_MODES } from '@/constants/music';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
    const { user: currentUser } = useRanTunesAuth();
    const audioRef = useRef(new Audio());
    const handleNextRef = useRef(() => { });

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.7);

    // Playlist state
    const [playlist, setPlaylist] = useState([]);
    const [playlistIndex, setPlaylistIndex] = useState(0);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState('none'); // none, one, all

    // Loading and error states
    const [isLoading, setIsLoading] = useState(false);
    const [playbackError, setPlaybackError] = useState(null);
    const [toast, setToast] = useState(null);

    /**
     * Shows a toast message that auto-dismisses.
     * @param {string} message - Message to display
     * @param {string} [type='info'] - 'info', 'error', or 'success'
     */
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(current =>
            current?.message === message ? null : current
        ), 3000);
    }, []);

    // Memoized list of playable songs (excludes disliked)
    const playableSongs = useMemo(() =>
        playlist.filter(s => (s?.myRating || 0) !== 1),
        [playlist]);

    // Spotify Player Hook
    const sdk = useSpotifyPlayer();

    // Debounce ref for SDK sync to prevent race conditions
    const syncDebounceRef = useRef(null);

    // Sync position and playing state only (fast sync)
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (!isSpotify || !sdk.isReady) return;

        setIsPlaying(sdk.isPlaying);
        if (sdk.position > 0) setCurrentTime(sdk.position / 1000);
        if (sdk.duration > 0) setDuration(sdk.duration / 1000);
    }, [sdk.isPlaying, sdk.position, sdk.duration, sdk.isReady]);

    // Sync track changes (debounced sync)
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (!isSpotify || !sdk.isReady) return;

        if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);

        syncDebounceRef.current = setTimeout(() => {
            if (sdk.currentTrack && sdk.currentTrack.uri !== currentSong?.file_path) {
                const newTrackUri = sdk.currentTrack.uri;
                const newTrackInPlaylist = playlist.find(s => s.file_path === newTrackUri);

                if (newTrackInPlaylist) {
                    setCurrentSong(newTrackInPlaylist);
                    const newIndex = playlist.findIndex(s => s.file_path === newTrackUri);
                    if (newIndex >= 0) setPlaylistIndex(newIndex);
                } else {
                    const spotifyTrack = sdk.currentTrack;
                    setCurrentSong({
                        id: spotifyTrack.id,
                        title: spotifyTrack.name,
                        file_path: spotifyTrack.uri,
                        artist: { name: spotifyTrack.artists?.[0]?.name || 'Unknown' },
                        album: {
                            name: spotifyTrack.album?.name,
                            cover_url: spotifyTrack.album?.images?.[0]?.url
                        },
                        duration_seconds: Math.round(sdk.duration / 1000)
                    });
                }
            }
        }, 400); // Higher debounce for track sync stability

        return () => {
            if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
        };
    }, [sdk.currentTrack, sdk.isReady, currentSong?.file_path, playlist]);


    // Audio event listeners and cleanup
    useEffect(() => {
        const audio = audioRef.current;
        let lastUpdateTime = 0;

        const handleTimeUpdate = () => {
            const now = Date.now();
            // Only update state every 500ms to save renders
            if (now - lastUpdateTime > 500) {
                setCurrentTime(audio.currentTime);
                lastUpdateTime = now;
            }
        };
        const handleDurationChange = () => setDuration(audio.duration || 0);
        const handleEnded = () => handleNextRef.current();
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);

        return () => {
            // Stop and cleanup audio on unmount
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.pause();
            audio.src = '';
            audio.load();
        };
    }, []);

    // Update volume
    useEffect(() => {
        audioRef.current.volume = volume;
    }, [volume]);

    // Log skip - simplified version (old tables removed)
    const logSkip = useCallback(async (song, wasEarlySkip) => {
        // Skip logging disabled - old tables don't exist in RanTunes schema
        // Removed console.log for production performance
    }, []);

    // Play a song
    const playSong = useCallback(async (song, playlistSongs = null) => {
        if (!song) return;

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
                // Build queue of all Spotify track URIs for continuous playback
                const allSpotifyUris = currentPlaylist
                    .filter(s => s.file_path?.startsWith('spotify:track:') && (s.myRating || 0) !== 1)
                    .map(s => s.file_path);

                // If Spotify track, use SDK if ready, or fallback to preview
                try {
                    if (sdk.isReady && sdk.deviceId) {
                        await sdk.play(song.file_path, 0, allSpotifyUris);
                        setIsPlaying(true);
                    } else if (song.preview_url) {
                        // Fallback to preview URL if SDK not ready
                        audioRef.current.src = song.preview_url;
                        audioRef.current.load();
                        await audioRef.current.play();
                        setIsPlaying(true);
                        showToast('מנגן תצוגה מקדימה (Spotify SDK לא זמין)', 'info');
                    } else {
                        // Last resort: try Spotify Web API remote control
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
                // Regular track - build audio URL
                let audioUrl;
                if (song.isLocalDeviceFile && song.file_blob_url) {
                    audioUrl = song.file_blob_url;
                } else {
                    audioUrl = `${MUSIC_API_URL}/music/stream?path=${encodeURIComponent(song.file_path)}`;
                }

                audioRef.current.src = audioUrl;
                audioRef.current.load();

                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (playError) {
                    console.error('Audio play failed:', playError);
                    setPlaybackError('שגיאה בנגינת הקובץ - הקובץ עשוי להיות לא זמין.');
                    showToast('שגיאה בנגינת הקובץ', 'error');
                    setIsPlaying(false);
                }
            }

            setCurrentSong(song);

            // Set playlist if provided
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
    }, [playlist, sdk.isReady, sdk.deviceId, sdk.play, showToast]);

    // Play/Pause toggle
    const togglePlay = useCallback(async () => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');

        if (isSpotify && sdk.isReady) {
            try {
                await sdk.togglePlay();
            } catch (err) {
                console.error('SDK togglePlay failed:', err);
            }
        } else if (isSpotify) {
            // Remote control fallback
            try {
                const SpotifyService = (await import('@/lib/spotifyService')).default;
                const state = await SpotifyService.getPlaybackState();
                if (state?.is_playing) await SpotifyService.pause();
                else await SpotifyService.play();
            } catch (e) {
                console.error('Remote toggle failed:', e);
            }
        } else {
            if (audioRef.current.src) {
                if (audioRef.current.paused) {
                    audioRef.current.play().catch(e => console.error('Audio play failed:', e));
                } else {
                    audioRef.current.pause();
                }
            }
        }
    }, [currentSong, sdk]);

    // Pause
    const pause = useCallback(async () => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (isSpotify) {
            if (sdk.isReady) {
                await sdk.pause();
            } else {
                const SpotifyService = (await import('@/lib/spotifyService')).default;
                await SpotifyService.pause();
            }
        } else {
            audioRef.current.pause();
        }
    }, [currentSong, sdk.isReady, sdk.pause]);

    // Resume
    const resume = useCallback(async () => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (isSpotify) {
            if (sdk.isReady) {
                await sdk.resume();
            } else {
                const SpotifyService = (await import('@/lib/spotifyService')).default;
                await SpotifyService.play();
            }
        } else {
            audioRef.current.play().catch(e => console.error('Audio resume failed:', e));
        }
    }, [currentSong, sdk.isReady, sdk.resume]);

    // Next song with safeguards against infinite loops
    const handleNext = useCallback(() => {
        if (!playlist.length) return;

        // Check if this was an early skip
        const wasEarlySkip = currentTime < duration * SKIP_THRESHOLD;
        if (currentSong && wasEarlySkip) {
            logSkip(currentSong, true);
        }

        const isDislikedSong = (s) => (s?.myRating || 0) === 1;

        // Early exit if ALL songs are disliked
        const playableSongsList = playlist.filter(s => !isDislikedSong(s));
        if (playableSongsList.length === 0) {
            setIsPlaying(false);
            showToast('כל השירים ברשימה מסומנים כ"לא אהוב"', 'error');
            return;
        }

        let nextIndex;
        if (shuffle) {
            // Pick random from playable songs only
            const randomPlayable = playableSongs[Math.floor(Math.random() * playableSongs.length)];
            nextIndex = playlist.findIndex(s => s.id === randomPlayable.id);
        } else if (repeat === 'one') {
            nextIndex = playlistIndex;
        } else {
            nextIndex = playlistIndex + 1;
            if (nextIndex >= playlist.length) {
                if (repeat === 'all') {
                    nextIndex = 0;
                } else {
                    setIsPlaying(false);
                    return;
                }
            }
        }

        // Skip disliked songs (with guard)
        if (!shuffle && repeat !== 'one') {
            let guard = 0;
            while (guard < playlist.length && isDislikedSong(playlist[nextIndex])) {
                nextIndex += 1;
                if (nextIndex >= playlist.length) {
                    if (repeat === 'all') nextIndex = 0;
                    else {
                        setIsPlaying(false);
                        return;
                    }
                }
                guard += 1;
            }
        }

        setPlaylistIndex(nextIndex);
        playSong(playlist[nextIndex]);
    }, [playlist, playlistIndex, shuffle, repeat, currentSong, currentTime, duration, logSkip, playSong, playableSongs]);

    // Keep ref in sync with handleNext
    useEffect(() => {
        handleNextRef.current = handleNext;
    }, [handleNext]);

    // Previous song
    const handlePrevious = useCallback(() => {
        if (!playlist.length || !playableSongs.length) return;

        // If more than 3 seconds in, restart current song
        if (currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        let prevIndex;
        if (shuffle) {
            // Pick random from playable songs
            const randomPlayable = playableSongs[Math.floor(Math.random() * playableSongs.length)];
            prevIndex = playlist.findIndex(s => s.id === randomPlayable.id);
        } else {
            prevIndex = playlistIndex - 1;

            // If we hit the beginning, wrap or stop
            if (prevIndex < 0) {
                if (repeat === 'all') {
                    prevIndex = playlist.length - 1;
                } else {
                    prevIndex = 0;
                }
            }

            // Guard against disliked songs (backwards scan)
            const isDislikedSong = (s) => (s?.myRating || 0) === 1;
            let guard = 0;
            while (guard < playlist.length && isDislikedSong(playlist[prevIndex])) {
                prevIndex -= 1;
                if (prevIndex < 0) {
                    if (repeat === 'all') prevIndex = playlist.length - 1;
                    else {
                        prevIndex = playlist.findIndex(s => !isDislikedSong(s));
                        break;
                    }
                }
                guard += 1;
            }
        }

        if (prevIndex !== -1) {
            setPlaylistIndex(prevIndex);
            playSong(playlist[prevIndex]);
        }
    }, [playlist, playlistIndex, repeat, currentTime, playSong, playableSongs, shuffle]);

    // Seek to position
    const seek = useCallback((time) => {
        if (currentSong?.file_path?.startsWith('spotify:') && sdk.isReady) {
            sdk.seek(time * 1000);
        } else {
            audioRef.current.currentTime = time;
        }
    }, [currentSong, sdk]);

    // Rate a song (like/dislike only)
    const rateSong = useCallback(async (songId, rating) => {
        if (!currentUser || !songId) return false;

        try {
            // Use Supabase directly to save rating
            // song_id is TEXT - can be UUID or spotify URI
            const { error } = await supabase
                .from('rantunes_ratings')
                .upsert({
                    song_id: String(songId),
                    user_id: currentUser.id,
                    rating: rating,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, song_id' });

            if (error) {
                console.error('🎵 rateSong error:', error);
                throw error;
            }

            console.log('🎵 rateSong success!');

            // Update current playlist and current song with the new rating
            setPlaylist(prev => prev.map(s => s.id === songId ? { ...s, myRating: rating } : s));
            if (currentSong?.id === songId) {
                setCurrentSong(prev => ({ ...prev, myRating: rating }));

                // If the current song was just disliked, skip to next
                if (rating === 1) {
                    console.log('🎵 rateSong: current song disliked, skipping...');
                    handleNext();
                }
            }

            return true;
        } catch (error) {
            console.error('Error rating song:', error);
            return false;
        }
    }, [currentUser]);

    // Set volume
    const setVolume = useCallback((vol) => {
        const clampedVol = Math.max(0, Math.min(1, vol));
        setVolumeState(clampedVol);
        audioRef.current.volume = clampedVol;
    }, []);


    // Stop playback
    const stop = useCallback(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentSong(null);
        setIsPlaying(false);
    }, []);

    const value = {
        // State
        isPlaying,
        currentSong,
        currentTime,
        duration,
        volume,
        playlist,
        playlistIndex,
        shuffle,
        repeat,
        isLoading,
        playbackError,
        toast,
        showToast,
        playableSongs, // Memoized list of non-disliked songs

        // Actions
        playSong,
        togglePlay,
        pause,
        resume,
        handleNext,
        handlePrevious,
        seek,
        setVolume,
        rateSong,
        stop,
        setShuffle,
        setRepeat,
        setPlaylist,
        clearError: () => setPlaybackError(null),

        // Refs
        audioRef
    };

    return (
        <MusicContext.Provider value={value}>
            {children}
        </MusicContext.Provider>
    );
};

export const useMusic = () => {
    const context = useContext(MusicContext);
    if (!context) {
        throw new Error('useMusic must be used within a MusicProvider');
    }
    return context;
};

export default MusicContext;
