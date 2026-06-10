import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, User, Mail, Lock } from 'lucide-react';
import logoImg from '../assets/white-forcelogo.png';

const Register = () => {
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
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
            const res = await axios.post('/api/auth/register', formData);
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                            {/* Rotating Concentric Rings */}
                            <circle cx="200" cy="150" r="100" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="1.5" strokeDasharray="8 8" className="animate-spin-slow" />
                            <circle cx="200" cy="150" r="70" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1.5" strokeDasharray="5 5" className="animate-spin-reverse" />
                            <circle cx="200" cy="150" r="40" stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1.5" />

                            {/* Network Hubs and connections */}
                            <g className="animate-pulse-subtle">
                                {/* Center node */}
                                <circle cx="200" cy="150" r="14" fill="url(#centerNode)" />
                                <circle cx="200" cy="150" r="24" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1" className="animate-ping-slow" />
                                
                                {/* Connecting lines */}
                                <line x1="200" y1="150" x2="130" y2="90" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                                <line x1="200" y1="150" x2="280" y2="100" stroke="rgba(168, 85, 247, 0.5)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                                <line x1="200" y1="150" x2="150" y2="220" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                                <line x1="200" y1="150" x2="250" y2="210" stroke="rgba(168, 85, 247, 0.5)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                                
                                {/* Branch nodes */}
                                <circle cx="130" cy="90" r="8" fill="#3b82f6" />
                                <circle cx="280" cy="100" r="10" fill="#a855f7" />
                                <circle cx="150" cy="220" r="9" fill="#0ea5e9" />
                                <circle cx="250" cy="210" r="8" fill="#ec4899" />
                            </g>
                            
                            <defs>
                                <radialGradient id="centerNode" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </radialGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight leading-none">
                        Create Your Account
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md text-base leading-relaxed">
                        Join the White Force platform to integrate, optimize and control your digital marketing pipelines seamlessly.
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
                    <h2>Register</h2>
                    {error && <div className="error-message">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group relative">
                            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Username</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Choose a username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    className="pl-10 w-full"
                                />
                                <User className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
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
                        <div className="form-group relative">
                            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="pl-10 w-full"
                                />
                                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Creating account...' : 'Register'}
                        </button>
                    </form>
                    <div className="switch-auth">
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
