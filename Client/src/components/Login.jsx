import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Mail, Lock } from 'lucide-react';
import logoImg from '../assets/white-forcelogo.png';

const Login = () => {
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/login', formData);
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-[#020617] text-slate-800 dark:text-white transition-colors duration-300">
            {/* Left Side: Brand & Animated SVG Illustration */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-[#e0e7ff] via-[#f8fafc] to-[#f3e8ff] dark:from-[#0f172a] dark:via-[#020617] dark:to-[#1e1b4b] flex-col justify-between p-12 relative overflow-hidden border-r border-slate-200 dark:border-white/5">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] pointer-events-none animate-pulse-subtle" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-[120px] pointer-events-none animate-pulse-subtle" />

                {/* Header Logo & Name */}
                <div className="flex items-center gap-3 z-10">
                    <img src={logoImg} alt="White Force Logo" className="w-10 h-10 object-contain" />
                    <span className="text-xl font-bold tracking-wider text-slate-900 dark:text-white">WHITE FORCE</span>
                </div>

                {/* Animated SVG Illustration */}
                <div className="my-auto flex flex-col items-center text-center z-10">
                    <div className="w-full max-w-[320px] mb-6 animate-float">
                        <svg viewBox="0 0 400 300" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Grid lines background */}
                            <path d="M 50 50 L 350 50 M 50 100 L 350 100 M 50 150 L 350 150 M 50 200 L 350 200 M 50 250 L 350 250" stroke="rgba(96, 165, 250, 0.15)" strokeWidth="1.5" />
                            <path d="M 50 50 L 50 250 M 110 50 L 110 250 M 170 50 L 170 250 M 230 50 L 230 250 M 290 50 L 290 250 M 350 50 L 350 250" stroke="rgba(96, 165, 250, 0.15)" strokeWidth="1.5" />
                            
                            {/* Animated Chart Line 1 */}
                            <path d="M 50 220 Q 110 180 170 210 T 290 120 T 350 80" stroke="url(#blueGradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray="600" strokeDashoffset="600" className="animate-draw-line" />
                            
                            {/* Animated Chart Line 2 */}
                            <path d="M 50 180 Q 110 210 170 140 T 290 160 T 350 110" stroke="url(#purpleGradient)" strokeWidth="3" strokeLinecap="round" strokeDasharray="600" strokeDashoffset="600" className="animate-draw-line-delay" />

                            {/* Pulsing Nodes on Line 1 */}
                            <circle cx="170" cy="210" r="6" fill="#3b82f6" className="animate-node-pulse" />
                            <circle cx="290" cy="120" r="6" fill="#3b82f6" className="animate-node-pulse" />
                            <circle cx="350" cy="80" r="7" fill="#60a5fa" className="animate-node-pulse" />

                            {/* Pulsing Nodes on Line 2 */}
                            <circle cx="170" cy="140" r="5" fill="#a855f7" className="animate-node-pulse-delay" />
                            <circle cx="290" cy="160" r="5" fill="#a855f7" className="animate-node-pulse-delay" />

                            {/* Ascending bar charts at bottom */}
                            <rect x="70" y="220" width="16" height="30" rx="3" fill="url(#barGradient)" className="animate-grow-bar-1" />
                            <rect x="130" y="200" width="16" height="50" rx="3" fill="url(#barGradient)" className="animate-grow-bar-2" />
                            <rect x="190" y="170" width="16" height="80" rx="3" fill="url(#barGradient)" className="animate-grow-bar-3" />
                            <rect x="250" y="190" width="16" height="60" rx="3" fill="url(#barGradient)" className="animate-grow-bar-4" />
                            <rect x="310" y="140" width="16" height="110" rx="3" fill="url(#barGradient)" className="animate-grow-bar-5" />

                            {/* Definitions */}
                            <defs>
                                <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#60a5fa" />
                                </linearGradient>
                                <linearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#d946ef" />
                                </linearGradient>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-none">
                        Marketing Automation Portal
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md text-base leading-relaxed">
                        Log in to manage and analyze your Meta, Google, and LinkedIn campaigns in a unified dashboard.
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
                    <h2>Login</h2>
                    {error && <div className="error-message">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group relative">
                            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="pl-10 w-full"
                                />
                                <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="pl-10 w-full"
                                />
                                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    <div className="switch-auth">
                        Don't have an account? <Link to="/register">Register here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
