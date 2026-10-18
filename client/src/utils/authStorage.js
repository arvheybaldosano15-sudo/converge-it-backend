// Utility to manage role-scoped authentication storage
// Allows Admin Panel and Technician Portal to stay logged in simultaneously in different tabs

export const isTechPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.startsWith('/technician') || path === '/technician-login';
};

export const isAdminPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.startsWith('/admin');
};

export const getAuthToken = (roleHint) => {
  if (roleHint === 'technician' || (!roleHint && isTechPath())) {
    return localStorage.getItem('tech_token') || localStorage.getItem('token');
  }
  if (roleHint === 'admin' || (!roleHint && isAdminPath())) {
    return localStorage.getItem('admin_token') || localStorage.getItem('token');
  }
  // Neutral paths (e.g., /, /unauthorized, /login) — check admin, then tech, then fallback
  return (
    localStorage.getItem('admin_token') ||
    localStorage.getItem('tech_token') ||
    localStorage.getItem('token')
  );
};

export const getRefreshToken = (roleHint) => {
  if (roleHint === 'technician' || (!roleHint && isTechPath())) {
    return localStorage.getItem('tech_refreshToken') || localStorage.getItem('refreshToken');
  }
  if (roleHint === 'admin' || (!roleHint && isAdminPath())) {
    return localStorage.getItem('admin_refreshToken') || localStorage.getItem('refreshToken');
  }
  return (
    localStorage.getItem('admin_refreshToken') ||
    localStorage.getItem('tech_refreshToken') ||
    localStorage.getItem('refreshToken')
  );
};

export const getCachedUser = (roleHint) => {
  try {
    if (roleHint === 'technician' || (!roleHint && isTechPath())) {
      const cached = localStorage.getItem('tech_user');
      if (cached) return JSON.parse(cached);
    } else if (roleHint === 'admin' || (!roleHint && isAdminPath())) {
      const cached = localStorage.getItem('admin_user');
      if (cached) return JSON.parse(cached);
    } else {
      const adminCached = localStorage.getItem('admin_user');
      if (adminCached) return JSON.parse(adminCached);
      const techCached = localStorage.getItem('tech_user');
      if (techCached) return JSON.parse(techCached);
    }

    const cachedFallback = localStorage.getItem('user');
    if (cachedFallback) {
      return JSON.parse(cachedFallback);
    }
    return null;
  } catch {
    return null;
  }
};

export const setAuthSession = (userData, accessToken, refreshToken) => {
  if (!userData) return;
  const isTech = userData.role === 'technician';
  const prefix = isTech ? 'tech_' : 'admin_';

  // Sanitize userData to exclude potentially massive base64 profile image URIs from localStorage.
  // The full image string will still remain in the in-memory React user state.
  const sanitizedUser = { ...userData };
  delete sanitizedUser.profileImageUrl;
  delete sanitizedUser.profile_image_url;

  try {
    if (accessToken) {
      localStorage.setItem(`${prefix}token`, accessToken);
      localStorage.setItem('token', accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(`${prefix}refreshToken`, refreshToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem(`${prefix}user`, JSON.stringify(sanitizedUser));
    localStorage.setItem('user', JSON.stringify(sanitizedUser));
  } catch (error) {
    console.error('Failed to write authentication session to localStorage:', error);
  }
};

export const purgeAllTicketCaches = () => {
  const keysToRemove = [
    'CONVERGE_TICKETS_MAIN_CACHE_V2',
    'CONVERGE_TICKETS_MANAGEMENT_CACHE_V2',
    'CONVERGE_TICKETS_MANAGEMENT_CACHE',
    'CONVERGE_TICKETS_MAIN_CACHE',
    'CONVERGE_ASSIGNED_TICKETS_CACHE',
    'CONVERGE_TECH_TICKETS_CACHE',
    'CONVERGE_TECH_DASHBOARD_CACHE',
    'CONVERGE_ADMIN_DASHBOARD_CACHE',
    'CONVERGE_INSTALLATION_REQUESTS_CACHE',
    'CONVERGE_TICKETS_STATS_CACHE_V2',
    'CONVERGE_LOCAL_TICKETS_STATS_V2',
    'CONVERGE_TANSTACK_QUERY_CACHE',
  ];
  keysToRemove.forEach((k) => {
    try { localStorage.removeItem(k); } catch (_) {}
  });

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('CONVERGE_ASSIGNED_TICKETS_') || key.startsWith('CONVERGE_TECH_') || key.startsWith('CONVERGE_TICKETS_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
};

export const clearAuthSession = (roleHint) => {
  purgeAllTicketCaches();

  if (roleHint === 'all' || !roleHint) {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('tech_token');
    localStorage.removeItem('token');
    localStorage.removeItem('admin_refreshToken');
    localStorage.removeItem('tech_refreshToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('tech_user');
    localStorage.removeItem('user');
    return;
  }

  const isTech = roleHint === 'technician' || (roleHint !== 'admin' && isTechPath());
  const prefix = isTech ? 'tech_' : 'admin_';

  localStorage.removeItem(`${prefix}token`);
  localStorage.removeItem(`${prefix}refreshToken`);
  localStorage.removeItem(`${prefix}user`);
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};
