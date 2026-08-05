import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, 
  Mail, 
  Building2, 
  Briefcase, 
  Phone, 
  Camera, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Users, 
  Sparkles,
  Save,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, setUser, fetchUser, token } = useAuth();

  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Populate user data when component mounts or user updates
  useEffect(() => {
    if (user) {
      setDepartment(user.department || '');
      setDesignation(user.designation || '');
      setPhone(user.phone || '');
      setProfileImage(user.profile_image || '');
      setImagePreview(user.profile_image || '');
    }
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Handle Profile Image Selection & Base64 Conversion
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB. Please choose a smaller image.', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProfileImage('');
    setImagePreview('');
  };

  // Submit Profile Form Update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await axios.put('/api/users/profile/me', {
        department,
        designation,
        phone,
        profile_image: profileImage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        showToast('Profile updated successfully!');
        if (setUser && res.data.user) {
          setUser(res.data.user);
        } else if (fetchUser) {
          fetchUser();
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-24 right-8 z-[9999] px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold transition-all border ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Profile Banner Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl bg-white dark:bg-slate-900">
        
        {/* Cover Background */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-40"></div>
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Profile Card Header Info */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 -mt-16 sm:-mt-20">
          
          {/* Avatar Upload Container */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1 bg-white dark:bg-slate-900 shadow-2xl ring-4 ring-white dark:ring-slate-900 overflow-hidden">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt={user?.username} 
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-inner">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Camera Upload Badge Button */}
            <label 
              htmlFor="profile-image-input" 
              className="absolute bottom-2 right-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg cursor-pointer transition-transform duration-200 hover:scale-110 flex items-center justify-center"
              title="Upload new profile picture"
            >
              <Camera className="w-4 h-4" />
              <input 
                id="profile-image-input" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageChange} 
              />
            </label>

            {imagePreview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 bg-rose-500/90 hover:bg-rose-600 text-white rounded-xl shadow-md transition-all hover:scale-105"
                title="Remove profile picture"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Titles & Info */}
          <div className="flex-1 text-center sm:text-left space-y-1.5 pb-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {user?.username || 'User Profile'}
              </h2>

              {/* Role Badge */}
              <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold tracking-wide uppercase shadow-sm ${
                user?.role === 'admin' 
                  ? 'bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400' 
                  : user?.role === 'manager'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                <span>{user?.role === 'admin' ? 'Administrator' : (user?.role === 'manager' ? 'Manager' : 'Team Member')}</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {user?.email}
            </p>

            {/* Department & Designation Preview Tags */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {department && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Building2 className="w-3 h-3 text-blue-500 mr-1" />
                  <span>{department}</span>
                </span>
              )}
              {designation && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Briefcase className="w-3 h-3 text-indigo-500 mr-1" />
                  <span>{designation}</span>
                </span>
              )}
              {user?.manager_name && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Users className="w-3 h-3 text-amber-500 mr-1" />
                  <span>Manager: {user.manager_name}</span>
                </span>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: System Account Credentials (Read Only) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Account Information</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Core login details and permissions assigned by your system administrator.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 flex items-center space-x-1">
              <Lock className="w-3 h-3 mr-1" />
              <span>Read Only</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Username (Fixed) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Username cannot be changed directly by user.</p>
            </div>

            {/* Email Address (Fixed) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Primary email address used for system login.</p>
            </div>

            {/* System Role (Fixed) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Account Role
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  disabled
                  value={user?.role === 'admin' ? 'Administrator' : (user?.role === 'manager' ? 'Manager' : 'User / Team Member')}
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed capitalize"
                />
              </div>
            </div>

            {/* Assigned Manager (Fixed) */}
            {user?.manager_name && (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Assigned Team Manager
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    disabled
                    value={user.manager_name}
                    className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Section 2: Personal Profile & Contact Details (Editable) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-white/5 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span>Personal Profile Details</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your department, designation, and WhatsApp mobile number.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Department Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Department
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-blue-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Marketing, Sales, IT, Boss"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Designation Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Designation
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Senior Marketing Specialist, Executive"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* WhatsApp Mobile Number Input */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Mobile Number
              </label>
              <div className="relative max-w-md">
                <Phone className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Explicit WhatsApp Requirement Note */}
              <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-2.5 text-emerald-800 dark:text-emerald-300 max-w-lg">
                <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-semibold leading-relaxed">
                  Note: This mobile number should be active on <span className="font-extrabold text-emerald-600 dark:text-emerald-400">WhatsApp</span> so you can receive task alerts, updates, and automated notifications.
                </p>
              </div>
            </div>

          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
            </button>
          </div>

        </div>

      </form>
    </div>
  );
};

export default Profile;
