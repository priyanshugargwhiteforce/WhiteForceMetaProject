import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Settings, 
  Key, 
  Phone, 
  Globe, 
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';

const ConfigManagerModal = ({ isOpen, onClose, type = 'meta', onConfigChange }) => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');

  const token = localStorage.getItem('token');
  const apiBase = 'http://localhost:5000/api';

  const handleAddConfig = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim() || !accessToken.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (type === 'whatsapp' && (!phoneId.trim() || !wabaId.trim())) {
      setError('Phone Number ID and WABA ID are required for WhatsApp.');
      return;
    }

    try {
      const endpoint = type === 'meta' ? `${apiBase}/meta/configs` : `${apiBase}/whatsapp/configs`;
      const payload = type === 'meta' 
        ? { name, accessToken } 
        : { name, phoneId, wabaId, accessToken };

      const res = await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSuccess('Configuration added successfully.');
        setName('');
        setAccessToken('');
        setPhoneId('');
        setWabaId('');
        if (onConfigChange) onConfigChange();
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add configuration.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl p-8 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Add {type === 'meta' ? 'Meta Ads' : 'WhatsApp'} Connection
              </h3>
              <p className="text-xs text-slate-400">Configure new API access credentials</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto py-6 space-y-8 pr-2">
          {/* Notifications */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-semibold text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center space-x-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Add New Configuration Form */}
          <form onSubmit={handleAddConfig} className="space-y-4 bg-white/[0.01] border border-white/5 rounded-[2rem] p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Plus className="w-4 h-4 mr-1.5 text-blue-500" />
              Add Custom Account Connection
            </h4>

            <div className="grid gap-4">
              {/* Account Label */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Account Name
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Agency Main Account, Client X"
                    className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-none rounded-xl py-3 pl-12 pr-4 text-sm text-white transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp Specific inputs */}
              {type === 'whatsapp' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Phone Number ID
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={phoneId}
                        onChange={(e) => setPhoneId(e.target.value)}
                        placeholder="15-digit number"
                        className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-none rounded-xl py-3 pl-12 pr-4 text-sm text-white transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      WABA ID (Business Account)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={wabaId}
                        onChange={(e) => setWabaId(e.target.value)}
                        placeholder="15-digit ID"
                        className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-none rounded-xl py-3 pl-12 pr-4 text-sm text-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Access Token */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  System User Access Token
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAA..."
                    className="w-full bg-slate-950 border border-white/10 hover:border-white/20 focus:border-blue-500 focus:outline-none rounded-xl py-3 pl-12 pr-4 text-sm text-white transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-1" /> Connect API Credentials
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfigManagerModal;
