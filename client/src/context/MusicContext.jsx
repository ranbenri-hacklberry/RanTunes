import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRanTunesAuth } from './RanTunesAuthContext';
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer';

/**
 * @typedef {Object} Song
 * @property {string} id - Unique song ID
 * @property {string} title - Song title
 * @property {string} file_path - Path to audio file or Spotify URI
 * @property {string} [preview_url] - Spotify preview URL
 * @property {Object} [artist] - Artist info
 * @property {Object} [album] - Album info
 * @property {number} [myRating] - User's rating (1=dislike, 5=like)
 */

const MusicContext = createContext(null);

// Get base URL for music files from backend
const MUSIC_API_URL = import.meta.env.VITE_MUSIC_API_URL ||
    import.meta.env.VITE_MANAGER_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8080';

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

    // Spotify Player Hook
    const sdk = useSpotifyPlayer();

    // SDK state sync (silent - no console output for production)

    // Sync SDK state with context state - ONLY when on a Spotify song
    useEffect(() => {
        const isSpotify = currentSong?.file_path?.startsWith('spotify:');
        if (isSpotify && sdk.isReady) {
            setIsPlaying(sdk.isPlaying);
            if (sdk.position > 0) setCurrentTime(sdk.position / 1000);
            if (sdk.duration > 0) setDuration(sdk.duration / 1000);

            // Detect track change from Spotify SDK
            if (sdk.currentTrack && sdk.currentTrack.uri !== currentSong?.file_path) {
                console.log('🎧 [MusicContext] Spotify track changed to:', sdk.currentTrack.name);

                // Find the new track in our playlist
                const newTrackUri = sdk.currentTrack.uri;
                const newTrackInPlaylist = playlist.find(s => s.file_path === newTrackUri);

                if (newTrackInPlaylist) {
                    // Update current song to match what Spotify is playing
                    setCurrentSong(newTrackInPlaylist);
                    const newIndex = playlist.findIndex(s => s.file_path === newTrackUri);
                    if (newIndex >= 0) setPlaylistIndex(newIndex);
                } else {
                    // Track not in our playlist - create a minimal song object
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

                // Sync to Supabase for iCaffe (disabled until table is created)
                // TODO: Run CREATE_SHARED_PLAYBACK_TABLE.sql in Supabase to enable this
                /*
                if (currentUser && sdk.currentTrack) {
                    try {
                        await supabase.from('music_current_playback').upsert({
                            user_id: currentUser.id,
                            song_id: sdk.currentTrack.id,
                            song_title: sdk.currentTrack.name,
                            artist_name: sdk.currentTrack.artists?.[0]?.name || 'Unknown',
                            album_name: sdk.currentTrack.album?.name || '',
                            cover_url: sdk.currentTrack.album?.images?.[0]?.url || null,
                            spotify_uri: sdk.currentTrack.uri,
                            is_playing: sdk.isPlaying,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id' });
                    } catch (err) {
                        console.warn('Sync error:', err);
                    }
                }
                */
            }
        }
    }, [sdk.isPlaying, sdk.position, sdk.duration, sdk.isReady, sdk.currentTrack, currentSong, playlist, currentUser]);

    // Skip threshold - if song was played less than 30% before skip, count as dislike
    const SKIP_THRESHOLD = 0.3;

    // Audio event listeners
    useEffect(() => {
        const audio = audioRef.current;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
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
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
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
            if (playlistSongs || playlist.length > 0) {
                if (playlistSongs) setPlaylist(playlistSongs);
                setTimeout(() => handleNextRef.current(), 100);
            }
            return;
        }

        setIsLoading(true);
        setPlaybackError(null); // Clear previous errors

        try {
            // Detect if it's a Spotify track
            const isSpotifyTrack = song.file_path?.startsWith('spotify:');

            if (isSpotifyTrack) {
                // Build queue of all Spotify track URIs for continuous playback
                const currentPlaylist = playlistSongs || playlist;
                const allSpotifyUris = currentPlaylist
                    .filter(s => s.file_path?.startsWith('spotify:track:') && (s.myRating || 0) !== 1)
                    .map(s => s.file_path);

                // If Spotify track, use SDK if ready, or fallback to preview
                try {
                    if (sdk.isReady && sdk.deviceId) {
                        await sdk.play(song.file_path, 0, allSpotifyUris);
                    } else if (song.preview_url) {
                        // Fallback to preview URL if SDK not ready
                        audioRef.current.src = song.preview_url;
                        audioRef.current.load();
                        await audioRef.current.play();
                    } else {
                        // Last resort: try Spotify Web API remote control
                        const SpotifyService = (await import('@/lib/spotifyService')).default;
                        await SpotifyService.play({ uris: [song.file_path] });
                    }
                } catch (err) {
                    setPlaybackError(`לא ניתן לנגן: ${err.message || 'שגיאה לא ידועה'}`);
                    // Don't throw - gracefully continue
                }
                setIsPlaying(true);
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
                } catch (playError) {
                    console.error('Audio play failed:', playError);
                    throw new Error('Failed to play audio. The file may not be available.');
                }
            }

            setCurrentSong(song);

            // Set playlist if provided
            if (playlistSongs) {
                setPlaylist(playlistSongs);
                const idx = playlistSongs.findIndex(s => s.id === song.id);
                setPlaylistIndex(idx >= 0 ? idx : 0);
            }

            // Sync playback state to Supabase for iCaffe integration (disabled until table is created)
            // TODO: Run CREATE_SHARED_PLAYBACK_TABLE.sql in Supabase to enable this
            /*
            if (currentUser) {
                try {
                    await supabase.from('music_current_playback').upsert({
                        user_id: currentUser.id,
                        song_id: String(song.id),
                        song_title: song.title,
                        artist_name: song.artist?.name || 'Unknown',
                        album_name: song.album?.name || '',
                        cover_url: song.album?.cover_url || null,
                        spotify_uri: song.file_path?.startsWith('spotify:') ? song.file_path : null,
                        is_playing: true,
                        duration_ms: (song.duration_seconds || 0) * 1000,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                } catch (syncErr) {
                    console.warn('Failed to sync playback state:', syncErr);
                }
            }
            */
        } catch (error) {
            console.error('Error playing song:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, sdk.isReady, sdk.deviceId, sdk.play]);

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
        const playableSongs = playlist.filter(s => !isDislikedSong(s));
        if (playableSongs.length === 0) {
            setIsPlaying(false);
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
    }, [playlist, playlistIndex, shuffle, repeat, currentSong, currentTime, duration, logSkip, playSong]);

    // Keep ref in sync with handleNext
    useEffect(() => {
        handleNextRef.current = handleNext;
    }, [handleNext]);

    // Previous song
    const handlePrevious = useCallback(() => {
        if (!playlist.length) return;

        // If more than 3 seconds in, restart current song
        if (currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }

        const isDislikedSong = (s) => (s?.myRating || 0) === 1;

        let prevIndex = playlistIndex - 1;
        if (prevIndex < 0) {
            prevIndex = repeat === 'all' ? playlist.length - 1 : 0;
        }

        // Skip disliked songs (backwards scan)
        let guard = 0;
        while (guard < playlist.length && isDislikedSong(playlist[prevIndex])) {
            prevIndex -= 1;
            if (prevIndex < 0) {
                if (repeat === 'all') prevIndex = playlist.length - 1;
                else {
                    // Start of playlist reached and it's disliked
                    prevIndex = 0;
                    // If even the first one is disliked, we stop or find first playable
                    if (isDislikedSong(playlist[0])) {
                        let firstPlayable = playlist.findIndex(s => !isDislikedSong(s));
                        if (firstPlayable === -1) {
                            setIsPlaying(false);
                            return;
                        }
                        prevIndex = firstPlayable;
                    }
                    break;
                }
            }
            guard += 1;
        }

        setPlaylistIndex(prevIndex);
        playSong(playlist[prevIndex]);
    }, [playlist, playlistIndex, repeat, currentTime, playSong]);

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
        console.log('🎵 rateSong called:', { songId, rating, currentUser: currentUser?.id });
        if (!currentUser || !songId) {
            console.log('🎵 rateSong: missing user or songId', { hasUser: !!currentUser, hasSongId: !!songId });
            return false;
        }

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
