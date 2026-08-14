/**
 * Returns the absolute public-facing backend origin URL.
 *
 * Priority:
 *   1. RENDER_EXTERNAL_URL  — auto-set by Render at runtime (e.g. "https://myapp.onrender.com")
 *   2. BACKEND_URL          — manually set fallback (for other PaaS providers)
 *   3. http://localhost:PORT — local development fallback
 *
 * This is used when storing uploaded file paths in the database so that
 * image URLs are always absolute and work from any client (local dev, production).
 */
const getBackendOrigin = () => {
  const external = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (external) return external.replace(/\/+$/, '');
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

module.exports = { getBackendOrigin };
