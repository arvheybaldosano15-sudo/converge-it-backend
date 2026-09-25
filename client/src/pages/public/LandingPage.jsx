import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench,
  KeyRound,
  LogIn,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Bot,
  MapPin,
  FileText,
  Activity,
  ArrowRight,
  UserPlus,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Wifi,
  Camera,
  Cpu,
  Smartphone,
  Shield,
  Layers,
  Award,
  Users,
  Headset,
  MessageSquare,
  ChevronRight,
  Check
} from 'lucide-react';

import Modal from '../../components/common/Modal';
import InstallPwaButton from '../../components/common/InstallPwaButton';
import Login from '../auth/Login';
import TechnicianPinLogin from '../auth/TechnicianPinLogin';
import TechnicianSignUp from '../auth/TechnicianSignUp';

const LandingPage = () => {
  const navigate = useNavigate();

  // Modal States
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [trackTicketId, setTrackTicketId] = useState('');

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackTicketId.trim()) {
      navigate(`/track?ticketId=${encodeURIComponent(trackTicketId.trim())}`);
    } else {
      navigate('/track');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f1e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1e_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Ambient Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Top Header Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

          {/* Mobile: compact logo on the left */}
          <div className="md:hidden shrink-0 rounded-lg bg-white/95 px-2 py-1 flex items-center justify-center shadow-md cursor-pointer" style={{height: '36px', minWidth: '80px'}} onClick={() => navigate('/')}>
            <img src="/CSiLogo.png" alt="Converge IT Solutions Logo" className="h-6 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>

          {/* Desktop: Logo sits right beside nav links (near Services) */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-300">
            {/* Logo inline with nav */}
            <div className="shrink-0 rounded-xl bg-white/95 px-2.5 py-1.5 shadow-lg shadow-cyan-500/20 border border-white/20 flex items-center justify-center cursor-pointer mr-2" style={{minWidth: '120px', height: '44px'}} onClick={() => navigate('/')}>
              <img
                src="/CSiLogo.png"
                alt="Converge IT Solutions Logo"
                className="h-8 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            {/* Nav Links */}
            <a href="#services" className="hover:text-cyan-400 transition-colors">Services</a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <Link to="/kb" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              Knowledge Base
            </Link>
            <Link to="/track" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              Track Ticket
            </Link>
          </nav>

          {/* Action Buttons in Navbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <InstallPwaButton variant="navbar" />

            {/* Admin/User Sign In */}
            <button
              onClick={() => setIsLoginOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-20 sm:space-y-28 relative z-10">

        {/* ── 1. HERO SECTION ── */}
        <section className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto pt-2 sm:pt-6">
          {/* Animated Announcement Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wide shadow-inner shadow-cyan-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>Automated Messenger Ticketing & GPS Field Dispatch</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black font-display text-white tracking-tight leading-[1.15]"
          >
            Smart Mobile Ticketing & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
              Instant Technician Dispatch
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Empowering Converge IT Solutions with automated Facebook Messenger ticket creation, Starlink & CCTV installation management, real-time SLA tracking, and GPS service reports.
          </motion.p>

          {/* 🔍 Quick Ticket Reference Tracker Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-4 max-w-xl mx-auto"
          >
            <form onSubmit={handleTrackSubmit} className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl">
              <div className="pl-3 text-cyan-400 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Enter Ticket Reference ID (e.g. TKT-100293)..."
                value={trackTicketId}
                onChange={(e) => setTrackTicketId(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none px-2 font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                <span>Track Ticket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Customers can check live dispatch status, assigned technician, and resolution progress anytime.
            </p>
          </motion.div>

          {/* Quick Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black text-white font-display block">99.8%</span>
              <span className="text-[11px] text-slate-400 font-bold">SLA Compliance</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black text-cyan-400 font-display block">&lt; 15 min</span>
              <span className="text-[11px] text-slate-400 font-bold">Critical Dispatch</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-display block">100%</span>
              <span className="text-[11px] text-slate-400 font-bold">GPS Verified</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-xl sm:text-2xl font-black text-blue-400 font-display block">24 / 7</span>
              <span className="text-[11px] text-slate-400 font-bold">Botcake AI Active</span>
            </div>
          </motion.div>
        </section>

        {/* ── 2. SERVICES PORTFOLIO ── */}
        <section id="services" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
              Supported Service Categories
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Converge IT Solutions provides end-to-end installation, technical maintenance, and field support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Starlink Internet */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white font-display mb-1.5">Starlink Internet</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-4">
                Satellite dish alignment, router setup, high-speed fiber connectivity, and outage troubleshooting.
              </p>
              <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                <span>SLA Target: 8 Hours</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* CCTV System */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white font-display mb-1.5">CCTV Systems</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-4">
                Surveillance camera installation, NVR/DVR configuration, live remote viewing setup, and maintenance.
              </p>
              <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                <span>SLA Target: 12 Hours</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Smart Devices */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white font-display mb-1.5">Smart Home & IoT</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-4">
                Smart automation devices, biometric locks, network access points, and hardware integration.
              </p>
              <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                <span>SLA Target: 16 Hours</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Installation Request */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white font-display mb-1.5">Installation Requests</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium mb-4">
                New customer service applications, site survey assessments, cable laying, and initial activation.
              </p>
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span>SLA Target: 24 Hours</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. CORE ECOSYSTEM FEATURES ── */}
        <section id="features" className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
              Powerful Field Service Features
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Engineered for seamless communication between customers, support agents, and field engineers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1: Botcake Messenger Automation */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-display">
                  Automated Messenger & Botcake AI Integration
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Customers submit inquiries directly on Facebook Messenger. The Botcake webhook automatically verifies customer account numbers, classifies problem urgency, and generates support tickets with instant real-time socket updates.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Instant Account Number Verification (`ACC-XXXXX`)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>AI Priority Classification & Resolution Hour Estimation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Automated Messenger Confirmation Reply</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2: Technician PIN Portal */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-display">
                  Technician Mobile PIN Portal & PWA
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Field technicians log in with a fast 6-digit PIN code on mobile devices. Installable as a Progressive Web App (PWA) with zero-loading cached UI for offline availability on remote job sites.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Fast 6-Digit PIN Security Access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>3-Active Work Order Assignment Enforcement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Offline PWA Caching & Instant Service Report Filing</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3: GPS Service Reports & Customer Sign-off */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-display">
                  GPS Verification & Digital Signatures
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Every completed service report includes automatically captured GPS latitude/longitude coordinates, high-resolution photo attachments of installed equipment, and digital touch-screen customer signatures.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>On-Site GPS Geolocation Verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Multiple Work Completion Photo Uploads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Digital Canvas Customer Touch Signature Capture</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 4: Real-time Admin Dashboard & SLA Engine */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white font-display">
                  SLA Monitoring & Separate Ticket Workflows
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Intelligent separation between Installation Requests and Support Tickets Management. Admins receive real-time navbar alerts categorized with explicit badges for immediate dispatch.
                </p>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Dedicated Installation Requests Management Portal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Real-Time Socket Notifications with Category Badges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>SLA Breach Warning & Countdown Monitors</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. QUICK ACCESS ACTION PORTALS ── */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
              Select Your Access Portal
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Choose your role below to launch your system workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Admin & Support Staff */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">System Administrators</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Full control over ticket dispatch, technician workload management, category configuration, and PDF reporting.
                </p>
              </div>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Admin Sign In</span>
              </button>
            </div>

            {/* Field Service Technicians */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/60 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Field Service Technicians</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Fast 6-digit PIN login, view assigned installation & repair jobs, update work status, and submit service reports.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPinOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-xs font-bold text-blue-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>PIN Login</span>
                </button>
                <button
                  onClick={() => setIsSignUpOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            </div>

            {/* Customers Self-Service */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Headset className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">Customer Self-Service</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Track your pending ticket status online or read troubleshooting guides in our public knowledge base.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/track"
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Track Ticket</span>
                </Link>
                <Link
                  to="/kb"
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Help Base</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* System Operational Status Footer Bar */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white font-display">Converge IT Solutions Server Status: Operational</h4>
              <p className="text-xs text-slate-400">Live WebSockets, Supabase Database, and Botcake Webhooks connected.</p>
            </div>
          </div>
          <Link
            to="/kb"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Customer Knowledge Base</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/90 py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Converge IT Solutions Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/kb" className="hover:text-cyan-400 transition-colors">Knowledge Base</Link>
            <Link to="/track" className="hover:text-cyan-400 transition-colors">Track Ticket</Link>
          </div>
        </div>
      </footer>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* 1. Admin/User Sign In Modal */}
      <Modal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        maxWidth="max-w-md"
        noBackdrop={true}
      >
        <Login
          isModal={true}
          onClose={() => setIsLoginOpen(false)}
          onOpenPinModal={() => {
            setIsLoginOpen(false);
            setIsPinOpen(true);
          }}
          onOpenSignUpModal={() => {
            setIsLoginOpen(false);
            setIsSignUpOpen(true);
          }}
        />
      </Modal>

      {/* 2. Technician PIN Login Modal */}
      <Modal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        maxWidth="max-w-md"
        noBackdrop={true}
      >
        <TechnicianPinLogin isModal={true} onClose={() => setIsPinOpen(false)} />
      </Modal>

      {/* 3. Technician Registration Modal */}
      <Modal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        maxWidth="max-w-xl"
        noBackdrop={true}
      >
        <TechnicianSignUp isModal={true} onClose={() => setIsSignUpOpen(false)} />
      </Modal>
    </div>
  );
};

export default LandingPage;
