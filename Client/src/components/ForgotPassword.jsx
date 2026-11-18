import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, ArrowLeft, Mail, KeyRound, Lock, CheckCircle2 } from 'lucide-react';
import logoImg from '../assets/white-forcelogo.png';

const RESEND_SECONDS = 60;

const passwordRuleError = (password) => {
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must contain at least one letter and one number.';
    return '';
};

const ForgotPassword = () => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    // step: 'email' -> 'code' -> 'password' -> 'done'
    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    useEffect(() => {
        if (step !== 'done') return undefined;
        const timer = setTimeout(() => navigate('/login'), 3000);
        return () => clearTimeout(timer);
    }, [step, navigate]);

    const requestCode = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-password', { email: email.trim() });
            setMessage(res.data.message || 'Verification code sent to your email.');
            setResendIn(res.data.resend_after_seconds || RESEND_SECONDS);
            setCode('');
            setStep('code');
        } catch (err) {
            const retryAfter = err.response?.data?.retry_after_seconds;
            if (err.response?.status === 429 && retryAfter && retryAfter <= RESEND_SECONDS) {
                // A code was sent less than a minute ago: let the user enter it instead of blocking them
                setMessage('A verification code was already sent to this email. Please check your inbox (and spam folder).');
                setResendIn(retryAfter);
                setStep('code');
            } else {
                // e.g. email not registered: stay on the email step and show the error
                setError(err.response?.data?.message || 'Failed to send the verification code. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        requestCode();
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleaned.length !== 8) {
            setError('Please enter the 8-character code from the email.');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/forgot-password/verify', { email: email.trim(), code: cleaned });
            setResetToken(res.data.reset_token);
            setMessage('');
            setStep('password');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired code.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const ruleError = passwordRuleError(password);
        if (ruleError) {
            setError(ruleError);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`/api/auth/reset-password/${resetToken}`, { password });
            setMessage(res.data.message || 'Password has been reset successfully.');
            setStep('done');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please start again.');
        } finally {
            setLoading(false);
        }
    };

    const startOver = () => {
        setStep('email');
        setCode('');
        setResetToken('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setMessage('');
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
                        Recover access to your account quickly. Enter your registered email and we will send a one-time verification code to confirm it is you.
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
                    <h2>{step === 'password' ? 'Set New Password' : 'Forgot Password'}</h2>

                    {/* Step indicator */}
                    {step !== 'done' && (
                        <div className="flex items-center justify-center gap-2 mb-5 text-[11px] font-semibold">
                            {['Email', 'Verify Code', 'New Password'].map((label, i) => {
                                const current = ['email', 'code', 'password'].indexOf(step);
                                return (
                                    <span key={label} className={`px-2.5 py-1 rounded-full border ${i === current ? 'bg-blue-500/15 border-blue-500/40 text-blue-500' : i < current ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'border-slate-300 dark:border-white/10 text-slate-400'}`}>
                                        {i + 1}. {label}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    {message && step !== 'password' && (
                        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm text-center">
                            {message}
                        </div>
                    )}

                    {step === 'email' && (
                        <form onSubmit={handleEmailSubmit}>
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
                                {loading ? 'Sending Code...' : 'Send Verification Code'}
                            </button>
                        </form>
                    )}

                    {step === 'code' && (
                        <form onSubmit={handleCodeSubmit}>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
                                Enter the 8-character code (letters &amp; numbers) sent to <span className="font-semibold">{email}</span>.
                            </p>
                            <div className="form-group relative">
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">Verification Code</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="text"
                                        autoComplete="one-time-code"
                                        placeholder="e.g. K7QM-4X9P"
                                        value={code}
                                        maxLength={12}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        required
                                        className="pl-10 w-full font-mono tracking-[0.3em] uppercase"
                                    />
                                    <KeyRound className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>

                            <button type="submit" className="auth-btn flex items-center justify-center gap-2" disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>

                            <div className="flex items-center justify-between mt-4 text-xs">
                                <button type="button" onClick={startOver} className="text-slate-500 hover:text-blue-500 bg-transparent border-0 cursor-pointer p-0">
                                    Change email
                                </button>
                                <button
                                    type="button"
                                    onClick={requestCode}
                                    disabled={resendIn > 0 || loading}
                                    className="text-blue-500 disabled:text-slate-400 bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed p-0"
                                >
                                    {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'password' && (
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-2 block">New Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        autoComplete="new-password"
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
                                        autoComplete="new-password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="pl-10 w-full"
                                    />
                                    <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
                                At least 8 characters, with at least one letter and one number.
                            </p>
                            <button type="submit" className="auth-btn flex items-center justify-center gap-2" disabled={loading}>
                                {loading ? 'Updating Password...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    {step === 'done' && (
                        <div className="flex flex-col items-center justify-center py-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 mb-3">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="text-xs text-slate-500 mb-4 animate-pulse">Redirecting to login page shortly...</div>
                        </div>
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
