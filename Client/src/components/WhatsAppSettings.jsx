import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  MessageCircle,
  Plus,
  Trash2,
  Phone,
  Globe,
  Key,
  Hash,
  AlertCircle
} from 'lucide-react';
import ConfigManagerModal from './ConfigManagerModal';

const WhatsAppSettings = () => {
  const { token } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/whatsapp/configs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfigs(response.data.configs || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch WhatsApp configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this configuration? This will clear its local cache.')) return;
    try {
      await axios.delete(`/api/whatsapp/configs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConfigs();
      // Notify other pages
      window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'whatsapp' } }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete configuration.');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-500" />
            WhatsApp Account Configurations
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-xs">Configure and manage WhatsApp Cloud API setups for multiple phone numbers and WABAs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-green-500/20"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add WhatsApp Configuration</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-500 p-4 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Configurations List */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-sm p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">Connected WhatsApp Accounts</h2>
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full"></div>
          </div>
        ) : configs.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-2xl p-8">
            <MessageCircle className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-3" />
            <h4 className="font-bold text-[var(--text-primary)] mb-1">No WhatsApp Accounts</h4>
            <p className="text-xs max-w-sm mx-auto leading-relaxed">
              No custom WhatsApp connections found. The system is running on the default server environment keys.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {configs.map((config) => (
              <div
                key={config.id}
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col justify-between hover:bg-[var(--bg-tertiary)] transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 font-bold text-base shadow-sm border border-green-500/10">
                      {config.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{config.name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Configured Account</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-2 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all border border-transparent"
                    title="Delete Connection"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="mt-6 space-y-3 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center text-xs text-[var(--text-secondary)]">
                    <Phone className="w-4 h-4 mr-2 text-green-500/70" />
                    <span className="font-semibold mr-1.5 uppercase text-[9px] tracking-wider w-24">Phone Number ID:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{config.phone_number_id}</span>
                  </div>
                  <div className="flex items-center text-xs text-[var(--text-secondary)]">
                    <Globe className="w-4 h-4 mr-2 text-emerald-500/70" />
                    <span className="font-semibold mr-1.5 uppercase text-[9px] tracking-wider w-24">WABA ID:</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">{config.waba_id}</span>
                  </div>
                  <div className="flex items-center text-xs text-[var(--text-secondary)]">
                    <Key className="w-4 h-4 mr-2 text-yellow-500/70" />
                    <span className="font-semibold mr-1.5 uppercase text-[9px] tracking-wider w-24">Access Token:</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">Masked & Active</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp configurations manager modal */}
      <ConfigManagerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="whatsapp"
        onConfigChange={() => {
          fetchConfigs();
          window.dispatchEvent(new CustomEvent('config-changed', { detail: { type: 'whatsapp' } }));
        }}
      />
    </div>
  );
};

export default WhatsAppSettings;
