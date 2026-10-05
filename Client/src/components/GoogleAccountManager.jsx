import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink,
  UserCheck,
  UserX,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

const GoogleAccountManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Check URL params for redirect messages
  useEffect(() => {
    const connected = searchParams.get('connected');
    const email = searchParams.get('email');
    const errorParam = searchParams.get('error');

    if (connected === 'true' && email) {
      setNotification({
        type: 'success',
        message: `Successfully connected Google Account: ${email}`
      });
      searchParams.delete('connected');
      searchParams.delete('email');
      setSearchParams(searchParams, { replace: true });
    } else if (errorParam) {
      setNotification({
        type: 'error',
        message: `Google Authentication Error: ${decodeURIComponent(errorParam)}`
      });
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch connected accounts
  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/google/connected-accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch connected Google Accounts');
      }

      setAccounts(data.data || data.accounts || []);
    } catch (err) {
      console.error('Fetch Google Accounts Error:', err);
      setError(err.message || 'Error loading Google Account connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Trigger Google OAuth 2.0 Auth Link
  const handleConnectAccount = async () => {
    setActionLoading('connect');
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/google/auth/login', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const data = await res.json();

      if (!res.ok || !data.authUrl) {
        throw new Error(data.message || 'Could not generate Google OAuth login URL');
      }

      // Redirect browser to Google OAuth consent page
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Connect Google Account Error:', err);
      setError(err.message || 'Failed to initiate Google OAuth flow');
      setActionLoading(null);
    }
  };

  // Test Refresh Token / Access Token
  const handleRefreshToken = async (accountId, email) => {
    setActionLoading(`refresh_${accountId}`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/accounts/${accountId}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to refresh account token');
      }

      setNotification({
        type: 'success',
        message: `Active connection verified for ${email}`
      });
      fetchAccounts();
    } catch (err) {
      console.error('Refresh token error:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Token refresh test failed'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Disconnect Account
  const handleDisconnect = async (accountId, email) => {
    if (!window.confirm(`Are you sure you want to disconnect Google Account (${email})?`)) {
      return;
    }

    setActionLoading(`delete_${accountId}`);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/google/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to disconnect Google Account');
      }

      setNotification({
        type: 'success',
        message: `Disconnected ${email} successfully.`
      });
      fetchAccounts();
    } catch (err) {
      console.error('Disconnect account error:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Failed to disconnect account'
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-6 transition-colors duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 dark:bg-gradient-to-tr dark:from-amber-500/20 dark:to-red-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl">
              <ShieldCheck className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text dark:text-transparent">
                Google Account Connections
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Manage multi-account OAuth 2.0 authorizations for YouTube Channels & Ads
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/youtube-channel-dashboard')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold border border-slate-200 dark:border-slate-700/60 transition-all text-xs shadow-sm dark:shadow-none"
          >
            <ArrowLeft className="w-4 h-4" />
            YouTube Dashboard
          </button>
          
          <button
            onClick={handleConnectAccount}
            disabled={actionLoading === 'connect'}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-red-600 via-amber-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 dark:shadow-red-900/30 transition-all text-sm disabled:opacity-50"
          >
            {actionLoading === 'connect' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            + Connect Google Account
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-2xl text-rose-800 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Connected Accounts</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{accounts.length}</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              OAuth 2.0 Verified
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Security Architecture</p>
          <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            No Passwords Stored & Token Vault Secured
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">YouTube Data Scope</p>
          <div className="mt-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            youtube.readonly & Identity Profile
          </div>
        </div>
      </div>

      {/* Connected Accounts Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Active Google Accounts ({accounts.length})</h2>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh List
          </button>
        </div>

        {loading ? (
          <div className="bg-white/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 animate-pulse">
            Loading Google Account connections...
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center space-y-4 shadow-sm dark:shadow-none">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
              <UserX className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Google Accounts Connected Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Connect your Google accounts via OAuth 2.0 to manage YouTube channels, video analytics, and comments.
              </p>
            </div>
            <button
              onClick={handleConnectAccount}
              disabled={actionLoading === 'connect'}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg"
            >
              + Connect First Google Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div 
                key={acc.id}
                className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition-all shadow-sm dark:shadow-none backdrop-blur-md relative overflow-hidden group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {acc.picture ? (
                      <img 
                        src={acc.picture} 
                        alt={acc.name || acc.email}
                        className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-700 object-cover" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-white font-black text-lg border border-white/10">
                        {(acc.name || acc.email || 'G')[0].toUpperCase()}
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {acc.name || 'Google User'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">{acc.email}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${
                    acc.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}>
                    {acc.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Google ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{acc.google_account_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Connected On:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {acc.created_at ? new Date(acc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                  <button
                    onClick={() => handleRefreshToken(acc.id, acc.email)}
                    disabled={actionLoading === `refresh_${acc.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700/60 transition-all disabled:opacity-50 shadow-sm dark:shadow-none"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === `refresh_${acc.id}` ? 'animate-spin' : ''}`} />
                    Test Auth
                  </button>

                  <button
                    onClick={() => handleDisconnect(acc.id, acc.email)}
                    disabled={actionLoading === `delete_${acc.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/20 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleAccountManager;
