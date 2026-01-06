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
            // 1. Fetch playlist song records
            const { data: playlistItems, error: itemsError } = await supabase
                .from('rantunes_playlist_songs')
                .select('*')
                .eq('playlist_id', playlistId)
                .order('position');

            if (itemsError) throw itemsError;
            if (!playlistItems || playlistItems.length === 0) return [];

            // 2. Get unique song IDs to fetch from main songs table
            const songIds = [...new Set(playlistItems.map(ps => ps.song_id).filter(id => id && id.length > 5))];

            let songsMap = {};
            if (songIds.length > 0) {
                const uuids = songIds.filter(id => id.includes('-'));
                const uris = songIds.filter(id => id.startsWith('spotify:'));

                let query = supabase
                    .from('rantunes_songs')
                    .select('*, album:rantunes_albums(id, name, cover_url), artist:rantunes_artists(id, name)');

                if (uuids.length > 0 && uris.length > 0) {
                    query = query.or(`id.in.(${uuids.join(',')}),file_path.in.(${uris.map(u => `"${u}"`).join(',')})`);
                } else if (uuids.length > 0) {
                    query = query.in('id', uuids);
                } else if (uris.length > 0) {
                    query = query.in('file_path', uris);
                }

                const { data: mainSongs } = await query;

                (mainSongs || []).forEach(s => {
                    songsMap[s.id] = s;
                    songsMap[s.file_path] = s;
                });
            }

            // 3. Combine data
            return playlistItems.map(ps => {
                const mainSong = songsMap[ps.song_id];
                if (mainSong) return { ...mainSong, myRating: ps.rating };

                // Fallback to metadata stored in playlist_songs
                return {
                    id: ps.song_id,
                    title: ps.song_title || 'Unknown Title',
                    file_path: ps.song_id,
                    artist: { name: ps.song_artist || 'Unknown Artist' },
                    album: { name: '', cover_url: ps.song_cover_url },
                    duration_seconds: 0
                };
            });
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

            console.log('➕ Adding Spotify playlist:', spotifyPlaylist.name, 'with', tracks.length, 'tracks');

            const businessId = currentUser?.business_id || null;

            // 1. Create playlist record
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

            // 2. Add tracks to playlist
            if (tracks.length > 0) {
                // Collect all unique artists
                const artistNames = [...new Set(tracks.map(t => t.artists?.[0]?.name || 'Unknown'))];

                // Fetch existing artists
                let { data: existingArtists } = await supabase
                    .from('rantunes_artists')
                    .select('id, name')
                    .in('name', artistNames)
                    .filter('business_id', businessId ? 'eq' : 'is', businessId || null);

                const artistMap = {};
                (existingArtists || []).forEach(a => artistMap[a.name] = a.id);

                // Create missing artists
                const missingArtistNames = artistNames.filter(name => !artistMap[name]);
                if (missingArtistNames.length > 0) {
                    const { data: newArtists } = await supabase
                        .from('rantunes_artists')
                        .insert(missingArtistNames.map(name => ({ name, business_id: businessId })))
                        .select('id, name');

                    (newArtists || []).forEach(a => artistMap[a.name] = a.id);
                }

                // Collect all unique tracks by URI
                const trackUris = [...new Set(tracks.map(t => t.uri))];

                // Fetch existing songs
                let { data: existingSongs } = await supabase
                    .from('rantunes_songs')
                    .select('id, file_path')
                    .in('file_path', trackUris)
                    .filter('business_id', businessId ? 'eq' : 'is', businessId || null);

                const songMap = {};
                (existingSongs || []).forEach(s => songMap[s.file_path] = s.id);

                // Create missing songs
                const missingTracks = tracks.filter(t => !songMap[t.uri]);
                // We need to deduplicate missingTracks by uri before insert
                const uniqueMissingTracks = [];
                const seenUris = new Set();
                for (const t of missingTracks) {
                    if (!seenUris.has(t.uri)) {
                        uniqueMissingTracks.push(t);
                        seenUris.add(t.uri);
                    }
                }

                if (uniqueMissingTracks.length > 0) {
                    // Split into chunks of 50 to avoid payload limits if needed
                    const { data: newSongs } = await supabase
                        .from('rantunes_songs')
                        .insert(uniqueMissingTracks.map((t, idx) => ({
                            title: t.name,
                            artist_id: artistMap[t.artists?.[0]?.name || 'Unknown'],
                            track_number: 1, // We don't have true album track numbers here easily
                            duration_seconds: Math.round((t.duration_ms || 0) / 1000),
                            file_path: t.uri,
                            file_name: t.name,
                            business_id: businessId
                        })))
                        .select('id, file_path');

                    (newSongs || []).forEach(s => songMap[s.file_path] = s.id);
                }

                // 3. Batch insert into rantunes_playlist_songs
                const playlistSongsToInsert = tracks.map((t, index) => ({
                    playlist_id: playlistData.id,
                    song_id: songMap[t.uri] || t.uri, // Fallback to URI if somehow missed
                    song_title: t.name,
                    song_artist: t.artists?.[0]?.name || 'Unknown',
                    song_cover_url: t.album?.images?.[0]?.url || null,
                    position: index + 1
                }));

                const { error: batchError } = await supabase
                    .from('rantunes_playlist_songs')
                    .insert(playlistSongsToInsert);

                if (batchError) throw batchError;

                console.log(`✅ Success! Added ${tracks.length} tracks to playlist: ${spotifyPlaylist.name}`);
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
