import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const RanTunesAuthContext = createContext(null);

export const RanTunesAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const storedUser = localStorage.getItem('rantunes_user');
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    // Verify user still exists and is approved
                    const { data, error } = await supabase
                        .from('rantunes_users')
                        .select('*')
                        .eq('id', parsed.id)
                        .single();

                    if (data && data.status === 'approved') {
                        setUser(data);
                    } else {
                        localStorage.removeItem('rantunes_user');
                    }
                }
            } catch (err) {
                console.error('Session check error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    // Login with email and password
    const login = async (email, password) => {
        setError(null);
        setIsLoading(true);

        try {
            const { data, error } = await supabase
                .from('rantunes_users')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();

            if (error || !data) {
                throw new Error('משתמש לא נמצא');
            }

            // Simple password check (in production, use proper hashing!)
            if (data.password_hash !== password) {
                throw new Error('סיסמה שגויה');
            }

            if (data.status === 'pending') {
                throw new Error('החשבון שלך ממתין לאישור מנהל');
            }

            if (data.status === 'rejected') {
                throw new Error('החשבון שלך נדחה');
            }

            // Success - save to state and localStorage
            setUser(data);
            localStorage.setItem('rantunes_user', JSON.stringify(data));
            return { success: true, user: data };

        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Register new user (status = pending)
    const register = async ({ name, email, password }) => {
        setError(null);
        setIsLoading(true);

        try {
            // Check if email already exists
            const { data: existing } = await supabase
                .from('rantunes_users')
                .select('id')
                .eq('email', email.toLowerCase().trim())
                .single();

            if (existing) {
                throw new Error('כתובת האימייל כבר רשומה במערכת');
            }

            // Create new user with pending status
            const { data, error } = await supabase
                .from('rantunes_users')
                .insert({
                    name: name.trim(),
                    email: email.toLowerCase().trim(),
                    password_hash: password, // In production, hash this!
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                throw new Error('שגיאה ביצירת החשבון: ' + error.message);
            }

            return { success: true, message: 'החשבון נוצר בהצלחה וממתין לאישור מנהל' };

        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // Logout
    const logout = () => {
        setUser(null);
        localStorage.removeItem('rantunes_user');
    };

    return (
        <RanTunesAuthContext.Provider value={{
            user,
            isLoading,
            error,
            login,
            register,
            logout,
            isAuthenticated: !!user && user.status === 'approved'
        }}>
            {children}
        </RanTunesAuthContext.Provider>
    );
};

export const useRanTunesAuth = () => {
    const context = useContext(RanTunesAuthContext);
    if (!context) {
        throw new Error('useRanTunesAuth must be used within RanTunesAuthProvider');
    }
    return context;
};

export default RanTunesAuthContext;
