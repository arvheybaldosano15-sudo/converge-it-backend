const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createError } = require('./errorHandler');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

const storage = (subdir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads', subdir);
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${subdir}-${uniqueSuffix}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype)) cb(null, true);
  else cb(createError('Only image files are allowed', 400), false);
};

const documentFilter = (req, file, cb) => {
  if (['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype)) cb(null, true);
  else cb(createError('Only images and PDF files are allowed', 400), false);
};

const uploadProfileImage = multer({ storage: storage('profile-images'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('profile_image');
const uploadServiceReportImages = multer({ storage: storage('service-reports'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFilter }).array('images', 10);
const uploadTicketAttachments = multer({ storage: storage('ticket-attachments'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: documentFilter }).array('attachments', 5);
const uploadKnowledgeBaseImages = multer({ storage: storage('knowledge-base'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }).single('image');
const uploadSignature = multer({ storage: storage('service-reports'), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: imageFilter }).single('signature');

module.exports = { uploadProfileImage, uploadServiceReportImages, uploadTicketAttachments, uploadKnowledgeBaseImages, uploadSignature };
