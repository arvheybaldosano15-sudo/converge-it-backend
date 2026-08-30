import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, UserCheck, User, Loader } from 'lucide-react';

/**
 * Responsive, dark-themed custom dropdown for assigning a technician to a ticket.
 * Uses React Portal to render the dropdown menu at the root level, avoiding any parent clipping or overflow issues.
 */
const TechnicianAssignDropdown = ({ technicians = [], onAssign, loading = false }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      
      // Calculate top/left position considering window scrolling
      let top = rect.bottom + window.scrollY;
      let left = rect.left + window.scrollX;
      const menuWidth = Math.max(180, rect.width);
      
      // Prevent dropdown from overflowing the right side of the viewport
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 12;
      }
      // Ensure left is never negative
      left = Math.max(12, left);

      setCoords({
        top: top + 6, // 6px gap below trigger button
        left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (open) {
      updateCoords();
      // Recalculate on scroll, resize, or orientation change
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        buttonRef.current && buttonRef.current.contains(e.target) ||
        dropdownRef.current && dropdownRef.current.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const availableTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) === 0);
  const busyTechs = technicians.filter((t) => parseInt(t.active_tickets || 0) > 0);

  const dropdownMenu = open ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        minWidth: '180px',
        width: `${Math.max(180, coords.width)}px`,
      }}
      className="z-[9999] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100"
    >
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
                  onClick={() => {
                    onAssign(tech.id);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 text-white hover:bg-slate-800 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{tech.full_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Busy technicians */}
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
                  <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] rounded-lg py-1.5 px-2.5 border border-slate-700 bg-slate-900 text-purple-400 font-semibold w-full sm:max-w-[140px] hover:border-purple-500/60 hover:bg-slate-800 transition-colors"
      >
        {loading ? (
          <Loader className="w-3 h-3 animate-spin shrink-0 text-purple-400" />
        ) : (
          <User className="w-3 h-3 shrink-0 text-purple-400" />
        )}
        <span className="truncate flex-1 text-left">Select Tech...</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Render menu at the document root to bypass clipping */}
      {open && ReactDOM.createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default TechnicianAssignDropdown;
