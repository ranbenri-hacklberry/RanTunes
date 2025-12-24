import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const MUSIC_API_URL = import.meta.env.VITE_MUSIC_API_URL ||
    import.meta.env.VITE_MANAGER_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8080';

export const useRatings = () => {
    const { currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Fetch songs with high ratings, optionally filtered by artist
     */
    const getTopRatedSongs = useCallback(async (options = {}) => {
        const { minRating = 3.5, artistIds = null, limit = 50 } = options;

        try {
            console.log('🎵 getTopRatedSongs fetching...', { minRating, artistIds, limit });

            const res = await fetch(`${MUSIC_API_URL}/music/library/top-rated`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    minRating,
                    artistIds,
                    limit,
                    employeeId: currentUser?.id,
                    businessId: currentUser?.business_id
                })
            });

            const json = await res.json();
            if (!res.ok || !json?.success) {
                console.error('Failed to fetch top rated songs:', json?.message);
                return [];
            }

            return json.songs || [];
        } catch (error) {
            console.error('Error in getTopRatedSongs:', error);
            return [];
        }
    }, [currentUser]);

    const rateSong = useCallback(async (songId, rating) => {
        if (!currentUser || !songId) return false;

        try {
            const response = await fetch(`${MUSIC_API_URL}/music/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    songId,
                    employeeId: currentUser.id,
                    businessId: currentUser.business_id || null,
                    rating
                })
            });

            const result = await response.json().catch(() => ({}));
            return response.ok && result?.success;
        } catch (error) {
            console.error('Error rating song:', error);
            return false;
        }
    }, [currentUser]);

    return {
        rateSong,
        getTopRatedSongs,
        isLoading
    };
};

export default useRatings;
