// TypeScript Definitions for TanStack Query Caching & Validation

export type UserRole = 'admin' | 'technician' | 'customer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeId?: string;
  contactNumber?: string;
  specialization?: string;
  department?: string;
  isApproved?: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  customer_name?: string;
  customer_contact?: string;
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  serviceReport?: ServiceReport;
}

export interface ServiceReport {
  id: string;
  ticket_id: string;
  technician_id: string;
  title: string;
  work_performed: string;
  materials_used?: string;
  completion_notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_address?: string;
  images_urls?: string[];
  signature_url?: string;
  customer_name_signed?: string;
  is_complete: boolean;
  created_at: string;
}

export interface KBArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category: string;
  helpful_count: number;
  created_at: string;
}

export interface AnalyticsOverview {
  tickets?: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    avg_resolution_hours: number;
  };
  technicians?: {
    total: number;
    active: number;
    pending: number;
  };
  satisfaction?: {
    avg_rating: number;
    total_feedback: number;
  };
}

export interface TicketTrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface SlaPerformanceData {
  within_sla: number;
  at_risk: number;
  breached: number;
  no_sla: number;
}

// ── Cache Query Key Constants ──
export const QUERY_KEYS = {
  TICKETS: 'tickets',
  SERVICE_REPORTS: 'serviceReports',
  KNOWLEDGE_BASE: 'knowledgeBase',
  TECHNICIANS: 'technicians',
  ANALYTICS: 'analytics',
  DASHBOARD: 'dashboard',
} as const;
