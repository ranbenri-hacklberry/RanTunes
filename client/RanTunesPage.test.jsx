
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MusicPage from './src/pages/index.jsx';

/**
 * RanTunes Music Page - Integrated Logic Test
 * 
 * Note: Heavy libraries (lucide, framer-motion) and components are 
 * globally stubbed in vitest.config.js and setup.jsx for maximum performance.
 */

// 1. Mock Contexts & Hooks
const mockAuth = {
    user: { id: 'test-user', name: 'Test User', business_id: 'test-biz', status: 'approved' },
    isLoading: false,
    isAuthenticated: true,
    isAdmin: true
};

vi.mock('@/context/RanTunesAuthContext', () => ({
    useRanTunesAuth: () => mockAuth,
    RanTunesAuthProvider: ({ children }) => <div>{children}</div>
}));

const mockMusic = {
    currentSong: null,
    isPlaying: false,
    togglePlay: vi.fn(),
    handleNext: vi.fn(),
    handlePrevious: vi.fn(),
    seek: vi.fn(),
    volume: 0.7,
    setVolume: vi.fn(),
    playlist: [],
    playlistIndex: 0,
    shuffle: false,
    setShuffle: vi.fn(),
    repeat: 'none',
    setRepeat: vi.fn(),
    isLoading: false,
    playbackError: null,
    toast: null,
    clearError: vi.fn(),
    transitionPhase: 'idle',
    rateSong: vi.fn(),
    fetchSpotifyDevices: vi.fn(),
    spotifyDevices: [],
    transferPlayback: vi.fn()
};

vi.mock('@/context/MusicContext', () => ({
    useMusic: () => mockMusic,
    MusicProvider: ({ children }) => <div>{children}</div>
}));

// Stable mock functions to prevent render loops in hooks
const mockFetchAlbumSongs = vi.fn().mockResolvedValue([
    { id: 's1', title: 'Song 1', artist: { name: 'Test Artist' }, duration_seconds: 180 }
]);
const mockFetchPlaylists = vi.fn();
const mockFetchFavoritesSongs = vi.fn().mockResolvedValue([]);
const mockRefreshAll = vi.fn();

vi.mock('@/hooks/useAlbums', () => ({
    useAlbums: () => ({
        albums: [
            { id: 'a1', name: 'Test Album', artist: { name: 'Test Artist' }, cover_url: 'http://test.com/cover.jpg' }
        ],
        artists: [],
        playlists: [
            { id: 'p1', name: 'My Playlist' }
        ],
        isLoading: false,
        error: null,
        isMusicDriveConnected: true,
        refreshAll: mockRefreshAll,
        fetchPlaylists: mockFetchPlaylists,
        fetchFavoritesSongs: mockFetchFavoritesSongs,
        fetchAlbumSongs: mockFetchAlbumSongs,
        deletePlaylist: vi.fn(),
        addSpotifyAlbum: vi.fn(),
        removeSpotifyAlbum: vi.fn(),
        addSpotifyPlaylist: vi.fn(),
        scanMusicDirectory: vi.fn(),
        checkMusicDriveConnection: vi.fn().mockResolvedValue(true)
    })
}));

describe('RanTunes Music Page', () => {
    it('renders the main layout and default albums tab', async () => {
        render(
            <MemoryRouter>
                <MusicPage />
            </MemoryRouter>
        );

        // Header and basic elements
        expect(await screen.findByText('RanTunes')).toBeInTheDocument();
        expect(screen.getByText(/Pro Studio/i)).toBeInTheDocument();

        // Check for mocked data (Atomic Aliasing ensures this is fast)
        expect(screen.getByText('Test Album')).toBeInTheDocument();
        expect(screen.getByText('אלבומים')).toBeInTheDocument();
    });

    it('switches to playlists tab correctly', async () => {
        render(
            <MemoryRouter>
                <MusicPage />
            </MemoryRouter>
        );

        const playlistsTab = await screen.findByText('פלייליסטים');
        fireEvent.click(playlistsTab);

        // Should show playlist content from mock
        expect(await screen.findByText('My Playlist')).toBeInTheDocument();
        expect(screen.getByText('ייבוא מ-Spotify')).toBeInTheDocument();
    });

    it('opens album details when an album is clicked', async () => {
        render(
            <MemoryRouter>
                <MusicPage />
            </MemoryRouter>
        );

        const album = await screen.findByText('Test Album');
        fireEvent.click(album);

        // Should render Song metadata (provided by useAlbums mock)
        // In the stubbed version, components that map songs should render names
        expect(await screen.findByText('Song 1')).toBeInTheDocument();
    });
});
