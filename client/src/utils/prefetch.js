import api from './axios';

// ─── Cache Keys (must match what each page reads from) ───────────────────────
const TICKETS_KEY        = 'CONVERGE_TICKETS_MANAGEMENT_CACHE_V2';
const TICKETS_STATS_KEY  = 'CONVERGE_TICKETS_STATS_CACHE_V2';
const INSTALL_KEY        = 'CONVERGE_INSTALLATION_REQUESTS_CACHE';
const TECHNICIANS_KEY    = 'CONVERGE_TECHNICIANS_CACHE';
const TECHNICIANS_STATS_KEY = 'CONVERGE_TECHNICIANS_STATS_CACHE';
const ADMIN_DASHBOARD_KEY = 'CONVERGE_ADMIN_DASHBOARD_CACHE';
const TECH_DASHBOARD_KEY  = 'CONVERGE_TECH_DASHBOARD_CACHE';

const safeSave = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
};

// ─── Admin Pre-fetch ─────────────────────────────────────────────────────────
// Called right after a successful admin login — completely fire-and-forget.
// By the time the admin navigates to any page, the data is already cached.
export const prefetchAdminData = () => {
  Promise.allSettled([
      api.get('/tickets', {
        params: { excludeCategoryName: 'Installation Request', limit: 50, page: 1, sortBy: 'created_at', sortOrder: 'DESC' },
      }),
      api.get('/tickets', {
        params: { categoryName: 'Installation Request', limit: 50 },
      }),
      api.get('/tickets/stats', {
        params: { excludeCategoryName: 'Installation Request' },
      }),
    ]).then(([ticketsR, installR, statsR]) => {
      if (ticketsR.status === 'fulfilled' && ticketsR.value?.success)
        safeSave(TICKETS_KEY, ticketsR.value.data || []);
      if (installR.status === 'fulfilled' && installR.value?.success)
        safeSave(INSTALL_KEY, installR.value.data || []);
      if (statsR.status === 'fulfilled' && statsR.value?.success)
        safeSave(TICKETS_STATS_KEY, statsR.value.data || {});

      // Stagger second batch to prevent network saturation on mobile devices
      setTimeout(() => {
        Promise.allSettled([
          api.get('/technicians', {
            params: { page: 1, limit: 10, status: 'all', sortBy: 'created_at', sortOrder: 'DESC' },
          }),
          api.get('/technicians/stats'),
        ]).then(([techR, techStatsR]) => {
          if (techR.status === 'fulfilled' && techR.value?.success)
            safeSave(TECHNICIANS_KEY, {
              data: techR.value.data || [],
              pagination: techR.value.pagination || {},
            });
          if (techStatsR.status === 'fulfilled' && techStatsR.value?.success)
            safeSave(TECHNICIANS_STATS_KEY, techStatsR.value.data || {});
        }).catch(() => {});
      }, 1000);
    }).catch(() => {});
};

// ─── Technician Pre-fetch ────────────────────────────────────────────────────
export const prefetchTechData = () => {
  setTimeout(() => {
    Promise.allSettled([
      api.get('/dashboard/technician'),
    ])
      .then(([dashR]) => {
        if (dashR.status === 'fulfilled' && dashR.value?.success)
          safeSave(TECH_DASHBOARD_KEY, dashR.value.data || {});
      })
      .catch(() => {});
  }, 2000);
};
