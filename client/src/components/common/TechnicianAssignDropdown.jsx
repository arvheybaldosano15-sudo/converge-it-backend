import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, UserCheck, User, Loader } from 'lucide-react';

/**
 * Responsive, dark-themed dropdown for assigning or re-assigning a technician to a ticket.
 * - On Mobile (<640px): Uses a styled native HTML <select> element which triggers the OS native picker (100% smooth touch scrolling, native haptics, zero touch traps).
 * - On Desktop (>=640px): Uses a compact custom portal dropdown with smart auto-positioning.
 */
const TechnicianAssignDropdown = ({ technicians = [], currentAssignee = '', onAssign, loading = false }) => {
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

  const availableTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) < 3);
  const busyTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) >= 3);

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

  const handleScroll = (e) => {
    // Prevent inner dropdown list scrolling from re-calculating position and causing re-renders
    if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
      return;
    }
    updateCoords();
  };

  useEffect(() => {
    if (open && !isMobile) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', handleScroll, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', handleScroll, true);
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
    if (open && !isMobile) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [open, isMobile]);

  // MOBILE: Native HTML <select> with premium custom button styling
  if (isMobile) {
    return (
      <div className="relative inline-block w-full min-w-[115px] sm:max-w-[140px] shrink-0">
        <select
          value=""
          disabled={loading || technicians.length === 0}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              onAssign(val);
            }
          }}
          className="w-full appearance-none py-1.5 pl-7 pr-6 text-[11px] font-extrabold rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-950/80 via-slate-900 to-purple-950/80 text-purple-300 shadow-md shadow-purple-950/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap active:scale-[0.98] transition-all"
        >
          <option value="" disabled className="bg-slate-950 text-slate-300 font-bold">
            {loading ? 'Loading...' : (currentAssignee || 'Select Tech...')}
          </option>
          {availableTechs.length > 0 && (
            <optgroup label="Available (Up to 3 Tickets)" className="bg-slate-950 text-emerald-400 font-bold">
              {availableTechs.map((tech) => (
                <option key={tech.id} value={tech.id} className="bg-slate-900 text-slate-100 py-1.5 font-medium">
                  {tech.full_name} ({parseInt(tech.active_tickets || 0)}/3)
                </option>
              ))}
            </optgroup>
          )}
          {busyTechs.length > 0 && (
            <optgroup label="Max Capacity (3/3 Active)" className="bg-slate-950 text-amber-400 font-bold">
              {busyTechs.map((tech) => (
                <option key={tech.id} value={tech.id} disabled className="bg-slate-900 text-slate-500 py-1.5">
                  {tech.full_name} (Full {parseInt(tech.active_tickets || 0)}/3)
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
          {loading ? (
            <Loader className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          ) : currentAssignee ? (
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <User className="w-3.5 h-3.5 text-purple-400" />
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
        </div>
      </div>
    );
  }

  // DESKTOP: Custom floating portal dropdown
  const TechListContent = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs px-4 py-4">
          <Loader className="w-4 h-4 text-purple-400 animate-spin" />
          <span>Loading active technicians...</span>
        </div>
      ) : technicians.length === 0 ? (
        <p className="text-slate-500 text-xs px-4 py-4 text-center">No active technicians available</p>
      ) : (
        <div className="max-h-[240px] overflow-y-auto divide-y divide-slate-800/50">
          {/* Available technicians (< 3 active tickets) */}
          {availableTechs.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-emerald-400/90 uppercase tracking-widest px-3.5 pt-2.5 pb-1.5 bg-slate-900/60 sticky top-0 z-10">
                Available (Up to 3 Tickets)
              </p>
              {availableTechs.map((tech) => {
                const count = parseInt(tech.active_tickets || 0);
                const isCurrent = currentAssignee === tech.full_name;
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => {
                      onAssign(tech.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 text-white hover:bg-purple-950/40 active:bg-purple-900/60 cursor-pointer ${
                      isCurrent ? 'bg-purple-950/60 font-bold border-l-2 border-purple-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserCheck className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-purple-400' : 'text-emerald-400'}`} />
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
              <p className="text-[10px] font-extrabold text-amber-400/90 uppercase tracking-widest px-3.5 pt-2.5 pb-1.5 bg-slate-900/60 sticky top-0 z-10">
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
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
      }}
      className="z-[9999] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/90 overflow-hidden"
    >
      <TechListContent />
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-1 text-[11px] rounded-lg py-1.5 px-2 border font-semibold w-full min-w-[110px] sm:max-w-[140px] shrink-0 cursor-pointer transition-colors ${
          currentAssignee
            ? 'border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900/50'
            : 'border-purple-500/40 bg-purple-950/30 text-purple-300 hover:border-purple-400 hover:bg-purple-900/40'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {loading ? (
            <Loader className="w-3.5 h-3.5 shrink-0 text-purple-400 animate-spin" />
          ) : currentAssignee ? (
            <UserCheck className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          ) : (
            <User className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          )}
          <span className="truncate text-left text-[11px] font-bold">
            {currentAssignee || 'Select Tech...'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-purple-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && ReactDOM.createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default TechnicianAssignDropdown;


