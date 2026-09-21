import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, UserCheck, User, Loader, X } from 'lucide-react';

/**
 * Responsive, dark-themed dropdown for assigning a technician to a ticket.
 * - On Mobile (<640px): Renders a clean bottom-sheet modal.
 * - On Desktop (>=640px): Renders a portal dropdown with smart upward/downward auto-positioning.
 */
const TechnicianAssignDropdown = ({ technicians = [], onAssign, loading = false }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 220;
      const menuHeight = 240;
      
      let top = rect.bottom + window.scrollY + 6;
      let left = rect.left + window.scrollX;

      // Smart flip upward if near viewport bottom
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        top = rect.top + window.scrollY - menuHeight - 6;
      }

      // Prevent horizontal overflow
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      left = Math.max(12, left);

      setCoords({ top, left, width: Math.max(menuWidth, rect.width) });
    }
  };

  useEffect(() => {
    if (open && !isMobile) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        (buttonRef.current && buttonRef.current.contains(e.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(e.target))
      ) {
        return;
      }
      setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const availableTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) < 3);
  const busyTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) >= 3);

  const TechListContent = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs px-4 py-4">
          <Loader className="w-4 h-4 animate-spin text-purple-400" />
          <span>Loading active technicians...</span>
        </div>
      ) : technicians.length === 0 ? (
        <p className="text-slate-500 text-xs px-4 py-4 text-center">No active technicians available</p>
      ) : (
        <div className="max-h-[60vh] sm:max-h-[260px] overflow-y-auto divide-y divide-slate-800/50">
          {/* Available technicians (< 3 active tickets) */}
          {availableTechs.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-emerald-400/90 uppercase tracking-widest px-3.5 pt-2.5 pb-1.5 bg-slate-900/60">
                Available (Up to 3 Tickets)
              </p>
              {availableTechs.map((tech) => {
                const count = parseInt(tech.active_tickets || 0);
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => {
                      onAssign(tech.id);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 text-white hover:bg-purple-950/40 active:bg-purple-900/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate font-semibold text-slate-100">{tech.full_name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                      {count}/3
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Busy technicians (3/3 active tickets) */}
          {busyTechs.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-amber-400/90 uppercase tracking-widest px-3.5 pt-2.5 pb-1.5 bg-slate-900/60">
                Max Capacity (3/3 Active)
              </p>
              {busyTechs.map((tech) => {
                const count = parseInt(tech.active_tickets || 0);
                return (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed bg-slate-950/40 opacity-70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <User className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate font-medium">{tech.full_name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 shrink-0">
                      Full ({count}/3)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {availableTechs.length === 0 && busyTechs.length > 0 && (
            <p className="text-amber-400/80 text-xs px-4 py-3 text-center font-medium">
              All technicians are at maximum capacity (3/3)
            </p>
          )}
        </div>
      )}
    </>
  );

  const dropdownMenu = open ? (
    isMobile ? (
      // Mobile Bottom Sheet Portal
      <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 animate-in fade-in duration-200">
        <div
          ref={dropdownRef}
          className="w-full max-w-md bg-slate-950 border-t border-slate-800 rounded-t-2xl p-4 shadow-2xl space-y-3 pb-8"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Assign Technician</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <TechListContent />
        </div>
      </div>
    ) : (
      // Desktop Floating Portal Menu
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          width: `${coords.width}px`,
        }}
        className="z-[9999] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <TechListContent />
      </div>
    )
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-1 text-[11px] rounded-lg py-1.5 px-2 border border-purple-500/40 bg-purple-950/30 text-purple-300 font-semibold w-full min-w-[110px] sm:max-w-[140px] hover:border-purple-400 hover:bg-purple-900/40 transition-all shrink-0 cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {loading ? (
            <Loader className="w-3.5 h-3.5 animate-spin shrink-0 text-purple-400" />
          ) : (
            <User className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          )}
          <span className="truncate text-left text-[11px] font-bold">Select Tech...</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-purple-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && ReactDOM.createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default TechnicianAssignDropdown;
