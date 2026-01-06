/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MusicProvider } from './MusicContext';
import { RanTunesAuthProvider } from './RanTunesAuthContext';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        auth: {
            getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        }
    },
    supabaseConfigMissing: false
}));

// Mock Spotify Player
jest.mock('@/hooks/useSpotifyPlayer', () => ({
    useSpotifyPlayer: () => ({
        isReady: false,
        deviceId: null,
        isPlaying: false,
        currentTrack: null,
        play: jest.fn(),
        pause: jest.fn()
    })
}));

describe('MusicContext', () => {
    it('renders children and provides context', () => {
        const TestComponent = () => <div>Test Child</div>;

        render(
            <RanTunesAuthProvider>
                <MusicProvider>
                    <TestComponent />
                </MusicProvider>
            </RanTunesAuthProvider>
        );

        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    // More complex tests would go here to verify playSong, handleNext, etc.
    // In a real project, we would mock Audio and Spotify SDK more deeply.
});
