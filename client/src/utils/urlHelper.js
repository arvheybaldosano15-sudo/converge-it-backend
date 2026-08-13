// Helper to resolve absolute backend URLs for uploaded images & attachments

export const getUploadUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  
  // Data URIs, blob URLs, or full HTTP/HTTPS URLs are returned as-is
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  const envApiUrl = import.meta.env.VITE_API_URL || '';
  
  let backendOrigin = '';
  if (envApiUrl) {
    backendOrigin = envApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');
  }

  return `${backendOrigin}${cleanPath}`;
};
