import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Track if env is missing - will be displayed as user-friendly error in UI
export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;

if (supabaseConfigMissing) {
    console.error('🚨 CRITICAL ERROR: Supabase Environment Variables are missing!');
    console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Project Settings.');
    console.error('URL:', supabaseUrl ? '✓' : '✗', 'Key:', supabaseAnonKey ? '✓' : '✗');
}

// Create a dummy client if config is missing to prevent crashes
export const supabase = supabaseConfigMissing
    ? {
        from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }) }),
        rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    }
    : createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns a Supabase client scoped to the appropriate schema based on the user.
 * @param {object} user - The current logged-in user
 * @returns {object} - Supabase client with .schema() applied if needed
 */
export const getSupabase = (user) => {
    // Legacy logic removed: We now use Single Schema (public) with Business ID filtering.
    // The previous logic attempted to switch to 'demo' schema, causing 406 errors.
    return supabase;
};