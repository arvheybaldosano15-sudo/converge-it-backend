const multer = require('multer');
const { createError } = require('./errorHandler');

// Use memoryStorage so file.buffer is always available for base64 Data URI conversion.
// We store all photos as base64 Data URIs directly in PostgreSQL — no disk writes needed.
const memStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) cb(null, true);
  else cb(createError('Only image files are allowed', 400), false);
};

const documentFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype)) cb(null, true);
  else cb(createError('Only images and PDF files are allowed', 400), false);
};

const uploadProfileImage = multer({ storage: memStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('profile_image');
const uploadServiceReportImages = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }).array('images', 10);
const uploadTicketAttachments = multer({ storage: memStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: documentFilter }).array('attachments', 5);
const uploadKnowledgeBaseImages = multer({ storage: memStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('image');
const uploadSignature = multer({ storage: memStorage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: imageFilter }).single('signature');

module.exports = { uploadProfileImage, uploadServiceReportImages, uploadTicketAttachments, uploadKnowledgeBaseImages, uploadSignature };
