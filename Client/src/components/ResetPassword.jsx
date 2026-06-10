import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import logoImg from '../assets/white-forcelogo.png';

const ResetPassword = () => {
    const { theme, toggleTheme } = useTheme();
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`/api/auth/reset-password/${token}`, { password });
            setMessage(res.data.message || 'Password has been reset successfully.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. The link may have expired or is invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-[#020617] text-slate-800 dark:text-white transition-colors duration-300">
            {/* Left Side: Brand & Visuals */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-[#e0e7ff] via-[#f8fafc] to-[#f3e8ff] dark:from-[#0f172a] dark:via-[#020617] dark:to-[#1e1b4b] flex-col justify-between p-12 relative overflow-hidden border-r border-slate-200 dark:border-white/5">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none animate-pulse-subtle" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] pointer-events-none animate-pulse-subtle" />

                {/* Header Logo & Name */}
                <div className="flex items-center gap-3 z-10">
                    <img src={logoImg} alt="White Force Logo" className="w-10 h-10 object-contain" />
                    <span className="text-xl font-bold tracking-wider text-slate-900 dark:text-white">WHITE FORCE</span>
                </div>

                {/* Graphic Illustration */}
                <div className="my-auto flex flex-col items-center text-center z-10">
                    <div className="w-full max-w-[320px] mb-6 animate-float">
                        <svg viewBox="0 0 400 300" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Concentric rings */}
                            <circle cx="200" cy="150" r="80" stroke="rgba(168, 85, 247, 0.15)" strokeWidth="3" />
                            <circle cx="200" cy="150" r="80" stroke="url(#ringGrad)" strokeWidth="4" strokeDasharray="100 400" className="animate-spin-slow" />
                            
                            {/* Security Checkmarks / Success indicators */}
                            <circle cx="200" cy="150" r="50" fill="url(#innerShield)" className="animate-pulse-subtle" />
                            
                            {/* Lock opening animation */}
                            <g>
                                {/* Shackle in open position */}
                                <path d="M 185 130 L 185 110 A 15 15 0 0 1 215 110" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" className="animate-shackle-open" />
                                {/* Body */}
                                <rect x="175" y="130" width="50" height="40" rx="8" fill="#8b5cf6" />
                                <circle cx="200" cy="150" r="5" fill="#ffffff" />
                                <path d="M 200 155 L 200 162" stroke="#ffffff" strokeWidth="2" />
                            </g>
                            
                            <defs>
                                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                                <linearGradient id="innerShield" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(168, 85, 247, 0.2)" />
                                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.03)" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-none">
                        Secure Password Reset
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md text-base leading-relaxed">
                        Establish a strong, unique passkey to safeguard your administrative workflow and user profiles.
                    </p>
                </div>

                {/* Footer Brand Info */}
                <div className="text-slate-400 dark:text-slate-500 text-xs z-10">
                    &copy; {new Date().getFullYear()} White Force. All rights reserved.
                </div>
            </div>

            {/* Right Side: Form Container */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-white transition-all shadow-xl z-50"
                >
                    {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                </button>

                <div className="auth-container auth-card-glass fade-in max-w-md w-full p-8 border border-white/5 shadow-2xl">
                    <h2>Reset Password</h2>
                    {error && <div className="error-message">{error}</div>}

                    {message ? (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 mb-4">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="mb-6 p-2 text-emerald-400 text-sm text-center font-medium">
                                {message}
                            </div>
                            <div className="text-xs text-slate-500 mb-4 animate-pulse">
                                Redirecting to login page shortly...
                            </div>
                            <Link to="/login" className="auth-btn flex items-center justify-center gap-1.5 no-underline">
                                Login Now <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">New Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="pl-10 w-full"
                                    />
                                    <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="pl-10 w-full"
                                    />
                                    <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            <button type="submit" className="auth-btn flex items-center justify-center gap-2" disabled={loading}>
                                {loading ? 'Updating Password...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
