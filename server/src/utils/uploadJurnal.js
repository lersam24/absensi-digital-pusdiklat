const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Buat direktori penyimpanan jika belum ada
const uploadDir = path.join(__dirname, '../../storage/uploads/jurnal');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `jurnal-${req.user.user_id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung! Hanya diperbolehkan gambar (JPEG/JPG/PNG), PDF, dan Word (DOC/DOCX).'), false);
  }
};

const uploadJurnal = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimal 10MB
  fileFilter
});

module.exports = uploadJurnal;
