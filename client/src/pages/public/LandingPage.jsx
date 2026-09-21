import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench,
  KeyRound,
  LogIn,
  Search,
  CheckCircle,
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
  ExternalLink
} from 'lucide-react';

import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
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

      {/* Header Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <img src="/CSiLogo.png" alt="Converge IT Logo" className="w-7 h-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                <Wrench className="w-5 h-5 text-cyan-400 hidden" />
              </div>
            </div>
            <div>
              <span className="text-base sm:text-lg font-extrabold font-display tracking-tight text-white block leading-tight">
                Converge IT <span className="text-cyan-400">Solutions</span>
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block">
                Mobile Ticketing & Dispatch System
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <InstallPwaButton className="hidden sm:inline-flex" />

            <button
              onClick={() => setIsPinOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs sm:text-sm font-bold text-cyan-300 hover:text-cyan-200 transition-all active:scale-95 shadow-sm"
            >
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>PIN Portal</span>
            </button>

            <button
              onClick={() => setIsLoginOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 sm:space-y-24 relative z-10">
        <section className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto pt-4 sm:pt-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>Automated Field Service & Installation Management</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black font-display text-white tracking-tight leading-tight sm:leading-none"
          >
            Smart Mobile Support & <br className="hidden sm:inline" />
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
            Unified ticketing, real-time SLA tracking, GPS service reports, and automated Messenger notifications for Converge IT Solutions.
          </motion.p>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2"
          >
            <button
              onClick={() => setIsLoginOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-extrabold text-white shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPinOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-sm font-bold text-cyan-300 hover:text-white transition-all active:scale-95 shadow-md"
            >
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Technician PIN Portal</span>
            </button>

            <button
              onClick={() => setIsSignUpOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 text-sm font-bold text-slate-300 hover:text-cyan-300 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-slate-400" />
              <span>Register Technician</span>
            </button>
          </motion.div>

          {/* Quick Ticket Tracker Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-6 max-w-xl mx-auto"
          >
            <form onSubmit={handleTrackSubmit} className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-xl">
              <div className="pl-3 text-cyan-400 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Enter Ticket Reference ID (e.g. TICK-1002)..."
                value={trackTicketId}
                onChange={(e) => setTrackTicketId(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none px-2"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition-all shrink-0 active:scale-95"
              >
                Track Ticket
              </button>
            </form>
          </motion.div>
        </section>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-slate-900/70 border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white font-display mb-2">Automated Dispatch</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Instant request routing for installation and technical repair requests with category auto-matching.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900/70 border-slate-800/80 hover:border-blue-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white font-display mb-2">Technician PIN Portal</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Field technicians log in with a fast 6-digit PIN code on mobile devices for zero-delay ticket resolution.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900/70 border-slate-800/80 hover:border-emerald-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white font-display mb-2">GPS Service Reports</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              On-site GPS verification, work completion photo uploads, and customer digital signature captures.
            </p>
          </Card>

          <Card className="p-6 bg-slate-900/70 border-slate-800/80 hover:border-amber-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white font-display mb-2">Botcake Messenger</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Automated Messenger integration pushes real-time status updates directly to customers on Facebook.
            </p>
          </Card>
        </section>

        {/* System Status Banner */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white font-display">System Status: All Services Operational</h4>
              <p className="text-xs text-slate-400">Real-time socket engine, API endpoints, and PWA cache are active.</p>
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
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Converge IT Solutions Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/kb" className="hover:text-cyan-400 transition-colors">Knowledge Base</Link>
            <Link to="/track" className="hover:text-cyan-400 transition-colors">Track Ticket</Link>
          </div>
        </div>
      </footer>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* 1. Sign In Modal */}
      <Modal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="py-2">
          <Login />
        </div>
      </Modal>

      {/* 2. Technician PIN Login Modal */}
      <Modal
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="py-2">
          <TechnicianPinLogin isModal={true} onClose={() => setIsPinOpen(false)} />
        </div>
      </Modal>

      {/* 3. Technician Registration Modal */}
      <Modal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        maxWidth="max-w-xl"
      >
        <div className="py-2">
          <TechnicianSignUp isModal={true} onClose={() => setIsSignUpOpen(false)} />
        </div>
      </Modal>
    </div>
  );
};

export default LandingPage;
