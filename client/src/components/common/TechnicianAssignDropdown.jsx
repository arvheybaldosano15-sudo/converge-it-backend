import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, UserCheck, User, Loader } from 'lucide-react';

/**
 * Dark-themed custom dropdown for assigning a technician to a ticket.
 * Replaces the native <select> to avoid OS-default grey popup styling.
 *
 * Props:
 *   technicians  - array of { id, full_name, active_tickets }
 *   onAssign     - (technicianId: string) => void
 *   loading      - optional boolean to show a spinner
 */
const TechnicianAssignDropdown = ({ technicians = [], onAssign, loading = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const availableTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) === 0);
  const busyTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) > 0);

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] rounded-lg py-1.5 px-2.5 border border-slate-700 bg-slate-900 text-purple-400 font-semibold max-w-[140px] w-full hover:border-purple-500/60 hover:bg-slate-800 transition-colors"
      >
        {loading ? (
          <Loader className="w-3 h-3 animate-spin shrink-0 text-purple-400" />
        ) : (
          <User className="w-3 h-3 shrink-0 text-purple-400" />
        )}
        <span className="truncate flex-1 text-left">Select Tech...</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[180px] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
          {technicians.length === 0 ? (
            <p className="text-slate-500 text-[11px] px-3 py-2.5 text-center">No active technicians</p>
          ) : (
            <>
              {/* Available technicians */}
              {availableTechs.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-2.5 pb-1">
                    Available
                  </p>
                  {availableTechs.map((tech) => (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => { onAssign(tech.id); setOpen(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 text-white hover:bg-slate-800 transition-colors"
                    >
                      <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{tech.full_name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Busy technicians (disabled) */}
              {busyTechs.length > 0 && (
                <div className={availableTechs.length > 0 ? 'border-t border-slate-800 mt-1 pt-1' : ''}>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1">
                    Busy (Unavailable)
                  </p>
                  {busyTechs.map((tech) => (
                    <div
                      key={tech.id}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-slate-500 cursor-not-allowed opacity-60"
                    >
                      <User className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate flex-1">{tech.full_name}</span>
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 shrink-0">
                        Busy
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {availableTechs.length === 0 && busyTechs.length > 0 && (
                <p className="text-amber-400/80 text-[11px] px-3 pb-2.5 text-center font-medium">
                  All technicians are currently busy
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TechnicianAssignDropdown;
