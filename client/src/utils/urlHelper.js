/**
 * Helper to resolve absolute backend URLs for uploaded images & attachments.
 * Supports Desktop, Mobile over LAN (e.g. 192.168.x.x), and Production deployment.
 */

export const getUploadUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  // 1. Data URIs or blob URLs return as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // 2. Extract relative path if URL contains '/uploads/'
  // This cleans up old DB records that stored "http://localhost:5000/uploads/..."
  let cleanPath = url;
  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    cleanPath = url.substring(uploadsIndex); // e.g. "/uploads/service-reports/img.jpg"
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    // Non-uploads external HTTP/HTTPS URL
    return url;
  }

  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  // 3. Production check: VITE_API_URL
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    const origin = envApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');
    return `${origin}${cleanPath}`;
  }

  // 4. Mobile / LAN / Dev check:
  if (typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location;

    // If accessing via LAN IP on Mobile (e.g. http://192.168.10.77:5173) or custom host
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const rawSocket = import.meta.env.VITE_SOCKET_URL;
      let backendPort = '5000';
      if (rawSocket) {
        try {
          const parsed = new URL(rawSocket, window.location.href);
          if (parsed.port) backendPort = parsed.port;
        } catch (e) {
          // ignore
        }
      }
      // If frontend is on same origin/port in production or proxied
      if (!port || port === '80' || port === '443') {
        return cleanPath;
      }
      // Point mobile to backend running on server IP on port 5000
      return `${protocol}//${hostname}:${backendPort}${cleanPath}`;
    }
  }

  // 5. Desktop Localhost fallback:
  const rawSocket = import.meta.env.VITE_SOCKET_URL;
  if (rawSocket) {
    const cleanSocket = rawSocket.trim().replace(/\/+$/, '');
    return `${cleanSocket}${cleanPath}`;
  }

  return cleanPath;
};
