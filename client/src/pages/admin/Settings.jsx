import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Settings as SettingsIcon, Save, Bot, Shield, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.success) {
          setSettings(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateSetting = async (key, value) => {
    try {
      const res = await api.put(`/settings/${key}`, { value });
      if (res.success) {
        toast.success(`Updated ${key}`);
      }
    } catch (e) {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">System Configuration & Settings</h1>
        <p className="text-xs text-slate-400">Configure global parameters, AI integration, and Messenger settings</p>
      </div>

      <div className="space-y-6">
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" /> Company Info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={settings.company_name || ''}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              onBlur={(e) => handleUpdateSetting('company_name', e.target.value)}
            />
            <Input
              label="Support Email"
              value={settings.company_email || ''}
              onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
              onBlur={(e) => handleUpdateSetting('company_email', e.target.value)}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" /> AI & Messenger Integration Settings
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Enable OpenAI Ticket Automation</p>
                <p className="text-slate-400 text-[11px]">Auto-classify incoming concerns and predict priority</p>
              </div>
              <input
                type="checkbox"
                checked={settings.ai_enabled === 'true'}
                onChange={(e) => {
                  const val = e.target.checked ? 'true' : 'false';
                  setSettings({ ...settings, ai_enabled: val });
                  handleUpdateSetting('ai_enabled', val);
                }}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Enable Meta Messenger Webhook</p>
                <p className="text-slate-400 text-[11px]">Receive and respond to customer Facebook Messenger messages</p>
              </div>
              <input
                type="checkbox"
                checked={settings.messenger_enabled === 'true'}
                onChange={(e) => {
                  const val = e.target.checked ? 'true' : 'false';
                  setSettings({ ...settings, messenger_enabled: val });
                  handleUpdateSetting('messenger_enabled', val);
                }}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
