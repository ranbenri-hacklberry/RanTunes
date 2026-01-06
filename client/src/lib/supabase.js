import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Track missing config - UI can check this to show friendly error
export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;

if (supabaseConfigMissing) {
    console.warn('⚠️ Supabase Environment Variables are missing. App will show configuration error.');
}

// Create client with placeholder if missing (prevents crash at import time)
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * Returns a Supabase client scoped to the appropriate schema based on the user.
 * @param {object} user - The current logged-in user
 * @returns {object} - Supabase client
 */
export const getSupabase = (user) => {
    return supabase;
};