import { useState, useEffect } from 'react';
import axios from 'axios';
import { KeyRound, Lock, ShieldCheck, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const inputClass = 'w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';
const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2';

const passwordRuleError = (password) => {
  if (password.length < 8) return 'New password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'New password must contain at least one letter and one number.';
  return '';
};

/**
 * Admin-only "Change Password" card.
 * Step 1: current + new password -> a verification code is emailed to IT support.
 * Step 2: enter that code -> password changes only after it is verified.
 */
const AdminChangePassword = () => {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const validatePasswords = () => {
    if (!currentPassword) return 'Please enter your current password.';
    const ruleError = passwordRuleError(newPassword);
    if (ruleError) return ruleError;
    if (newPassword !== confirmPassword) return 'New password and confirm password do not match.';
    if (newPassword === currentPassword) return 'New password must be different from the current password.';
    return '';
  };

  const handleSendCode = async () => {
    setError('');
    setSuccess('');
    const validation = validatePasswords();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/change-password/request-otp', { currentPassword }, authHeader);
      setCodeSent(true);
      setSentTo(res.data.sent_to || 'IT support');
      setResendIn(res.data.resend_after_seconds || 60);
      setCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send the verification code.');
      if (err.response?.data?.retry_after_seconds) setResendIn(err.response.data.retry_after_seconds);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validation = validatePasswords();
    if (validation) {
      setError(validation);
      return;
    }
    const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length !== 8) {
      setError('Please enter the 8-character verification code.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/change-password/confirm', { currentPassword, newPassword, code: cleaned }, authHeader);
      setSuccess(res.data.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
      setCodeSent(false);
      setResendIn(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { if (codeSent) { handleConfirm(e); } else { e.preventDefault(); handleSendCode(); } }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 dark:border-white/5 pb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-rose-500" />
          <span>Change Password</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          For security, a verification code is sent to IT support. The password changes only after that code is verified.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className={labelClass}>Current Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={codeSent} className={inputClass} placeholder="Current password" />
          </div>
        </div>
        <div>
          <label className={labelClass}>New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-blue-500 absolute left-3.5 top-3" />
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={codeSent} className={inputClass} placeholder="New password" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Confirm New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-blue-500 absolute left-3.5 top-3" />
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={codeSent} className={inputClass} placeholder="Confirm new password" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-3">At least 8 characters, with at least one letter and one number.</p>

      {codeSent && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-500/30 space-y-3">
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Verification code sent to <span className="font-extrabold">{sentTo}</span>. Valid for 10 minutes.</span>
          </p>
          <div className="relative max-w-xs">
            <KeyRound className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
            <input
              type="text"
              autoComplete="one-time-code"
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. K7QM-4X9P"
              className={`${inputClass} font-mono tracking-[0.25em] uppercase`}
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button type="button" onClick={handleSendCode} disabled={resendIn > 0 || loading} className="font-bold text-indigo-600 dark:text-indigo-300 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer">
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError(''); }} className="font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
        {!codeSent ? (
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-500/25 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Verifying...' : 'Verify & Change Password'}</span>
          </button>
        )}
      </div>
    </form>
  );
};

export default AdminChangePassword;
