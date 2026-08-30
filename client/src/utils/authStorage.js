// Utility to manage role-scoped authentication storage
// Allows Admin Panel and Technician Portal to stay logged in simultaneously in different tabs

export const isTechPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.startsWith('/technician') || path === '/technician-login';
};

export const getAuthToken = (roleHint) => {
  const isTech = roleHint === 'technician' || (roleHint !== 'admin' && isTechPath());
  if (isTech) {
    return localStorage.getItem('tech_token') || localStorage.getItem('token');
  }
  return localStorage.getItem('admin_token') || localStorage.getItem('token');
};

export const getRefreshToken = (roleHint) => {
  const isTech = roleHint === 'technician' || (roleHint !== 'admin' && isTechPath());
  if (isTech) {
    return localStorage.getItem('tech_refreshToken') || localStorage.getItem('refreshToken');
  }
  return localStorage.getItem('admin_refreshToken') || localStorage.getItem('refreshToken');
};

export const getCachedUser = (roleHint) => {
  const isTech = roleHint === 'technician' || (roleHint !== 'admin' && isTechPath());
  const primaryKey = isTech ? 'tech_user' : 'admin_user';
  try {
    const cachedPrimary = localStorage.getItem(primaryKey);
    if (cachedPrimary) return JSON.parse(cachedPrimary);

    const cachedFallback = localStorage.getItem('user');
    if (cachedFallback) {
      const parsed = JSON.parse(cachedFallback);
      if ((isTech && parsed.role === 'technician') || (!isTech && parsed.role !== 'technician')) {
        return parsed;
      }
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

export const clearAuthSession = (roleHint) => {
  const isTech = roleHint === 'technician' || (roleHint !== 'admin' && isTechPath());
  const prefix = isTech ? 'tech_' : 'admin_';

  localStorage.removeItem(`${prefix}token`);
  localStorage.removeItem(`${prefix}refreshToken`);
  localStorage.removeItem(`${prefix}user`);

  // Safely clean general keys if they belong to this role
  try {
    const cached = localStorage.getItem('user');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.role === (isTech ? 'technician' : parsed.role)) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    }
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};
