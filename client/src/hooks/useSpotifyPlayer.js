import { useState, useEffect, useCallback, useRef } from 'react';
import { getAccessToken } from '@/lib/spotifyService';

/**
 * Spotify Web Playback SDK Hook
 * Enables playing Spotify music directly in the browser
 */
export function useSpotifyPlayer() {
    const [player, setPlayer] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [lastTimestamp, setLastTimestamp] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [error, setError] = useState(null);

    const playerRef = useRef(null);
    const positionInterval = useRef(null);
    const isActiveDevice = useRef(false);

    // Initialize the Spotify Player
    useEffect(() => {
        console.log('🎵 [SpotifyPlayer] Initializing Spotify Player hook...');

        // Load Spotify SDK script
        if (!window.Spotify) {
            console.log('🎵 [SpotifyPlayer] Loading Spotify SDK script...');
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
        } else {
            console.log('🎵 [SpotifyPlayer] Spotify SDK already loaded');
        }

        window.onSpotifyWebPlaybackSDKReady = async () => {
            console.log('🎵 [SpotifyPlayer] SDK Ready callback triggered!');
            const token = await getAccessToken();
            console.log('🎵 [SpotifyPlayer] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'NULL');
            if (!token) {
                console.error('🎵 [SpotifyPlayer] ERROR: No Spotify token available!');
                setError('No Spotify token available');
                return;
            }

            const spotifyPlayer = new window.Spotify.Player({
                name: 'RanTunes Web Player',
                getOAuthToken: async cb => {
                    const freshToken = await getAccessToken();
                    cb(freshToken);
                },
                volume: volume,
            });

            // Error handling
            spotifyPlayer.addListener('initialization_error', ({ message }) => {
                console.error('🎵 [SpotifyPlayer] INITIALIZATION ERROR:', message);
                setError(message);
            });

            spotifyPlayer.addListener('authentication_error', ({ message }) => {
                console.error('🎵 [SpotifyPlayer] AUTHENTICATION ERROR:', message);
                console.error('🎵 [SpotifyPlayer] This usually means the token is invalid or expired');
                setError(message);
            });

            spotifyPlayer.addListener('account_error', ({ message }) => {
                console.error('🎵 [SpotifyPlayer] ACCOUNT ERROR:', message);
                console.error('🎵 [SpotifyPlayer] ⚠️ Premium account is REQUIRED for playback!');
                setError('Premium account required for playback');
            });

            spotifyPlayer.addListener('playback_error', ({ message }) => {
                console.error('🎵 [SpotifyPlayer] PLAYBACK ERROR:', message);
            });

            // Playback status updates
            spotifyPlayer.addListener('player_state_changed', state => {
                if (!state) {
                    console.log('🎵 [SpotifyPlayer] player_state_changed: No state (device not active)');
                    isActiveDevice.current = false;
                    return;
                }

                console.log('🎵 [SpotifyPlayer] player_state_changed:', {
                    paused: state.paused,
                    position: state.position,
                    duration: state.duration,
                    track: state.track_window?.current_track?.name,
                    volume: state.volume
                });

                isActiveDevice.current = true;
                setCurrentTrack(state.track_window.current_track);
                setIsPlaying(!state.paused);

                setPosition(state.position);
                setLastTimestamp(Date.now());
                setDuration(state.duration);
            });

            // Ready
            spotifyPlayer.addListener('ready', ({ device_id }) => {
                console.log('🎵 RanTunes Player ready with Device ID:', device_id);
                setDeviceId(device_id);
                setIsReady(true);
                isActiveDevice.current = false;

                // Ensure volume is set to audible level
                spotifyPlayer.setVolume(0.8).then(() => {
                    console.log('🎵 [SpotifyPlayer] Volume set to 80%');
                });
            });

            // Not Ready
            spotifyPlayer.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
                setIsReady(false);
            });

            // Connect to the player
            console.log('🎵 [SpotifyPlayer] Attempting to connect to Spotify...');
            const success = await spotifyPlayer.connect();
            if (success) {
                console.log('🎵 [SpotifyPlayer] ✅ Successfully connected to Spotify!');
                playerRef.current = spotifyPlayer;
                setPlayer(spotifyPlayer);
            } else {
                console.error('🎵 [SpotifyPlayer] ❌ Failed to connect to Spotify!');
            }
        };

        // If SDK already loaded
        if (window.Spotify) {
            window.onSpotifyWebPlaybackSDKReady();
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
            }
            if (positionInterval.current) {
                clearInterval(positionInterval.current);
            }
        };
    }, []);

    // Update position more smoothly when playing
    useEffect(() => {
        if (isPlaying && !error) {
            positionInterval.current = setInterval(() => {
                setPosition(prev => {
                    const next = prev + 500;
                    return (duration > 0 && next > duration) ? duration : next;
                });
            }, 500);
        }

        return () => {
            if (positionInterval.current) clearInterval(positionInterval.current);
        };
    }, [isPlaying, duration, error]);

    // Helper to check if this device is active
    const checkIsActive = async () => {
        if (!playerRef.current) return false;
        const state = await playerRef.current.getCurrentState();
        return !!state;
    };

    // Play a specific track
    const play = useCallback(async (spotifyUri, positionMs = 0) => {
        console.log('🎵 [SpotifyPlayer] play() called with URI:', spotifyUri);
        console.log('🎵 [SpotifyPlayer] Current deviceId:', deviceId);
        console.log('🎵 [SpotifyPlayer] isReady:', isReady);

        if (!deviceId) {
            console.error('🎵 [SpotifyPlayer] ERROR: No device ID available!');
            setError('No device available');
            return;
        }

        const token = await getAccessToken();
        console.log('🎵 [SpotifyPlayer] Token for play:', token ? 'exists' : 'NULL');
        if (!token) {
            console.error('🎵 [SpotifyPlayer] ERROR: No token for playback!');
            return;
        }

        try {
            const isActive = await checkIsActive();
            console.log('🎵 [SpotifyPlayer] Is device active?', isActive);

            if (!isActive) {
                console.log('🎵 [SpotifyPlayer] Device not active, transferring playback to:', deviceId);
                const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        device_ids: [deviceId],
                        play: false,
                    }),
                });
                console.log('🎵 [SpotifyPlayer] Transfer response status:', transferResponse.status);
                if (!transferResponse.ok) {
                    const errorText = await transferResponse.text();
                    console.error('🎵 [SpotifyPlayer] Transfer failed:', errorText);
                }
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const body = { uris: [spotifyUri], position_ms: positionMs };
            console.log('🎵 [SpotifyPlayer] Sending play request with body:', JSON.stringify(body));

            const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            console.log('🎵 [SpotifyPlayer] Play response status:', playResponse.status);
            if (!playResponse.ok) {
                const errorText = await playResponse.text();
                console.error('🎵 [SpotifyPlayer] Play request failed:', errorText);
            } else {
                console.log('🎵 [SpotifyPlayer] ✅ Play request successful!');
            }
        } catch (err) {
            console.error('🎵 [SpotifyPlayer] Spotify Play error:', err);
        }
    }, [deviceId, isReady]);

    return {
        player,
        deviceId,
        isReady,
        isPlaying,
        currentTrack,
        position,
        duration,
        volume,
        error,
        play,
        togglePlay: () => player?.togglePlay(),
        pause: () => player?.pause(),
        resume: () => player?.resume(),
        nextTrack: () => player?.nextTrack(),
        previousTrack: () => player?.previousTrack(),
        seek: (ms) => player?.seek(ms),
        setVolume: (v) => { if (player) { player.setVolume(v); setVolume(v); } },
    };
}

export default useSpotifyPlayer;
