/**
 * Helper to resolve absolute backend URLs for uploaded images & attachments.
 *
 * Priority order for the backend origin:
 *   1. VITE_API_URL  — e.g. "https://my-backend.onrender.com/api" (strips /api suffix)
 *   2. VITE_SOCKET_URL — e.g. "http://127.0.0.1:5000" (already the raw origin)
 *   3. Relative path  — works in production where frontend & backend share an origin,
 *                        and in dev via the Vite proxy for /uploads (local files only).
 *
 * In development, uploaded files are stored on Render so a relative path would
 * hit localhost:5173 -> Vite proxy -> localhost:5000, but the file only exists on
 * the Render server.  Using VITE_SOCKET_URL as the fallback gives us the correct
 * absolute URL to the deployed backend even while running locally.
 */

export const getBackendOrigin = () => {
  // 1. VITE_API_URL  (e.g. "https://api.example.com/api" or "https://api.example.com")
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');
  }

  // 2. VITE_SOCKET_URL  (e.g. "http://127.0.0.1:5000")
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketUrl) {
    return socketUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback: relative (same-origin — only reliable in production)
  return '';
};

export const getUploadUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';

  // Data URIs, blob URLs, or already-absolute HTTP/HTTPS URLs are returned as-is
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${getBackendOrigin()}${cleanPath}`;
};
