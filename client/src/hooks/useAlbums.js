/**
 * useAlbums Hook - RanTunes Standalone Version
 * Uses only Supabase - no local backend server required
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRanTunesAuth } from '@/context/RanTunesAuthContext';

export const useAlbums = () => {
    const { user: currentUser } = useRanTunesAuth();
    const [artists, setArtists] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [songs, setSongs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // For RanTunes standalone, we don't use local drive - always use Supabase/Spotify
    const [isMusicDriveConnected, setIsMusicDriveConnected] = useState(false);

    // Fetch albums from Supabase
    const fetchAlbums = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('rantunes_albums')
                .select(`
                    *,
                    artist:rantunes_artists(id, name)
                `)
                .order('name');

            if (error) throw error;
            setAlbums(data || []);
            return data || [];
        } catch (err) {
            console.error('Error fetching albums:', err);
            setError(err.message);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch artists from Supabase
    const fetchArtists = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('rantunes_artists')
                .select('*')
                .order('name');

            if (error) throw error;
            setArtists(data || []);
            return data || [];
        } catch (err) {
            console.error('Error fetching artists:', err);
            return [];
        }
    }, []);

    // Fetch playlists from Supabase
    const fetchPlaylists = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('rantunes_playlists')
                .select('*')
                .order('name');

            if (error) throw error;
            setPlaylists(data || []);
            return data || [];
        } catch (err) {
            console.error('Error fetching playlists:', err);
            return [];
        }
    }, []);

    // Fetch songs for a specific album
    const fetchAlbumSongs = useCallback(async (albumId) => {
        try {
            const { data, error } = await supabase
                .from('rantunes_songs')
                .select(`
                    *,
                    album:rantunes_albums(id, name, cover_url),
                    artist:rantunes_artists(id, name)
                `)
                .eq('album_id', albumId)
                .order('track_number');

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching album songs:', err);
            return [];
        }
    }, []);

    // Fetch songs for a playlist
    const fetchPlaylistSongs = useCallback(async (playlistId) => {
        try {
            const { data, error } = await supabase
                .from('rantunes_playlist_songs')
                .select(`
                    *,
                    song:rantunes_songs(
                        *,
                        album:rantunes_albums(id, name, cover_url),
                        artist:rantunes_artists(id, name)
                    )
                `)
                .eq('playlist_id', playlistId)
                .order('position');

            if (error) throw error;
            return (data || []).map(ps => ps.song).filter(Boolean);
        } catch (err) {
            console.error('Error fetching playlist songs:', err);
            return [];
        }
    }, []);

    // Fetch favorites (songs rated 5)
    const fetchFavoritesSongs = useCallback(async () => {
        if (!currentUser?.id) return [];
        try {
            const { data, error } = await supabase
                .from('rantunes_ratings')
                .select(`
                    *,
                    song:rantunes_songs(
                        *,
                        album:rantunes_albums(id, name, cover_url),
                        artist:rantunes_artists(id, name)
                    )
                `)
                .eq('user_id', currentUser.id)
                .eq('rating', 5);

            if (error) throw error;
            return (data || []).map(r => ({ ...r.song, myRating: r.rating })).filter(s => s?.id);
        } catch (err) {
            console.error('Error fetching favorites:', err);
            return [];
        }
    }, [currentUser?.id]);

    // Add Spotify Album to library
    const addSpotifyAlbum = useCallback(async (spotifyAlbum) => {
        try {
            setIsLoading(true);
            const businessId = currentUser?.business_id || null;

            // 1. Ensure artist exists (or get existing)
            const artistName = spotifyAlbum.artists?.[0]?.name || 'אמן לא ידוע';

            // First try to find existing artist (handle NULL business_id properly)
            let artistData;
            let artistQuery = supabase
                .from('rantunes_artists')
                .select('*')
                .eq('name', artistName);

            // Handle NULL business_id - use .is() for NULL comparisons
            if (businessId) {
                artistQuery = artistQuery.eq('business_id', businessId);
            } else {
                artistQuery = artistQuery.is('business_id', null);
            }

            const { data: existingArtist } = await artistQuery.maybeSingle();

            if (existingArtist) {
                artistData = existingArtist;
            } else {
                // Create new artist
                const { data: newArtist, error: artistError } = await supabase
                    .from('rantunes_artists')
                    .insert({
                        name: artistName,
                        business_id: businessId
                    })
                    .select()
                    .single();

                if (artistError) throw artistError;
                artistData = newArtist;
            }


            // 2. Create or update album record (use folder_path as unique constraint)
            const spotifyFolderPath = `spotify:album:${spotifyAlbum.id}`;

            // Check if album already exists
            const { data: existingAlbum } = await supabase
                .from('rantunes_albums')
                .select('*')
                .eq('folder_path', spotifyFolderPath)
                .maybeSingle();

            let albumData;
            if (existingAlbum) {
                albumData = existingAlbum;
            } else {
                const { data: newAlbum, error: albumError } = await supabase
                    .from('rantunes_albums')
                    .insert({
                        name: spotifyAlbum.name,
                        artist_id: artistData.id,
                        cover_url: spotifyAlbum.images?.[0]?.url || null,
                        folder_path: spotifyFolderPath,
                        business_id: businessId
                    })
                    .select()
                    .single();

                if (albumError) throw albumError;
                albumData = newAlbum;
            }

            // 3. Fetch and save album tracks from Spotify
            try {
                const { getAlbumTracks } = await import('@/lib/spotifyService');
                const tracksResponse = await getAlbumTracks(spotifyAlbum.id);
                const tracks = tracksResponse?.items || [];

                if (tracks.length > 0) {
                    // Insert songs one by one to handle duplicates gracefully
                    let addedCount = 0;
                    for (const track of tracks) {
                        const songData = {
                            title: track.name,
                            album_id: albumData.id,
                            artist_id: artistData.id,
                            track_number: track.track_number || (tracks.indexOf(track) + 1),
                            duration_seconds: Math.round((track.duration_ms || 0) / 1000),
                            file_path: track.uri, // spotify:track:xxx
                            file_name: track.name,
                            business_id: businessId
                        };

                        // Check if song already exists
                        let existsQuery = supabase
                            .from('rantunes_songs')
                            .select('id')
                            .eq('file_path', track.uri);

                        if (businessId) {
                            existsQuery = existsQuery.eq('business_id', businessId);
                        } else {
                            existsQuery = existsQuery.is('business_id', null);
                        }

                        const { data: existingSong } = await existsQuery.maybeSingle();

                        if (!existingSong) {
                            const { error: songError } = await supabase
                                .from('rantunes_songs')
                                .insert(songData);

                            if (!songError) addedCount++;
                        }
                    }

                    console.log(`✅ Added ${addedCount} tracks for album: ${spotifyAlbum.name}`);
                }
            } catch (trackError) {
                console.error('Error fetching/saving tracks:', trackError);
                // Don't throw - album was still created successfully
            }

            await fetchAlbums();
            return albumData;
        } catch (err) {
            console.error('Error adding Spotify album:', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, fetchAlbums]);

    // Remove Spotify Album
    const removeSpotifyAlbum = useCallback(async (spotifyAlbumId) => {
        try {
            setIsLoading(true);
            const { error } = await supabase
                .from('rantunes_albums')
                .delete()
                .match({ folder_path: `spotify:album:${spotifyAlbumId}` });

            if (error) throw error;
            await fetchAlbums();
            return true;
        } catch (err) {
            console.error('Error removing Spotify album:', err);
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [fetchAlbums]);

    // Add Spotify Playlist to library
    const addSpotifyPlaylist = useCallback(async (spotifyPlaylist, tracks = []) => {
        try {
            setIsLoading(true);
            const userId = currentUser?.id;
            if (!userId) throw new Error('User not authenticated');

            console.log('➕ Adding Spotify playlist:', spotifyPlaylist.name);

            // Create playlist record
            const { data: playlistData, error: playlistError } = await supabase
                .from('rantunes_playlists')
                .insert({
                    user_id: userId,
                    name: spotifyPlaylist.name,
                    description: spotifyPlaylist.description || null,
                    cover_url: spotifyPlaylist.images?.[0]?.url || null,
                    is_public: false
                })
                .select()
                .single();

            if (playlistError) throw playlistError;

            // Add tracks to playlist
            if (tracks.length > 0) {
                const businessId = currentUser?.business_id || null;

                // First, ensure all songs exist in rantunes_songs
                for (let i = 0; i < tracks.length; i++) {
                    const track = tracks[i];
                    if (!track?.uri) continue;

                    // Get or create artist
                    const artistName = track.artists?.[0]?.name || 'אמן לא ידוע';
                    let artistQuery = supabase
                        .from('rantunes_artists')
                        .select('id')
                        .eq('name', artistName);

                    if (businessId) {
                        artistQuery = artistQuery.eq('business_id', businessId);
                    } else {
                        artistQuery = artistQuery.is('business_id', null);
                    }

                    let { data: artistData } = await artistQuery.maybeSingle();

                    if (!artistData) {
                        const { data: newArtist } = await supabase
                            .from('rantunes_artists')
                            .insert({ name: artistName, business_id: businessId })
                            .select('id')
                            .single();
                        artistData = newArtist;
                    }

                    // Check if song already exists
                    let songQuery = supabase
                        .from('rantunes_songs')
                        .select('id')
                        .eq('file_path', track.uri);

                    if (businessId) {
                        songQuery = songQuery.eq('business_id', businessId);
                    } else {
                        songQuery = songQuery.is('business_id', null);
                    }

                    let { data: songData } = await songQuery.maybeSingle();

                    if (!songData) {
                        // Create song
                        const { data: newSong } = await supabase
                            .from('rantunes_songs')
                            .insert({
                                title: track.name,
                                artist_id: artistData?.id,
                                track_number: i + 1,
                                duration_seconds: Math.round((track.duration_ms || 0) / 1000),
                                file_path: track.uri,
                                file_name: track.name,
                                business_id: businessId
                            })
                            .select('id')
                            .single();
                        songData = newSong;
                    }

                    // Add song to playlist
                    if (songData?.id) {
                        await supabase
                            .from('rantunes_playlist_songs')
                            .insert({
                                playlist_id: playlistData.id,
                                song_id: songData.id,
                                song_title: track.name,
                                song_artist: artistName,
                                song_cover_url: track.album?.images?.[0]?.url || null,
                                position: i + 1
                            });
                    }
                }

                console.log(`✅ Added ${tracks.length} tracks to playlist: ${spotifyPlaylist.name}`);
            }

            await fetchPlaylists();
            return playlistData;
        } catch (err) {
            console.error('Error adding Spotify playlist:', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, fetchPlaylists]);

    // Add song to playlist
    const addSongToPlaylist = useCallback(async (playlistId, songId) => {
        try {
            const { data: existing } = await supabase
                .from('rantunes_playlist_songs')
                .select('position')
                .eq('playlist_id', playlistId)
                .order('position', { ascending: false })
                .limit(1);

            const nextPosition = (existing?.[0]?.position || 0) + 1;

            const { error } = await supabase
                .from('rantunes_playlist_songs')
                .insert({
                    playlist_id: playlistId,
                    song_id: songId,
                    position: nextPosition
                });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error adding song to playlist:', err);
            return false;
        }
    }, []);

    // Remove song from playlist
    const removePlaylistSong = useCallback(async (playlistId, songId) => {
        try {
            const { error } = await supabase
                .from('rantunes_playlist_songs')
                .delete()
                .match({ playlist_id: playlistId, song_id: songId });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error removing song from playlist:', err);
            return false;
        }
    }, []);

    // Delete playlist
    const deletePlaylist = useCallback(async (playlistId) => {
        try {
            const { error } = await supabase
                .from('rantunes_playlists')
                .delete()
                .eq('id', playlistId);

            if (error) throw error;
            await fetchPlaylists();
            return true;
        } catch (err) {
            console.error('Error deleting playlist:', err);
            return false;
        }
    }, [fetchPlaylists]);

    // Generate smart playlist (stub - returns top rated songs)
    const generateSmartPlaylist = useCallback(async (name, options = {}) => {
        if (!currentUser?.id) return null;
        try {
            // Get top rated songs
            const { data: ratings, error } = await supabase
                .from('rantunes_ratings')
                .select(`
                    song_id,
                    rating,
                    song:rantunes_songs(
                        *,
                        album:rantunes_albums(id, name, cover_url),
                        artist:rantunes_artists(id, name)
                    )
                `)
                .eq('user_id', currentUser.id)
                .gte('rating', 4)
                .order('rating', { ascending: false })
                .limit(options.limit || 20);

            if (error) throw error;
            return (ratings || []).map(r => r.song).filter(Boolean);
        } catch (err) {
            console.error('Error generating smart playlist:', err);
            return [];
        }
    }, [currentUser?.id]);

    // Refresh all data
    const refreshAll = useCallback(async () => {
        setIsLoading(true);
        const albumsResult = await fetchAlbums();
        await Promise.all([
            fetchArtists(),
            fetchPlaylists()
        ]);
        // Consider connected if we have any albums
        setIsMusicDriveConnected(albumsResult.length > 0);
        setIsLoading(false);
    }, [fetchAlbums, fetchArtists, fetchPlaylists]);

    // Check music drive - for RanTunes, we consider "connected" if we have albums from Supabase
    const checkMusicDriveConnection = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('rantunes_albums')
                .select('id')
                .limit(1);

            const connected = !error && data !== null;
            setIsMusicDriveConnected(connected);
            return connected;
        } catch {
            setIsMusicDriveConnected(false);
            return false;
        }
    }, []);

    // Scan music directory - stub for RanTunes (not needed)
    const scanMusicDirectory = useCallback(async () => {
        console.log('RanTunes: Local scanning not supported, use Spotify instead');
        return { albums: [], artists: [], songs: [] };
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        refreshAll();
    }, []);

    return {
        artists,
        albums,
        playlists,
        songs,
        isLoading,
        error,
        isMusicDriveConnected,
        checkMusicDriveConnection,
        refreshAll,
        fetchAlbums,
        fetchArtists,
        fetchPlaylists,
        fetchAlbumSongs,
        fetchPlaylistSongs,
        fetchFavoritesSongs,
        addSpotifyAlbum,
        removeSpotifyAlbum,
        addSpotifyPlaylist,
        addSongToPlaylist,
        removePlaylistSong,
        deletePlaylist,
        generateSmartPlaylist,
        scanMusicDirectory
    };
};

export default useAlbums;
