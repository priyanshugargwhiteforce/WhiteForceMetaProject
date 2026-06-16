import { useState, useEffect } from 'react';
import {
  Send,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Activity,
  MessageCircle,
  Globe,
  ChevronDown,
  Database,
  Calendar,
  Clock,
  ArrowLeft,
  Copy,
  RefreshCw,
  Search,
  ExternalLink,
  Play
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const SYNONYMS = {
  name: ['name', 'user_name', 'customer_name', 'fullname', 'full_name', 'first_name', 'last_name'],
  phone: ['mobile', 'phone', 'phone_number', 'contact', 'number', 'recipient'],
  email: ['email', 'mail', 'email_address'],
  company: ['company', 'organization', 'org', 'business'],
  tags: ['tag', 'tags', 'label', 'labels']
};

const WACampaigns = () => {
  const { user } = useAuth();
  const [view, setView] = useState('list'); // 'list' | 'details' | 'new'

  // Lists
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [whatsappConfigs, setWhatsappConfigs] = useState([]);

  // Pagination & Search
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // New Campaign Form State
  const [name, setName] = useState('');
  const [selectedConfigId, setSelectedConfigId] = useState('');
  const [contactListId, setContactListId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [campaignType, setCampaignType] = useState('broadcast');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [recurringFrequency, setRecurringFrequency] = useState('daily');
  const [variables, setVariables] = useState([]);
  const [mappings, setMappings] = useState({}); // { [varName]: { source: 'static'|'field', value: '' } }
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Sprint 6: Saved Mappings & Custom Attributes State
  const [customAttributes, setCustomAttributes] = useState([]);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [shouldSaveMapping, setShouldSaveMapping] = useState(false);
  const [saveMappingName, setSaveMappingName] = useState('');
  const [isSaveDefault, setIsSaveDefault] = useState(false);
  const [previewContacts, setPreviewContacts] = useState([]);

  // Campaign Details State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientTotalPages, setRecipientTotalPages] = useState(1);
  const [recipientsList, setRecipientsList] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Stats aggregate
  const [statsSummary, setStatsSummary] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    avgDeliveryRate: 0
  });

  useEffect(() => {
    fetchCampaigns();
    fetchContactLists();
    fetchConfigs();
  }, [page, search]);

  useEffect(() => {
    if (selectedConfigId !== undefined) {
      fetchTemplates();
    }
  }, [selectedConfigId]);

  useEffect(() => {
    if (templateId) {
      fetchTemplateVariables(templateId);
    } else {
      setVariables([]);
      setMappings({});
      setSavedProfiles([]);
      setSelectedProfileId('');
      setShouldSaveMapping(false);
      setSaveMappingName('');
      setIsSaveDefault(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (contactListId) {
      fetchAttributeKeys(contactListId);
      fetchPreviewContacts(contactListId);
    } else {
      setCustomAttributes([]);
      setPreviewContacts([]);
    }
  }, [contactListId]);

  useEffect(() => {
    if (view === 'details' && selectedCampaign?.id) {
      fetchCampaignDetails(selectedCampaign.id, recipientPage);
    }
  }, [view, selectedCampaign?.id, recipientPage]);

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/whatsapp/campaigns', {
        params: { page, limit: 10, search },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setCampaigns(response.data.campaigns || []);
        setTotalPages(response.data.pagination?.totalPages || 1);

        // Calculate aggregate stats
        const list = response.data.campaigns || [];
        const total = list.length;
        const sent = list.reduce((acc, c) => acc + (c.sent_count || 0), 0);
        const failed = list.reduce((acc, c) => acc + (c.failed_count || 0), 0);
        const delivered = list.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
        const read = list.reduce((acc, c) => acc + (c.read_count || 0), 0);

        const completedCampaigns = list.filter(c => c.delivery_rate !== null);
        const avgDeliveryRate = completedCampaigns.length > 0
          ? (completedCampaigns.reduce((acc, c) => acc + parseFloat(c.delivery_rate || 0), 0) / completedCampaigns.length).toFixed(1)
          : 0;

        setStatsSummary({ total, sent, delivered, read, failed, avgDeliveryRate });
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns list.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Contact Lists
  const fetchContactLists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/whatsapp/lists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setContactLists(response.data.lists || []);
      }
    } catch (err) {
      console.error('Error fetching contact lists:', err);
    }
  };

  // Fetch Senders/Configs
  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/whatsapp/configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setWhatsappConfigs(response.data.configs || []);
      }
    } catch (err) {
      console.error('Error fetching whatsapp configs:', err);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const headers = {};
      if (selectedConfigId) {
        headers['X-WhatsApp-Config-Id'] = selectedConfigId;
      }
      const response = await axios.get('/api/whatsapp/templates', { headers });
      if (response.data.success) {
        // Only allow approved templates for campaigns
        setTemplates(response.data.templates.filter(t => t.status === 'APPROVED'));
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setTemplates([]);
    }
  };

  // Fetch Template Variables mapping metadata
  const fetchTemplateVariables = async (tplId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/whatsapp/templates/${tplId}/variables`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const vars = response.data.variables || [];
        setVariables(vars);

        // Fetch saved profiles (which will either load default mapping or fallback to auto-matching)
        await fetchSavedProfiles(tplId, vars);
      }
    } catch (err) {
      console.error('Error fetching template variables:', err);
      setVariables([]);
    }
  };

  // Sprint 6: Mappings persistence & engine helpers
  const fetchSavedProfiles = async (tplId, currentVars) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/whatsapp/templates/${tplId}/mappings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const profiles = response.data.mappings || [];
        setSavedProfiles(profiles);

        const defaultProfile = profiles.find(p => p.is_default);
        if (defaultProfile) {
          setSelectedProfileId(defaultProfile.id);
          const rawMaps = defaultProfile.mappings;
          const loadedMaps = rawMaps && rawMaps.mappings ? { ...rawMaps.mappings } : { ...rawMaps };
          currentVars.forEach(v => {
            if (!loadedMaps[v.variable_name]) {
              loadedMaps[v.variable_name] = { source: 'static', value: '' };
            }
          });
          setMappings(loadedMaps);
        } else {
          setSelectedProfileId('');
          runAutoMatching(currentVars, customAttributes);
        }
      }
    } catch (err) {
      console.error('Error fetching saved profiles:', err);
      setSavedProfiles([]);
      runAutoMatching(currentVars, customAttributes);
    }
  };

  const handleProfileChange = (profileId) => {
    setSelectedProfileId(profileId);
    if (!profileId) {
      runAutoMatching(variables, customAttributes);
      return;
    }
    const profile = savedProfiles.find(p => String(p.id) === String(profileId));
    if (profile) {
      const rawMaps = profile.mappings;
      const loadedMaps = rawMaps && rawMaps.mappings ? { ...rawMaps.mappings } : { ...rawMaps };
      variables.forEach(v => {
        if (!loadedMaps[v.variable_name]) {
          loadedMaps[v.variable_name] = { source: 'static', value: '' };
        }
      });
      setMappings(loadedMaps);
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Are you sure you want to delete this mapping profile?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`/api/whatsapp/templates/${templateId}/mappings/${profileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('Mapping profile deleted successfully.');
        fetchSavedProfiles(templateId, variables);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting mapping profile.');
    }
  };

  const runAutoMatching = (vars, customAttrs, currentMappings = {}) => {
    const newMappings = { ...currentMappings };
    vars.forEach(v => {
      const currentRule = currentMappings[v.variable_name];
      if (currentRule && (currentRule.source === 'field' || (currentRule.source === 'static' && currentRule.value !== ''))) {
        return;
      }

      const varLower = v.variable_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      let matched = false;
      for (const [field, synonyms] of Object.entries(SYNONYMS)) {
        if (synonyms.some(s => s.toLowerCase().replace(/[^a-z0-9]/g, '') === varLower || varLower.includes(s.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
          newMappings[v.variable_name] = { source: 'field', value: field };
          matched = true;
          break;
        }
      }

      if (!matched) {
        const matchedAttr = customAttrs.find(attr => {
          const attrLower = attr.toLowerCase().replace(/[^a-z0-9]/g, '');
          return attrLower === varLower || varLower.includes(attrLower) || attrLower.includes(varLower);
        });
        if (matchedAttr) {
          newMappings[v.variable_name] = { source: 'field', value: `attr:${matchedAttr}` };
          matched = true;
        }
      }

      if (!matched) {
        newMappings[v.variable_name] = { source: 'static', value: '' };
      }
    });
    setMappings(newMappings);
  };

  const fetchAttributeKeys = async (listId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/whatsapp/contacts/attribute-keys`, {
        params: { listId },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setCustomAttributes(response.data.keys || []);
      }
    } catch (err) {
      console.error('Error fetching attribute keys:', err);
    }
  };

  const fetchPreviewContacts = async (listId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/whatsapp/contacts', {
        params: { listId, limit: 3, page: 1 },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setPreviewContacts(response.data.contacts || []);
      }
    } catch (err) {
      console.error('Error fetching preview contacts:', err);
    }
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const str = String(phone);
    if (str.length <= 6) return str;
    const first2 = str.slice(0, 2);
    const last4 = str.slice(-4);
    const maskedPart = 'X'.repeat(str.length - 6);
    return `${first2}${maskedPart}${last4}`;
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const username = parts[0];
    const domain = parts[1];

    let maskedUser = '';
    if (username.length <= 2) {
      maskedUser = username[0] + '*';
    } else {
      maskedUser = username.slice(0, 2) + '*'.repeat(username.length - 2);
    }

    const domainParts = domain.split('.');
    let maskedDomain = domain;
    if (domainParts.length >= 2) {
      const domainName = domainParts[0];
      const tld = domainParts.slice(1).join('.');
      let maskedDomName = '';
      if (domainName.length <= 2) {
        maskedDomName = domainName[0] + '*';
      } else {
        maskedDomName = domainName.slice(0, 2) + '*'.repeat(domainName.length - 2);
      }
      maskedDomain = `${maskedDomName}.${tld}`;
    }
    return `${maskedUser}@${maskedDomain}`;
  };

  const getMappingConfidence = (varName, rule) => {
    if (!rule) return { label: 'Unmapped', class: 'text-slate-400 bg-slate-100 dark:bg-white/5' };
    if (rule.source === 'static') {
      return { label: 'Static', class: 'text-slate-500 bg-slate-100 dark:bg-white/5' };
    }

    const varLower = varName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mappedField = rule.value;

    if (mappedField.startsWith('attr:')) {
      const attrName = mappedField.replace('attr:', '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (attrName === varLower) {
        return { label: 'High Confidence', class: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' };
      }
      if (attrName.includes(varLower) || varLower.includes(attrName)) {
        return { label: 'Medium Confidence', class: 'text-amber-500 bg-amber-500/10 border border-amber-500/20' };
      }
      return { label: 'Low Confidence', class: 'text-red-500 bg-red-500/10 border border-red-500/20' };
    }

    const synonyms = SYNONYMS[mappedField];
    if (synonyms) {
      if (synonyms.some(s => s.toLowerCase().replace(/[^a-z0-9]/g, '') === varLower)) {
        return { label: 'High Confidence', class: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' };
      }
      if (synonyms.some(s => varLower.includes(s.toLowerCase().replace(/[^a-z0-9]/g, '')) || s.toLowerCase().replace(/[^a-z0-9]/g, '').includes(varLower))) {
        return { label: 'Medium Confidence', class: 'text-amber-500 bg-amber-500/10 border border-amber-500/20' };
      }
    }

    return { label: 'Manual Match', class: 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' };
  };

  const resolvePreviewValue = (contact, varName) => {
    const rule = mappings[varName];
    if (!rule) return '-';
    if (rule.source === 'static') return rule.value;

    let rawVal = '';
    if (rule.value === 'name') rawVal = contact.name || '';
    else if (rule.value === 'email') rawVal = contact.email || '';
    else if (rule.value === 'company') rawVal = contact.company || '';
    else if (rule.value === 'phone') rawVal = contact.phone || '';
    else if (rule.value === 'tags') rawVal = Array.isArray(contact.tags) ? contact.tags.join(', ') : (contact.tags || '');
    else if (rule.value.startsWith('attr:')) {
      const attrKey = rule.value.replace('attr:', '');
      rawVal = contact.attributes?.[attrKey] || '';
    }

    if (rule.value === 'phone' || rule.value.toLowerCase().includes('phone') || rule.value.toLowerCase().includes('mobile')) {
      return maskPhone(rawVal);
    }
    if (rule.value === 'email' || rule.value.toLowerCase().includes('email') || rule.value.toLowerCase().includes('mail')) {
      return maskEmail(rawVal);
    }
    return rawVal;
  };

  // Fetch Specific Campaign details & recipients
  const fetchCampaignDetails = async (campaignId, rPage = 1) => {
    setDetailsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/whatsapp/campaigns/${campaignId}`, {
        params: { recipientPage: rPage, recipientLimit: 20 },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setSelectedCampaign(response.data.campaign);
        setRecipientsList(response.data.recipients || []);
        setRecipientTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching campaign details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Clone Campaign
  const handleCloneCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to clone this campaign?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/whatsapp/campaigns/${campaignId}/clone`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        alert('Campaign cloned successfully as a Draft!');
        fetchCampaigns();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error cloning campaign.');
    }
  };

  // Handle Mapping source & value change
  const handleMappingChange = (varName, field, val) => {
    setMappings(prev => ({
      ...prev,
      [varName]: {
        ...prev[varName],
        [field]: val
      }
    }));
  };

  // Create & Save Campaign
  const handleCreateCampaign = async (isQueue = false) => {
    if (!name.trim()) return setFormError('Campaign name is required.');
    if (!contactListId) return setFormError('Please select a contact list.');
    if (!templateId) return setFormError('Please select a template.');
    if (campaignType !== 'broadcast' && !scheduledTime) {
      return setFormError('Please specify a scheduled date & time.');
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const token = localStorage.getItem('token');

      // 1. Fetch contacts for list
      const contactsRes = await axios.get('/api/whatsapp/contacts', {
        params: { listId: contactListId, limit: 100000 },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contacts = contactsRes.data.contacts || [];
      if (contacts.length === 0) {
        throw new Error('The selected Contact List has no contacts.');
      }

      // 2. Format parameters for each recipient based on mapping rules
      const recipientsPayload = contacts.map(c => {
        const params = variables.map(v => {
          const rule = mappings[v.variable_name];
          if (!rule) return '';
          if (rule.source === 'static') {
            return rule.value;
          } else {
            // Field mapping
            if (rule.value === 'name') return c.name || '';
            if (rule.value === 'email') return c.email || '';
            if (rule.value === 'company') return c.company || '';
            if (rule.value === 'phone') return c.phone || '';
            if (rule.value === 'tags') return Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || '');
            if (rule.value.startsWith('attr:')) {
              const attrKey = rule.value.replace('attr:', '');
              return c.attributes?.[attrKey] || '';
            }
            return '';
          }
        });
        return {
          phone: c.phone,
          parameters: params
        };
      });

      // 3. Post creation
      const payload = {
        configId: selectedConfigId || 0,
        name,
        templateId,
        contactListId,
        campaignType,
        scheduledTime: campaignType === 'scheduled' ? scheduledTime : null,
        timezone: campaignType !== 'broadcast' ? timezone : 'UTC',
        cronExpression: campaignType === 'recurring' ? cronExpression : null,
        status: isQueue ? 'queued' : 'draft',
        recipients: recipientsPayload
      };

      const response = await axios.post('/api/whatsapp/campaigns', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        // Trigger-based mapping save only AFTER successful campaign creation
        let targetMappingId = selectedProfileId;
        if (shouldSaveMapping && saveMappingName.trim()) {
          try {
            const saveRes = await axios.post(`/api/whatsapp/templates/${templateId}/mappings`, {
              mappingName: saveMappingName.trim(),
              mappings: { version: 1, mappings: mappings },
              isDefault: isSaveDefault
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (saveRes.data.success && saveRes.data.mappingId) {
              targetMappingId = saveRes.data.mappingId;
            }
          } catch (saveErr) {
            console.error('Failed to save template mappings:', saveErr);
            alert('Campaign created successfully, but mapping save failed: ' + (saveErr.response?.data?.message || saveErr.message));
          }
        }

        // Register usage of the mapping profile
        if (targetMappingId) {
          try {
            await axios.post(`/api/whatsapp/templates/${templateId}/mappings/${targetMappingId}/use`, {}, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (useErr) {
            console.error('Failed to register mapping profile usage:', useErr);
          }
        }

        setView('list');
        fetchCampaigns();
        // Reset states
        setName('');
        setContactListId('');
        setTemplateId('');
        setCampaignType('broadcast');
        setScheduledTime('');
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        setCronExpression('0 9 * * *');
        setRecurringFrequency('daily');
        setShouldSaveMapping(false);
        setSaveMappingName('');
        setIsSaveDefault(false);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusType = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'queued': return 'warning';
      case 'failed': return 'danger';
      default: return 'neutral';
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      info: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      danger: 'bg-red-500/10 text-red-500 border-red-500/20',
      neutral: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    };
    const styleClass = styles[getStatusType(status)] || styles.neutral;
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styleClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Title Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
            <Send className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Campaigns Manager</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Create, Sync & Monitor Broadcasters</p>
          </div>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-600/10"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        )}
        {view !== 'list' && (
          <button
            onClick={() => { setView('list'); setSelectedCampaign(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs border border-slate-200 dark:border-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
        )}
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW: CAMPAIGNS LIST */}
      {view === 'list' && (
        <>
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatsCard label="Total Campaigns" value={statsSummary.total} color="blue" />
            <StatsCard label="Sent Messages" value={statsSummary.sent} color="indigo" />
            <StatsCard label="Delivered / Read" value={`${statsSummary.delivered} / ${statsSummary.read}`} color="emerald" />
            <StatsCard label="Avg Delivery Rate" value={`${statsSummary.avgDeliveryRate}%`} color="violet" />
          </div>

          {/* List Table Controls */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 pl-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <button
                onClick={fetchCampaigns}
                className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-emerald-500 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading && campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-slate-500 font-medium animate-pulse">Loading Campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="font-semibold text-sm">No campaigns found</p>
                <p className="text-xs text-slate-400 mt-1">Get started by creating a new broadcasting campaign.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="pb-4 pl-4">Campaign Info</th>
                      <th className="pb-4">Template</th>
                      <th className="pb-4">Audience</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4">Success Stats</th>
                      <th className="pb-4 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                    {campaigns.map(c => {
                      const total = c.total_count || 0;
                      const sent = c.sent_count || 0;
                      const progressPercent = total > 0 ? Math.round((sent / total) * 100) : 0;

                      return (
                        <tr key={c.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="py-4 pl-4">
                            <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                            <div className="text-xs text-slate-400 mt-1 capitalize font-medium flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {c.campaign_type}
                              {c.created_at && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700">|</span>
                                  {new Date(c.created_at).toLocaleDateString()}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="font-mono text-xs font-bold text-emerald-400 dark:text-emerald-300">{c.template_name}</span>
                          </td>
                          <td className="py-4 font-medium text-slate-700 dark:text-slate-300">
                            {c.list_name || `List ID: ${c.contact_list_id}`}
                          </td>
                          <td className="py-4">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-4">
                            <div className="max-w-[150px]">
                              <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                                <span>{sent} / {total} sent</span>
                                <span>{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${c.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                                <span>Del: <strong className="text-emerald-500">{c.delivered_count || 0}</strong></span>
                                <span>Read: <strong className="text-emerald-500">{c.read_count || 0}</strong></span>
                                <span>Fail: <strong className="text-red-500">{c.failed_count || 0}</strong></span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setSelectedCampaign(c); setRecipientPage(1); setView('details'); }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all text-slate-700 dark:text-slate-300"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handleCloneCampaign(c.id)}
                                title="Clone Campaign"
                                className="p-2 bg-slate-100 hover:bg-emerald-50 dark:bg-white/5 dark:hover:bg-emerald-950/20 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-emerald-500 transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400 font-bold">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        </>
      )}

      {/* VIEW: DETAILS / RECIPIENTS VIEW */}
      {view === 'details' && selectedCampaign && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left panel: Info & progress */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Campaign Performance
              </h3>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaign Name</label>
                <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{selectedCampaign.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Template ID</label>
                  <div className="text-xs font-mono font-semibold text-emerald-400 dark:text-emerald-300 mt-1">{selectedCampaign.template_name}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Type</label>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize mt-1">{selectedCampaign.campaign_type}</div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient Status Badge</label>
                <div className="mt-1.5"><StatusBadge status={selectedCampaign.status} /></div>
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Total Recipients</span>
                  <span className="text-sm font-bold">{selectedCampaign.total_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Sent Messages</span>
                  <span className="text-sm font-bold text-emerald-500">{selectedCampaign.sent_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Delivered</span>
                  <span className="text-sm font-bold text-emerald-500">{selectedCampaign.delivered_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Read Receipts</span>
                  <span className="text-sm font-bold text-emerald-500">{selectedCampaign.read_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Failed Delivery</span>
                  <span className="text-sm font-bold text-red-500">{selectedCampaign.failed_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Delivery Rate</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedCampaign.delivery_rate || '0.00'}%</span>
                </div>
              </div>

              <button
                onClick={() => fetchCampaignDetails(selectedCampaign.id, recipientPage)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-white/10 font-bold text-xs transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${detailsLoading ? 'animate-spin' : ''}`} />
                Refresh Details
              </button>
            </div>
          </div>

          {/* Right panel: Recipients list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                Recipients Logs Table
              </h3>

              {detailsLoading && recipientsList.length === 0 ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
              ) : recipientsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">No recipients logs recorded for this campaign.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="pb-3 pl-2">Recipient Phone</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Message ID</th>
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3 pr-2 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-300">
                      {recipientsList.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                          <td className="py-3 pl-2 font-mono">{r.phone}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${r.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              r.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                r.status === 'read' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                  r.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono max-w-[120px] truncate" title={r.message_id}>{r.message_id || 'N/A'}</td>
                          <td className="py-3 text-slate-400">
                            {r.sent_at ? new Date(r.sent_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3 pr-2 text-right">
                            {r.error_message ? (
                              <span className="text-[10px] text-red-400 font-medium" title={r.error_message}>
                                {r.error_message.length > 20 ? r.error_message.substring(0, 20) + '...' : r.error_message}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recipients Pagination */}
              {recipientTotalPages > 1 && (
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-4">
                  <button
                    disabled={recipientPage === 1}
                    onClick={() => setRecipientPage(p => Math.max(p - 1, 1))}
                    className="px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-500 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Page {recipientPage} of {recipientTotalPages}
                  </span>
                  <button
                    disabled={recipientPage === recipientTotalPages}
                    onClick={() => setRecipientPage(p => Math.min(p + 1, recipientTotalPages))}
                    className="px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-500 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* VIEW: CREATE NEW CAMPAIGN */}
      {view === 'new' && (
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-sm transition-all duration-500 max-w-4xl mx-auto">

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5 mb-6">
            Configure New Campaign
          </h3>

          {formError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm mb-6">
              <AlertCircle className="w-5 h-5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-6">

            {/* Name input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Campaign Name
              </label>
              <input
                type="text"
                placeholder="e.g. June Promotional Offer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Config & List row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Sender (Multi-WABA config)
                </label>
                <div className="relative">
                  <select
                    value={selectedConfigId}
                    onChange={(e) => setSelectedConfigId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">Default Server Config</option>
                    {whatsappConfigs.map(cfg => (
                      <option key={cfg.id} value={cfg.id}>{cfg.name} ({cfg.phone_number_id})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Target Contact List
                </label>
                <div className="relative">
                  <select
                    value={contactListId}
                    onChange={(e) => setContactListId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">Choose a contact list...</option>
                    {contactLists.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.member_count} contacts)</option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Approved Message Template
              </label>
              <div className="relative">
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">Choose an approved template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Template Parameter Mapping Panel */}
            {variables.length > 0 && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/60 dark:border-white/5 rounded-3xl space-y-6">
                  {/* Mapping Header and Profile Loader */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/40 dark:border-white/5 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Map Template Parameters
                        </h4>
                        {(() => {
                          const selectedProfile = savedProfiles.find(p => String(p.id) === String(selectedProfileId));
                          if (selectedProfile) {
                            return (
                              <span className="text-[9px] text-slate-500 font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded flex items-center gap-1.5 animate-in fade-in duration-200">
                                <span>Used {selectedProfile.usage_count || 0}x</span>
                                {selectedProfile.last_used_at && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                    <span>Last: {new Date(selectedProfile.last_used_at).toLocaleDateString()}</span>
                                  </>
                                )}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-[11px] text-slate-400">Map each template variable to a contact column attribute or enter a static placeholder text.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Load Profile:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedProfileId}
                          onChange={(e) => handleProfileChange(e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold pr-8 appearance-none cursor-pointer text-slate-800 dark:text-slate-200"
                        >
                          <option value="">-- Custom / Auto-Match --</option>
                          {savedProfiles.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.mapping_name} {p.is_default ? '(Default)' : ''} {p.usage_count > 0 ? `(${p.usage_count}x)` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      {selectedProfileId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(selectedProfileId)}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-red-200/40 transition-all animate-in fade-in zoom-in-95 duration-200"
                          title="Delete this profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variables Mapping Grid */}
                  <div className="space-y-4">
                    {variables.map((v) => {
                      const rule = mappings[v.variable_name] || { source: 'static', value: '' };
                      return (
                        <div key={v.variable_name} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center border-b border-slate-200/40 dark:border-white/5 pb-4 last:border-b-0 last:pb-0">
                          <div className="text-xs font-bold">
                            <span className="font-mono text-emerald-500 dark:text-emerald-400">{`{{${v.variable_name}}}`}</span>
                            <span className="ml-2 text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              {v.component_type}
                            </span>
                          </div>

                          <div>
                            <select
                              value={rule.source}
                              onChange={(e) => handleMappingChange(v.variable_name, 'source', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                            >
                              <option value="static">Static Value</option>
                              <option value="field">Map to Contact Attribute</option>
                            </select>
                          </div>

                          <div>
                            {rule.source === 'static' ? (
                              <input
                                type="text"
                                placeholder="Enter static text..."
                                value={rule.value}
                                onChange={(e) => handleMappingChange(v.variable_name, 'value', e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400"
                              />
                            ) : (
                              <select
                                value={rule.value}
                                onChange={(e) => handleMappingChange(v.variable_name, 'value', e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                              >
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="company">Company</option>
                                <option value="phone">Phone Number</option>
                                <option value="tags">Tags</option>
                                {customAttributes.map(attr => (
                                  <option key={attr} value={`attr:${attr}`}>{attr} (Custom)</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="flex justify-start sm:justify-end">
                            {(() => {
                              const conf = getMappingConfidence(v.variable_name, rule);
                              return (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${conf.class}`}>
                                  {conf.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Mapping Profile Form */}
                  <div className="p-4 bg-slate-100/50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="shouldSaveMapping"
                        checked={shouldSaveMapping}
                        onChange={(e) => setShouldSaveMapping(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500/20"
                      />
                      <label htmlFor="shouldSaveMapping" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Save Mapping For Future Use
                      </label>
                    </div>

                    {shouldSaveMapping && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                            Profile Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Sales Team Mapping"
                            value={saveMappingName}
                            onChange={(e) => setSaveMappingName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <input
                            type="checkbox"
                            id="isSaveDefault"
                            checked={isSaveDefault}
                            onChange={(e) => setIsSaveDefault(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500/20"
                          />
                          <label htmlFor="isSaveDefault" className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2 cursor-pointer">
                            Set as Default Profile
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Preview Panel */}
                {contactListId && previewContacts.length > 0 && (
                  <div className="p-6 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/60 dark:border-white/5 rounded-3xl space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Mapping Preview (Max 3 Contacts)
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PII Masked</span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200/45 dark:border-white/5 rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200/40 dark:border-white/5 font-bold text-slate-400 uppercase tracking-widest">
                            <th className="p-3 pl-4">Contact Info</th>
                            {variables.map(v => (
                              <th key={v.variable_name} className="p-3 font-mono">
                                {`{{${v.variable_name}}}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                          {previewContacts.map((c, idx) => (
                            <tr key={c.id || idx} className="hover:bg-slate-100/30 dark:hover:bg-white/[0.005]">
                              <td className="p-3 pl-4">
                                <div className="font-bold text-slate-800 dark:text-slate-200">{c.name || 'N/A'}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {maskPhone(c.phone)} {c.email ? `| ${maskEmail(c.email)}` : ''}
                                </div>
                              </td>
                              {variables.map(v => (
                                <td key={v.variable_name} className="p-3 font-medium font-mono text-emerald-500 dark:text-emerald-400">
                                  {resolvePreviewValue(c, v.variable_name) || <span className="text-slate-400 italic">empty</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Scheduling Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Campaign Schedule Type
                </label>
                <div className="relative">
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="broadcast">Instant Broadcast (Immediate)</option>
                    <option value="scheduled">Scheduled (Future Queue)</option>
                    <option value="recurring">Recurring (Periodic Scheduler)</option>
                  </select>
                  <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {campaignType === 'scheduled' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    Scheduled Target Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {campaignType === 'recurring' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Recurring Frequency
                    </label>
                    <div className="relative">
                      <select
                        value={recurringFrequency}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRecurringFrequency(val);
                          if (val === 'daily') setCronExpression('0 9 * * *');
                          else if (val === 'weekly') setCronExpression('0 9 * * 1');
                          else if (val === 'monthly') setCronExpression('0 9 1 * *');
                        }}
                        className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="daily">Daily (9:00 AM)</option>
                        <option value="weekly">Weekly (Monday 9:00 AM)</option>
                        <option value="monthly">Monthly (1st Day 9:00 AM)</option>
                        <option value="custom">Custom Cron Pattern</option>
                      </select>
                      <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Cron Pattern
                    </label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      disabled={recurringFrequency !== 'custom'}
                      placeholder="e.g. 0 9 * * *"
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              {campaignType !== 'broadcast' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                    Schedule Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. UTC or Asia/Kolkata"
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-slate-400">Specify timezone for scheduled execution. Default is your current browser timezone.</p>
                </div>
              )}
            </div>

            {/* Submit Block */}
            <div className="flex flex-wrap gap-4 justify-end pt-6 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleCreateCampaign(false)}
                className="px-6 py-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold rounded-2xl text-xs transition-all disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleCreateCampaign(true)}
                className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {campaignType === 'broadcast' ? 'Send / Queue Now' : 'Schedule Campaign'}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

const StatsCard = ({ label, value, color }) => {
  const colors = {
    blue: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    indigo: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20'
  };
  const colorClass = colors[color] || colors.blue;
  return (
    <div className={`p-6 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col justify-between hover:border-${color}-500/30 transition-all duration-300`}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-black mt-2 text-slate-800 dark:text-white">{value}</span>
    </div>
  );
};

export default WACampaigns;
