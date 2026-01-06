import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Log status (but don't throw - let the app load)
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🚨 WARNING: Supabase Environment Variables are missing!');
    console.error('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Project Settings.');
}

// Create client even with empty strings - will just fail on actual API calls
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

/**
 * Returns a Supabase client scoped to the appropriate schema based on the user.
 * @param {object} user - The current logged-in user
 * @returns {object} - Supabase client with .schema() applied if needed
 */
export const getSupabase = (user) => {
    return supabase;
};