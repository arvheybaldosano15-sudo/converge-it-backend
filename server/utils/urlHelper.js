const fs = require('fs');

/**
 * Returns the absolute public-facing backend origin URL.
 */
const getBackendOrigin = () => {
  const external = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (external) return external.replace(/\/+$/, '');
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

/**
 * Converts a multer uploaded file object (diskStorage or memoryStorage)
 * into a persistent Base64 Data URI string (e.g. data:image/jpeg;base64,...).
 * Storing Base64 Data URIs in PostgreSQL guarantees that uploaded photos will
 * NEVER disappear when Render redeploys or resets its ephemeral container filesystem!
 */
const fileToDataUri = (file) => {
  if (!file) return null;
  try {
    let buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      buffer = fs.readFileSync(file.path);
      // Clean up local temp file
      fs.unlink(file.path, () => {});
    }
    if (!buffer) return null;
    const mime = file.mimetype || 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('Error converting file to Data URI:', err);
    return null;
  }
};

module.exports = { getBackendOrigin, fileToDataUri };
