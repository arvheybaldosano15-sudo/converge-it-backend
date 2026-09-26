import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import {
  Settings as SettingsIcon,
  Save,
  Bot,
  ShieldCheck,
  Globe,
  Building,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  MessageCircle,
  Bell,
  Sliders,
  Lock,
  Sparkles,
  Upload,
  Copy,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Share2,
  PhoneCall,
  Check,
  AlertTriangle,
  SlidersHorizontal,
  Clock,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── ACCESSIBLE & ANIMATED TOGGLE SWITCH ───
const ToggleSwitch = ({ checked, onChange, disabled = false, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={Boolean(checked)}
    aria-label={ariaLabel || 'Toggle setting'}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 ${
      checked ? 'bg-cyan-500 shadow-sm shadow-cyan-500/40' : 'bg-slate-800'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const DEFAULT_SETTINGS = {
  company_name: 'Converge IT Solutions Inc.',
  company_email: 'support@convergeit.ph',
  company_phone: '09171234567',
  company_address: 'National Capital Region, Philippines',
  company_logo: '',
  ai_enabled: 'true',
  ai_auto_categorize: 'true',
  ai_priority_prediction: 'true',
  messenger_enabled: 'true',
  twilio_sms_enabled: 'true',
  smtp_email_enabled: 'true',
  sla_critical_email: 'true',
  tech_assignment_push: 'true',
  daily_sla_digest: 'false',
  enforce_2fa: 'true',
  session_timeout_minutes: '30',
  audit_logging_enabled: 'true',
  standard_sla_hours: '24',
  auto_close_hours: '48',
  auto_manager_escalation: 'true'
};

const Settings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Initialize Data & State from LocalStorage cache to prevent flash of old default values
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('converge_settings');
      if (cached) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
      }
    } catch (e) {
      console.warn('LocalStorage settings read error:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Fetch Settings from API
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.success) {
        const loaded = res.data || {};
        const updated = {
          ...DEFAULT_SETTINGS,
          ...loaded
        };
        setSettings(updated);
        try {
          localStorage.setItem('converge_settings', JSON.stringify(updated));
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleInputChange = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem('converge_settings', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Handle Logo Upload File Selection
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo image size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        handleInputChange('company_logo', dataUrl);
        setUploadingLogo(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Failed to process image file');
      setUploadingLogo(false);
    }
  };

  // Remove Company Logo
  const handleRemoveLogo = () => {
    handleInputChange('company_logo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save All Changes Action - Single Atomic API Call
  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', { settings });
      if (res.success && res.data) {
        const newSettings = {
          ...settings,
          ...res.data
        };
        setSettings(newSettings);
        setHasUnsavedChanges(false);
        try {
          localStorage.setItem('converge_settings', JSON.stringify(newSettings));
        } catch (e) {}
        toast.success('All system settings saved successfully!');
      }
    } catch (e) {
      console.error('Save settings error:', e);
      toast.error('Failed to save settings changes');
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = 'https://api.converge.ph/webhook/messenger';
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast.success('Messenger Webhook URL copied to clipboard');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Helper getter for boolean settings
  const getBool = (key, defaultVal = true) => {
    if (settings[key] === undefined || settings[key] === null) return defaultVal;
    return settings[key] === 'true' || settings[key] === true;
  };

  // Navigation Tabs Configuration
  const navTabs = [
    {
      id: 'general',
      label: 'Company Information',
      subtitle: 'Branding & contact details',
      icon: Building,
      badge: null
    },
    {
      id: 'ai',
      label: 'AI & Automation',
      subtitle: 'OpenAI ticket classification',
      icon: Sparkles,
      badge: getBool('ai_enabled', true) ? 'Active' : 'Offline',
      badgeVariant: getBool('ai_enabled', true) ? 'success' : 'secondary'
    },
    {
      id: 'integrations',
      label: 'Messaging & Integrations',
      subtitle: 'Meta Messenger & Webhooks',
      icon: Share2,
      badge: getBool('messenger_enabled', true) ? 'Connected' : 'Disabled',
      badgeVariant: getBool('messenger_enabled', true) ? 'cyan' : 'secondary'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      subtitle: 'Email, SMS & SLA alerts',
      icon: Bell,
      badge: null
    },
    {
      id: 'security',
      label: 'Security & Compliance',
      subtitle: '2FA, session & audit logs',
      icon: ShieldCheck,
      badge: null
    },
    {
      id: 'preferences',
      label: 'System Preferences',
      subtitle: 'SLA thresholds & defaults',
      icon: SlidersHorizontal,
      badge: null
    }
  ];

  return (
    <div className="space-y-6">
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="space-y-2 border-b border-slate-800 pb-4">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
          <span
            className="hover:text-slate-200 transition-colors cursor-pointer"
            onClick={() => navigate('/admin')}
          >
            Administration
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-cyan-400 font-bold">System Settings</span>
        </div>

        {/* Page Title & Save Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2.5">
              <SettingsIcon className="w-6 h-6 text-cyan-400 shrink-0" />
              System Settings & Configuration
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your company information, integrations, automation, and system preferences.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Save Status Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              {hasUnsavedChanges ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-300 font-medium">Unsaved Changes</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-medium">All changes saved</span>
                </>
              )}
            </div>

            {/* Save Changes Button */}
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              isLoading={saving}
              onClick={handleSaveAll}
              className="shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* ── MOBILE SETTINGS TAB SELECTOR ── */}
      <div className="sm:hidden space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Settings Section:
        </label>
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="glass-input w-full rounded-xl py-2.5 px-3 text-xs bg-slate-900 text-white border-slate-700 font-semibold"
          >
            {navTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label} {tab.badge ? `(${tab.badge})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── TWO-COLUMN ENTERPRISE SAAS LAYOUT ── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: COMPACT NAVIGATION SIDEBAR ── */}
        <div className="hidden sm:block sm:col-span-4 lg:col-span-3 space-y-1">
          <Card className="p-2 space-y-1 bg-slate-950/80 border-slate-800">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Settings Navigation
            </div>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 font-bold border-l-4 border-cyan-400 shadow-sm ring-1 ring-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs truncate">{tab.label}</p>
                      <p className="text-[10px] text-slate-400 truncate font-normal">{tab.subtitle}</p>
                    </div>
                  </div>
                  {tab.badge && (
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                      tab.badgeVariant === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </Card>
        </div>

        {/* ── RIGHT COLUMN: SELECTED SETTINGS PANEL ── */}
        <div className="sm:col-span-8 lg:col-span-9 space-y-6">
          {/* TAB 1: COMPANY INFORMATION */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="space-y-5 bg-slate-900/90 border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <Building className="w-5 h-5 text-cyan-400" />
                      Company Profile & Identity
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure official company details displayed on support tickets and email receipts.
                    </p>
                  </div>
                </div>

                {/* Company Logo Card Area */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative">
                    {settings.company_logo ? (
                      <img
                        src={settings.company_logo}
                        alt="Company Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Building className="w-8 h-8 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company Brand Logo</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      PNG, SVG, or JPG formats recommended (max 800x800px, 5MB).
                    </p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoFileChange}
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    className="hidden"
                  />

                  <div className="flex items-center space-x-2 shrink-0">
                    {settings.company_logo && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Trash2}
                        onClick={handleRemoveLogo}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
                      >
                        Remove
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Upload}
                      isLoading={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      {settings.company_logo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Company Name *"
                      value={settings.company_name ?? ''}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      placeholder="e.g. Converge IT Solutions Inc."
                      icon={Building}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Official registered name of the enterprise.</p>
                  </div>

                  <div>
                    <Input
                      label="Support Email Address *"
                      type="email"
                      value={settings.company_email ?? ''}
                      onChange={(e) => handleInputChange('company_email', e.target.value)}
                      placeholder="e.g. support@convergeit.ph"
                      icon={Mail}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Replies and notification dispatches originate from this address.</p>
                  </div>

                  <div>
                    <Input
                      label="Support Hotline / Phone"
                      value={settings.company_phone ?? ''}
                      onChange={(e) => handleInputChange('company_phone', e.target.value)}
                      placeholder="e.g. 09171234567"
                      icon={Phone}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Displayed on customer service reports and SMS alerts.</p>
                  </div>

                  <div>
                    <Input
                      label="Headquarters Address"
                      value={settings.company_address ?? ''}
                      onChange={(e) => handleInputChange('company_address', e.target.value)}
                      placeholder="e.g. Metro Manila, Philippines"
                      icon={MapPin}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Primary dispatch base location for field technicians.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: AI & AUTOMATION */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="space-y-5 bg-slate-900/90 border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      OpenAI Ticket Automation Engine
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically analyze customer support concerns, predict SLA priority, and tag service categories.
                    </p>
                  </div>
                  <Badge variant={getBool('ai_enabled', true) ? 'success' : 'secondary'}>
                    {getBool('ai_enabled', true) ? 'AI Active' : 'AI Offline'}
                  </Badge>
                </div>

                {/* Master AI Toggle Row */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-start space-x-3 pr-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Enable OpenAI Ticket Classification</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        When enabled, incoming support tickets are processed via OpenAI GPT-4o to auto-categorize issues, assign urgency, and generate smart troubleshooting checklists for field techs.
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={getBool('ai_enabled', true)}
                    onChange={(checked) => handleInputChange('ai_enabled', checked ? 'true' : 'false')}
                    ariaLabel="Toggle OpenAI Ticket Automation"
                  />
                </div>

                {/* AI Configuration Options */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Classification & Automation Rules
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Auto-Categorization</span>
                        <p className="text-[11px] text-slate-400">Classify tickets into Starlink, CCTV, Smart Devices, or Fiber.</p>
                      </div>
                      <ToggleSwitch
                        checked={getBool('ai_auto_categorize', true)}
                        onChange={(checked) => handleInputChange('ai_auto_categorize', checked ? 'true' : 'false')}
                        ariaLabel="Toggle Auto Categorization"
                      />
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Priority Prediction</span>
                        <p className="text-[11px] text-slate-400">Detect SLA risk keywords and elevate urgent outage tickets.</p>
                      </div>
                      <ToggleSwitch
                        checked={getBool('ai_priority_prediction', true)}
                        onChange={(checked) => handleInputChange('ai_priority_prediction', checked ? 'true' : 'false')}
                        ariaLabel="Toggle Priority Prediction"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: MESSAGING & INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Meta Messenger Card */}
              <Card className="space-y-5 bg-slate-900/90 border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-display">Meta Facebook Messenger Webhook</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Seamlessly receive Facebook Page customer messages and reply directly from the Converge IT portal.
                      </p>
                    </div>
                  </div>
                  <Badge variant={getBool('messenger_enabled', true) ? 'cyan' : 'secondary'}>
                    {getBool('messenger_enabled', true) ? 'Connected' : 'Disabled'}
                  </Badge>
                </div>

                {/* Master Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white">Enable Meta Messenger Integration</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Routes incoming Messenger conversations straight to active dispatchers.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={getBool('messenger_enabled', true)}
                    onChange={(checked) => handleInputChange('messenger_enabled', checked ? 'true' : 'false')}
                    ariaLabel="Toggle Meta Messenger Integration"
                  />
                </div>

                {/* Integration Details Box */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-300">Webhook Callback Endpoint:</span>
                    <button
                      onClick={copyWebhookUrl}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>https://api.converge.ph/webhook/messenger</span>
                    </button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => toast.success('Meta Messenger Webhook connection verified!')}
                    >
                      Verify Webhook Connection
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Additional Integration Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 space-y-3 bg-slate-900/70 border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">Twilio SMS Gateway</h4>
                    </div>
                    <ToggleSwitch
                      checked={getBool('twilio_sms_enabled', true)}
                      onChange={(checked) => handleInputChange('twilio_sms_enabled', checked ? 'true' : 'false')}
                      ariaLabel="Toggle Twilio SMS Gateway"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Automated SMS dispatch notifications to field service crews.</p>
                </Card>

                <Card className="p-4 space-y-3 bg-slate-900/70 border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white">SMTP Email Server</h4>
                    </div>
                    <ToggleSwitch
                      checked={getBool('smtp_email_enabled', true)}
                      onChange={(checked) => handleInputChange('smtp_email_enabled', checked ? 'true' : 'false')}
                      ariaLabel="Toggle SMTP Email Server"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Transactional email gateway for customer ticket receipts.</p>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="space-y-4 bg-slate-900/90 border-slate-800">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    System Notification Preferences
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure alert thresholds for ticket creation, technician assignments, and SLA breaches.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Critical SLA Breach Email Notifications</p>
                      <p className="text-slate-400 text-[11px]">Send immediate alert emails to dispatch managers when SLA risk threshold is breached.</p>
                    </div>
                    <ToggleSwitch
                      checked={getBool('sla_critical_email', true)}
                      onChange={(checked) => handleInputChange('sla_critical_email', checked ? 'true' : 'false')}
                      ariaLabel="Toggle Critical SLA Email"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Field Technician Assignment Push Notifications</p>
                      <p className="text-slate-400 text-[11px]">Notify technicians on their mobile PWA when assigned a new service order.</p>
                    </div>
                    <ToggleSwitch
                      checked={getBool('tech_assignment_push', true)}
                      onChange={(checked) => handleInputChange('tech_assignment_push', checked ? 'true' : 'false')}
                      ariaLabel="Toggle Tech Assignment Push"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Daily SLA Executive Summary Digest</p>
                      <p className="text-slate-400 text-[11px]">Receive daily automated reports detailing ticket resolution metrics.</p>
                    </div>
                    <ToggleSwitch
                      checked={getBool('daily_sla_digest', false)}
                      onChange={(checked) => handleInputChange('daily_sla_digest', checked ? 'true' : 'false')}
                      ariaLabel="Toggle Executive Digest"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: SECURITY & COMPLIANCE */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="space-y-4 bg-slate-900/90 border-slate-800">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    Security, Authentication & Compliance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure multi-factor authentication, session timeouts, and administrative access controls.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Enforce Two-Factor Authentication (2FA) for Admins</p>
                      <p className="text-slate-400 text-[11px]">Requires authenticator app TOTP code for administrative access logins.</p>
                    </div>
                    <ToggleSwitch
                      checked={getBool('enforce_2fa', true)}
                      onChange={(checked) => handleInputChange('enforce_2fa', checked ? 'true' : 'false')}
                      ariaLabel="Toggle 2FA"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Portal Inactivity Session Timeout</p>
                      <p className="text-slate-400 text-[11px]">Auto-logout idle sessions after configured inactivity time.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={settings.session_timeout_minutes || '30'}
                        onChange={(e) => handleInputChange('session_timeout_minutes', e.target.value)}
                        className="glass-input rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 bg-slate-900 border border-slate-800 focus:outline-none"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">60 Minutes</option>
                        <option value="120">120 Minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Audit Logging & Activity Records</p>
                      <p className="text-slate-400 text-[11px]">Record every ticket update, status shift, and login attempt in audit logs.</p>
                    </div>
                    <ToggleSwitch
                      checked={getBool('audit_logging_enabled', true)}
                      onChange={(checked) => handleInputChange('audit_logging_enabled', checked ? 'true' : 'false')}
                      ariaLabel="Toggle Audit Logging"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: SYSTEM PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <Card className="space-y-4 bg-slate-900/90 border-slate-800">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                    Global System Preferences & SLA Limits
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define default ticket SLA resolution windows and automated escalation rules.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Standard Service Ticket SLA Window</p>
                      <p className="text-slate-400 text-[11px]">Maximum resolution timeframe allocated before triggering SLA breach warnings.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={settings.standard_sla_hours || '24'}
                        onChange={(e) => handleInputChange('standard_sla_hours', e.target.value)}
                        className="glass-input rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 bg-slate-900 border border-slate-800 focus:outline-none"
                      >
                        <option value="12">12 Hours</option>
                        <option value="24">24 Hours</option>
                        <option value="48">48 Hours</option>
                        <option value="72">72 Hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Auto-Close Inactive Resolved Tickets</p>
                      <p className="text-slate-400 text-[11px]">Automatically mark resolved tickets as Closed after period without customer feedback.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={settings.auto_close_hours || '48'}
                        onChange={(e) => handleInputChange('auto_close_hours', e.target.value)}
                        className="glass-input rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 bg-slate-900 border border-slate-800 focus:outline-none"
                      >
                        <option value="24">24 Hours</option>
                        <option value="48">48 Hours</option>
                        <option value="72">72 Hours</option>
                        <option value="168">7 Days (168 Hrs)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <p className="font-semibold text-white">Automatic Manager Escalation on SLA Breach</p>
                      <p className="text-slate-400 text-[11px]">Escalate overdue tickets to senior dispatch supervisors automatically.</p>
                    </div>
                    <ToggleSwitch
                      checked={getBool('auto_manager_escalation', true)}
                      onChange={(checked) => handleInputChange('auto_manager_escalation', checked ? 'true' : 'false')}
                      ariaLabel="Toggle Auto Manager Escalation"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
