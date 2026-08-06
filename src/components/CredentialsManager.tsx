import React, { useState, useEffect } from 'react';
import { SiteCredential, WebsiteConfig } from '../types/index';
import { fetchCredentials, saveCredential, deleteCredential } from '../services/api';
import { KeyRound, Lock, CheckCircle2, AlertCircle, ShieldCheck, Eye, EyeOff, Trash2, RefreshCw, Save } from 'lucide-react';

interface CredentialsManagerProps {
  websites: WebsiteConfig[];
}

export const CredentialsManager: React.FC<CredentialsManagerProps> = ({ websites }) => {
  const [credentials, setCredentials] = useState<SiteCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSiteId, setSavingSiteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, { email: string; password: string; rememberMe: boolean }>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCreds = async () => {
    setLoading(true);
    try {
      const data = await fetchCredentials();
      setCredentials(data);

      // Populate form data if credentials exist
      const initialForm: Record<string, { email: string; password: string; rememberMe: boolean }> = {};
      data.forEach(c => {
        initialForm[c.id] = {
          email: c.email || '',
          password: '••••••••••••', // Masked placeholder
          rememberMe: c.rememberMe !== false
        };
      });
      setFormData(prev => ({ ...initialForm, ...prev }));
    } catch (err) {
      console.error('Error loading credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreds();
  }, []);

  const handleInputChange = (siteId: string, field: 'email' | 'password' | 'rememberMe', value: any) => {
    setFormData(prev => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || { email: '', password: '', rememberMe: true }),
        [field]: value
      }
    }));
  };

  const toggleShowPassword = (siteId: string) => {
    setShowPassword(prev => ({ ...prev, [siteId]: !prev[siteId] }));
  };

  const handleSave = async (siteId: string, siteName: string) => {
    const input = formData[siteId];
    if (!input || !input.email || !input.password || input.password === '••••••••••••') {
      alert('Please enter a valid email and new password to save credentials.');
      return;
    }

    setSavingSiteId(siteId);
    try {
      await saveCredential({
        websiteId: siteId,
        websiteName: siteName,
        email: input.email,
        password: input.password,
        rememberMe: input.rememberMe
      });
      setSuccessMsg(`Credentials for ${siteName} saved & encrypted securely!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadCreds();
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingSiteId(null);
    }
  };

  const handleDelete = async (siteId: string, siteName: string) => {
    if (!confirm(`Are you sure you want to delete stored credentials & session for ${siteName}?`)) {
      return;
    }
    try {
      await deleteCredential(siteId);
      setFormData(prev => {
        const next = { ...prev };
        delete next[siteId];
        return next;
      });
      await loadCreds();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const getStatusBadge = (cred?: SiteCredential) => {
    if (!cred || cred.status === 'Not Logged In') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
          <AlertCircle className="w-3 h-3 text-slate-400" />
          Not Saved
        </span>
      );
    }
    if (cred.status === 'Connected') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Connected & Saved Session
        </span>
      );
    }
    if (cred.status === 'Expired') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          Session Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
        <Lock className="w-3 h-3 text-blue-600" />
        Credentials Saved
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-lg text-white">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              Credentials Manager
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                AES-256 Encrypted
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Enter your login credentials ONCE. The automation engine encrypts passwords and saves session cookies for 1-click auto logins.
            </p>
          </div>
        </div>
        <button
          onClick={loadCreds}
          className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-md text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid of Credentials per Website */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {websites.map(site => {
          const cred = credentials.find(c => c.id === site.id);
          const form = formData[site.id] || { email: '', password: '', rememberMe: true };
          const isShowPass = !!showPassword[site.id];
          const isSaving = savingSiteId === site.id;

          return (
            <div
              key={site.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-700">
                    {site.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{site.name}</h3>
                    <p className="text-[11px] text-slate-500">{site.domain}</p>
                  </div>
                </div>
                {getStatusBadge(cred)}
              </div>

              {/* Form Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email / Username</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => handleInputChange(site.id, 'email', e.target.value)}
                    placeholder={`your.email@${site.domain}`}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Password</span>
                    <span className="text-[10px] text-slate-400 font-normal">Encrypted on save</span>
                  </label>
                  <div className="relative">
                    <input
                      type={isShowPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => handleInputChange(site.id, 'password', e.target.value)}
                      placeholder="Enter password"
                      className="w-full text-xs px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(site.id)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {isShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={form.rememberMe}
                      onChange={e => handleInputChange(site.id, 'rememberMe', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>Remember session cookies</span>
                  </label>

                  {cred && (
                    <button
                      onClick={() => handleDelete(site.id, site.name)}
                      title="Clear stored credentials"
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  onClick={() => handleSave(site.id, site.name)}
                  disabled={isSaving}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Encrypting & Saving...' : 'Save Credentials'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
