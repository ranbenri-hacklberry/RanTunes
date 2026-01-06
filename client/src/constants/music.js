/**
 * Music Application Constants
 */

export const MUSIC_API_URL = import.meta.env.VITE_MUSIC_API_URL ||
    import.meta.env.VITE_MANAGER_API_URL?.replace(/\/$/, '') ||
    'http://localhost:8080';

export const SKIP_THRESHOLD = 0.3; // 30% of song played counts as skip

export const REPEAT_MODES = {
    NONE: 'none',
    ONE: 'one',
    ALL: 'all'
};

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
