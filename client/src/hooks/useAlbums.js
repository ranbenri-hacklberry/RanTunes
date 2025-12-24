/**
 * useAlbums Hook - RanTunes Standalone Version
 * Uses only Supabase - no local backend server required
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export const useAlbums = () => {
    const { currentUser } = useAuth();
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
                .eq('employee_id', currentUser.id)
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

            // 1. Ensure artist exists
            const artistName = spotifyAlbum.artists?.[0]?.name || 'אמן לא ידוע';
            const { data: artistData, error: artistError } = await supabase
                .from('rantunes_artists')
                .upsert({
                    name: artistName,
                    business_id: businessId,
                    folder_path: `spotify:artist:${spotifyAlbum.artists?.[0]?.id}`
                }, { onConflict: 'name, business_id' })
                .select()
                .single();

            if (artistError) throw artistError;

            // 2. Create album record
            const { data: albumData, error: albumError } = await supabase
                .from('rantunes_albums')
                .upsert({
                    name: spotifyAlbum.name,
                    artist_id: artistData.id,
                    cover_url: spotifyAlbum.images?.[0]?.url || null,
                    folder_path: `spotify:album:${spotifyAlbum.id}`,
                    business_id: businessId
                }, { onConflict: 'name, artist_id' })
                .select()
                .single();

            if (albumError) throw albumError;

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
                .eq('employee_id', currentUser.id)
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
        await Promise.all([
            fetchAlbums(),
            fetchArtists(),
            fetchPlaylists()
        ]);
        setIsLoading(false);
    }, [fetchAlbums, fetchArtists, fetchPlaylists]);

    // Check music drive - for RanTunes standalone, always return false (we use Spotify)
    const checkMusicDriveConnection = useCallback(async () => {
        // RanTunes doesn't use local drive
        setIsMusicDriveConnected(false);
        return false;
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
        addSongToPlaylist,
        removePlaylistSong,
        deletePlaylist,
        generateSmartPlaylist,
        scanMusicDirectory
    };
};

export default useAlbums;
