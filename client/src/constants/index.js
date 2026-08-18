export const ROLES = {
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  INACTIVE: 'inactive',
  REJECTED: 'rejected',
};

export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
};

export const TICKET_STATUS_CONFIG = {
  open: { label: 'Pending', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  on_hold: { label: 'On Hold', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export const TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const TICKET_PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  medium: { label: 'Medium', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  high: { label: 'High', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  critical: { label: 'Critical', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse' },
};

export const TICKET_CATEGORIES = [
  { slug: 'starlink_internet', name: 'Starlink Internet', icon: 'Wifi', color: '#3b82f6' },
  { slug: 'cctv_system', name: 'CCTV System', icon: 'Camera', color: '#8b5cf6' },
  { slug: 'smart_devices', name: 'Smart Devices', icon: 'Cpu', color: '#06b6d4' },
  { slug: 'installation', name: 'Installation Request', icon: 'Wrench', color: '#f59e0b' },
  { slug: 'other', name: 'Other / General Inquiry', icon: 'HelpCircle', color: '#6b7280' },
];
