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
            try {
                console.log('🎵 [SpotifyPlayer] SDK Ready callback triggered!');
                const token = await getAccessToken();
                console.log('🎵 [SpotifyPlayer] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'NULL');

                if (!token) {
                    console.warn('🎵 [SpotifyPlayer] No Spotify token available - Player will not initialize.');
                    setError('No Spotify token available');
                    setPlayer(null);
                    return;
                }

                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
                const deviceName = isMobile ? 'RanTunes Mobile' : 'RanTunes Desktop';

                const spotifyPlayer = new window.Spotify.Player({
                    name: deviceName,
                    getOAuthToken: async cb => {
                        try {
                            const freshToken = await getAccessToken();
                            if (freshToken) cb(freshToken);
                        } catch (e) {
                            console.error('Error refreshing token:', e);
                        }
                    },
                    volume: volume,
                });

                // Error handling
                spotifyPlayer.addListener('initialization_error', ({ message }) => {
                    console.warn('🎵 [SpotifyPlayer] INITIALIZATION ERROR:', message);
                    setError(message);
                });

                spotifyPlayer.addListener('authentication_error', ({ message }) => {
                    console.warn('🎵 [SpotifyPlayer] AUTHENTICATION ERROR:', message);
                    setError(message);
                });

                spotifyPlayer.addListener('account_error', ({ message }) => {
                    console.warn('🎵 [SpotifyPlayer] ACCOUNT ERROR:', message);
                    setError('Premium account required for playback');
                });

                spotifyPlayer.addListener('playback_error', ({ message }) => {
                    console.warn('🎵 [SpotifyPlayer] PLAYBACK ERROR:', message);
                });

                // Playback status updates
                spotifyPlayer.addListener('player_state_changed', state => {
                    if (!state) {
                        isActiveDevice.current = false;
                        return;
                    }

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

                    spotifyPlayer.setVolume(0.8).catch(() => { });
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
                    console.warn('🎵 [SpotifyPlayer] ❌ Failed to connect to Spotify!');
                }
            } catch (err) {
                console.error('🎵 [SpotifyPlayer] CRITICAL ERROR during initialization:', err);
                setError('Failed to initialize Spotify Player');
                setPlayer(null);
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

    // Play a specific track (optionally with a queue of tracks for continuous playback)
    const play = useCallback(async (spotifyUri, positionMs = 0, allUris = null, targetId = null) => {
        const finalDeviceId = targetId || deviceId;

        console.log('🎵 [SpotifyPlayer] play() called with URI:', spotifyUri);
        console.log('🎵 [SpotifyPlayer] Queue size:', allUris?.length || 1);
        console.log('🎵 [SpotifyPlayer] Target deviceId:', finalDeviceId);

        if (!finalDeviceId) {
            console.error('🎵 [SpotifyPlayer] ERROR: No device ID available!');
            setError('No device available');
            return;
        }

        const token = await getAccessToken();
        if (!token) {
            console.error('🎵 [SpotifyPlayer] ERROR: No token for playback!');
            return;
        }

        try {
            // Transfer logic ONLY if we are playing on the local player and it's not active
            if (finalDeviceId === deviceId) {
                const isActive = await checkIsActive();
                if (!isActive) {
                    console.log('🎵 [SpotifyPlayer] Local device not active, transferring playback...');
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
                    if (!transferResponse.ok) console.warn('Transfer failed');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            // ... Prepare body ...
            let body;
            if (allUris && allUris.length > 1) {
                const offset = allUris.indexOf(spotifyUri);
                body = {
                    uris: allUris,
                    offset: { position: offset >= 0 ? offset : 0 },
                    position_ms: positionMs
                };
            } else {
                body = { uris: [spotifyUri], position_ms: positionMs };
            }

            const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${finalDeviceId}`, {
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
