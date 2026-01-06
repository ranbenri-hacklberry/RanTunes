import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

/**
 * Track if Supabase configuration is missing.
 * UI should check this and show appropriate error screen.
 * @type {boolean}
 */
export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;

// Create client only if properly configured
// If config is missing, create a mock that prevents accidental API calls
export const supabase = supabaseConfigMissing
    ? createMockSupabaseClient()
    : createClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates a mock Supabase client that returns errors on any operation.
 * This prevents accidental API calls when config is missing.
 */
function createMockSupabaseClient() {
    const errorMsg = 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    const mockError = { error: { message: errorMsg, code: 'CONFIG_MISSING' } };

    return {
        from: () => ({
            select: () => Promise.resolve({ data: null, ...mockError }),
            insert: () => Promise.resolve({ data: null, ...mockError }),
            update: () => Promise.resolve({ data: null, ...mockError }),
            upsert: () => Promise.resolve({ data: null, ...mockError }),
            delete: () => Promise.resolve({ data: null, ...mockError }),
        }),
        rpc: () => Promise.resolve({ data: null, ...mockError }),
        channel: () => ({ on: () => ({ subscribe: () => { } }) }),
        removeChannel: () => { },
        auth: {
            getSession: () => Promise.resolve({ data: null, ...mockError }),
            signIn: () => Promise.resolve({ data: null, ...mockError }),
            signOut: () => Promise.resolve({ ...mockError }),
        }
    };
}

/**
 * Returns the Supabase client instance.
 * @param {object} user - The current logged-in user (unused, kept for compatibility)
 * @returns {object} - Supabase client
 */
export const getSupabase = (user) => supabase;