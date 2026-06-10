import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, ArrowLeft, Mail } from 'lucide-react';
import logoImg from '../assets/white-forcelogo.png';

const ForgotPassword = () => {
    const { theme, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [testUrl, setTestUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setTestUrl('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-password', { email });
            setMessage(res.data.message || 'Password reset link sent to your email.');
            if (res.data.testResetUrl) {
                setTestUrl(res.data.testResetUrl);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send password reset email. Please try again.');
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
                            {/* Background concentric expanding warning/radar lines */}
                            <circle cx="200" cy="150" r="90" stroke="rgba(96, 165, 250, 0.15)" strokeWidth="2" className="animate-radar-1" />
                            <circle cx="200" cy="150" r="60" stroke="rgba(96, 165, 250, 0.2)" strokeWidth="2" className="animate-radar-2" />
                            
                            {/* Shield base */}
                            <path d="M 200 80 Q 250 85 270 120 Q 270 180 200 220 Q 130 180 130 120 Q 150 85 200 80 Z" fill="url(#shieldBg)" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" />
                            
                            {/* Glowing lock icon inside shield */}
                            <rect x="180" y="130" width="40" height="30" rx="6" fill="#3b82f6" className="animate-lock-pulse" />
                            <path d="M 190 130 L 190 115 A 10 10 0 0 1 210 115 L 210 130" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
                            <circle cx="200" cy="145" r="4" fill="#f8fafc" />
                            <path d="M 200 149 L 200 156" stroke="#f8fafc" strokeWidth="2" />
                            
                            <defs>
                                <linearGradient id="shieldBg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.25)" />
                                    <stop offset="100%" stopColor="rgba(139, 92, 246, 0.05)" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-none">
                        Password Recovery
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md text-base leading-relaxed">
                        Recover access to your account quickly. Enter your email, and we will dispatch a reset link to verify your identity.
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
                    <h2>Forgot Password</h2>
                    {error && <div className="error-message">{error}</div>}
                    
                    {message && (
                        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                            {message}
                        </div>
                    )}

                    {testUrl && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-left">
                            <div className="text-blue-400 font-bold mb-1">🛠️ Dev Testing Helper:</div>
                            <div className="text-xs text-slate-400 mb-2">Since SMTP is not configured locally, use this generated link to test:</div>
                            <a 
                                href={testUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-blue-400 underline hover:text-blue-300 break-all block"
                            >
                                {testUrl}
                            </a>
                        </div>
                    )}

                    {!message && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group relative">
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        placeholder="Enter your registered email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="pl-10 w-full"
                                    />
                                    <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            <button type="submit" className="auth-btn flex items-center justify-center gap-2" disabled={loading}>
                                {'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="switch-auth flex items-center justify-center gap-2 mt-6">
                        <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium hover:text-blue-500 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
