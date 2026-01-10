
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// 1. Mock LocalStorage and SessionStorage
const localStorageMock = {
    getItem: vi.fn((key) => {
        if (key === 'music_source') return 'local';
        if (key === 'rantunes_user') return JSON.stringify({ id: 'mock-user', name: 'Mock User', status: 'approved' });
        if (key === 'spotify_access_token') return 'mock_token';
        return null;
    }),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn()
};
global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock;

// 2. Mock Browser APIs
global.Audio = class {
    constructor() {
        this.src = '';
        this.volume = 1;
        this.currentTime = 0;
        this.crossOrigin = '';
    }
    play() { return Promise.resolve(); }
    pause() { }
    load() { }
    addEventListener() { }
    removeEventListener() { }
};

global.AudioContext = vi.fn().mockImplementation(() => ({
    createAnalyser: () => ({ fftSize: 0, frequencyBinCount: 0, getByteFrequencyData: () => { } }),
    createMediaElementSource: () => ({ connect: () => { } }),
    destination: {},
    resume: () => Promise.resolve(),
    state: 'running',
}));
global.webkitAudioContext = global.AudioContext;

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

global.window.scrollTo = vi.fn();
global.window.alert = vi.fn();
global.window.confirm = vi.fn(() => true);

// Mock Spotify SDK
global.Spotify = {
    Player: vi.fn().mockImplementation(() => ({
        connect: vi.fn().mockResolvedValue(true),
        disconnect: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        getCurrentState: vi.fn().mockResolvedValue(null),
        setVolume: vi.fn().mockResolvedValue(true),
        pause: vi.fn().mockResolvedValue(true),
        resume: vi.fn().mockResolvedValue(true),
        nextTrack: vi.fn().mockResolvedValue(true),
        previousTrack: vi.fn().mockResolvedValue(true),
        seek: vi.fn().mockResolvedValue(true),
    })),
};

// 3. CSS Mocks
vi.mock('@/styles/music.css', () => ({}));

// 4. Mock heavy services that might have side effects during import
vi.mock('@/lib/spotifyService', () => ({
    default: {
        isSpotifyLoggedIn: vi.fn().mockReturnValue(true),
        getAccessToken: vi.fn().mockResolvedValue('mock_token'),
        getPlaybackState: vi.fn().mockResolvedValue(null),
        transferPlayback: vi.fn().mockResolvedValue(true),
        getDevices: vi.fn().mockResolvedValue([]),
    },
    loginWithSpotify: vi.fn(),
    handleSpotifyCallback: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('mock_token'),
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            match: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
        })),
    }
}));

// Added Surgical Mock for the user suspect
vi.mock('@/components/PlaylistBuilder', () => ({
    default: (props) => React.createElement('div', { 'data-testid': 'mock-playlist-builder' }, 'PlaylistBuilder Mock'),
    __esModule: true,
}));
