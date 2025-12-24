import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Mail, Lock, User, Loader2, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useRanTunesAuth } from '@/context/RanTunesAuthContext';
import '@/styles/music.css';

const AuthScreen = () => {
    const { login, register, isLoading, error } = useRanTunesAuth();
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [localError, setLocalError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setLocalError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!formData.email || !formData.password) {
            setLocalError('נא למלא את כל השדות');
            return;
        }

        const result = await login(formData.email, formData.password);
        if (!result.success) {
            setLocalError(result.error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLocalError('');
        setSuccessMessage('');

        if (!formData.name || !formData.email || !formData.password) {
            setLocalError('נא למלא את כל השדות');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setLocalError('הסיסמאות אינן תואמות');
            return;
        }

        if (formData.password.length < 6) {
            setLocalError('הסיסמה חייבת להכיל לפחות 6 תווים');
            return;
        }

        const result = await register({
            name: formData.name,
            email: formData.email,
            password: formData.password
        });

        if (result.success) {
            setSuccessMessage(result.message);
            setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        } else {
            setLocalError(result.error);
        }
    };

    return (
        <div className="min-h-screen music-gradient-dark flex flex-col items-center justify-center p-6" dir="rtl">
            {/* Logo/Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-8"
            >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full music-gradient-purple flex items-center justify-center shadow-xl">
                    <Music className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-white text-3xl font-black">RanTunes</h1>
                <p className="text-white/50 mt-2">נגן המוזיקה האישי שלך</p>
            </motion.div>

            {/* Auth Card */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="w-full max-w-md music-glass rounded-3xl p-8 border border-white/10"
            >
                {/* Tab Switcher */}
                <div className="flex mb-8 bg-white/5 rounded-2xl p-1">
                    <button
                        onClick={() => { setMode('login'); setLocalError(''); setSuccessMessage(''); }}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'login'
                                ? 'music-gradient-purple text-white shadow-lg'
                                : 'text-white/50 hover:text-white'
                            }`}
                    >
                        התחברות
                    </button>
                    <button
                        onClick={() => { setMode('register'); setLocalError(''); setSuccessMessage(''); }}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'register'
                                ? 'music-gradient-purple text-white shadow-lg'
                                : 'text-white/50 hover:text-white'
                            }`}
                    >
                        הרשמה
                    </button>
                </div>

                {/* Success Message */}
                <AnimatePresence>
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-start gap-3"
                        >
                            <Clock className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-green-400 font-bold">נרשמת בהצלחה!</p>
                                <p className="text-green-400/70 text-sm">{successMessage}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                    {(localError || error) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 text-center"
                        >
                            {localError || error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Login Form */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="email"
                                name="email"
                                placeholder="אימייל"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="password"
                                name="password"
                                placeholder="סיסמה"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 music-gradient-purple text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>התחבר</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Register Form */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="relative">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="text"
                                name="name"
                                placeholder="שם מלא"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="email"
                                name="email"
                                placeholder="אימייל"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="password"
                                name="password"
                                placeholder="סיסמה (לפחות 6 תווים)"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="אימות סיסמה"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 music-gradient-purple text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>הירשם</span>
                                    <CheckCircle className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <p className="text-white/40 text-sm text-center mt-4">
                            לאחר ההרשמה, החשבון שלך יועבר לאישור מנהל
                        </p>
                    </form>
                )}
            </motion.div>

            {/* Footer */}
            <p className="text-white/30 text-sm mt-8">
                © {new Date().getFullYear()} RanTunes
            </p>
        </div>
    );
};

export default AuthScreen;
