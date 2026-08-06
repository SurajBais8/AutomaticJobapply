import React, { useState, useEffect } from 'react';
import { AutomationSettings } from '../types/index';
import { fetchSettings, saveSettings } from '../services/api';
import { Sliders, Save, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AutomationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomationSettingsModal: React.FC<AutomationSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AutomationSettings>({
    browserType: 'chrome',
    headless: true,
    maxJobs: 25,
    delayBetweenJobs: 3,
    randomDelay: true,
    timeout: 30000,
    retryCount: 3,
    autoStop: true,
    desktopNotification: true,
    soundNotification: true
  });
  const [loading, setLoading] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings().then(setSettings).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveSettings(settings);
      setSavedMsg(true);
      setTimeout(() => {
        setSavedMsg(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-extrabold tracking-tight">Automation Engine Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {savedMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-md flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* Browser Configuration */}
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Browser & Execution Mode</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Browser Engine</label>
                <select
                  value={settings.browserType}
                  onChange={e => setSettings({ ...settings, browserType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium"
                >
                  <option value="chrome">Chromium (Recommended)</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit (Safari)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Execution Mode</label>
                <select
                  value={settings.headless ? 'headless' : 'headful'}
                  onChange={e => setSettings({ ...settings, headless: e.target.value === 'headless' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium"
                >
                  <option value="headless">Headless (Background)</option>
                  <option value="headful">Headed (Visible Window)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rate Limiting & Speed */}
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Pacing & Limits</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Max Jobs Per Batch</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.maxJobs}
                  onChange={e => setSettings({ ...settings, maxJobs: parseInt(e.target.value) || 25 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Delay Between Jobs (Sec)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.delayBetweenJobs}
                  onChange={e => setSettings({ ...settings, delayBetweenJobs: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={settings.randomDelay}
                onChange={e => setSettings({ ...settings, randomDelay: e.target.checked })}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
              />
              <span className="text-slate-700 font-medium">Add random human jitter delay (1-3s)</span>
            </label>
          </div>

          {/* Safety & Retries */}
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">Error Handling & Safety</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Retry Limit on Failure</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.retryCount}
                  onChange={e => setSettings({ ...settings, retryCount: parseInt(e.target.value) || 3 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Page Timeout (ms)</label>
                <input
                  type="number"
                  step="5000"
                  value={settings.timeout}
                  onChange={e => setSettings({ ...settings, timeout: parseInt(e.target.value) || 30000 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={settings.autoStop}
                onChange={e => setSettings({ ...settings, autoStop: e.target.checked })}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
              />
              <span className="text-slate-700 font-medium">Auto-pause pipeline if 3 consecutive CAPTCHAs occur</span>
            </label>
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
