const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Bungkus impor sharp dengan try-catch: bila sharp gagal/belum ter-install,
// upload foto tetap berjalan dengan fallback ke multer biasa (tanpa kompresi).
let sharp = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp tidak tersedia, upload foto presensi akan fallback ke multer biasa. Detail:', error.message);
}

// Buat direktori penyimpanan jika belum ada
const uploadDir = path.join(__dirname, '../../storage/uploads/presensi');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

// Gunakan memory storage bila sharp tersedia (untuk dikompresi dulu),
// selain itu gunakan disk storage multer biasa
const useSharp = sharp !== null;

const storage = useSharp
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `presensi-${req.user.user_id}-${uniqueSuffix}${ext}`);
      }
    });

const uploadPresensi = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB
  fileFilter
});

// Middleware kompresi foto presensi dengan sharp:
// - Di-resize maksimal lebar 800px (tanpa memperbesar)
// - Dikompresi ke WebP / JPEG quality 80%
// - Dipaksa maksimal 200 KB per foto
const processFotoPresensi = async (req, res, next) => {
  // Fallback: sharp tidak tersedia, file sudah langsung tersimpan oleh multer diskStorage
  if (!useSharp) {
    return next();
  }

  if (!req.file) {
    return next();
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const baseName = `presensi-${req.user.user_id}-${uniqueSuffix}`;

  try {
    const source = sharp(req.file.buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 800, withoutEnlargement: true });

    // Coba kompresi WebP dengan quality 80%, turun bertahap bila > 200 KB
    let format = 'webp';
    let quality = 80;
    let buffer = await source.clone().webp({ quality }).toBuffer();
    while (buffer.length > 200 * 1024 && quality > 20) {
      quality -= 10;
      buffer = await source.clone().webp({ quality }).toBuffer();
    }

    // Bila WebP tetap > 200 KB, fallback ke format JPEG
    if (buffer.length > 200 * 1024) {
      format = 'jpeg';
      quality = 80;
      buffer = await source.clone().jpeg({ quality }).toBuffer();
      while (buffer.length > 200 * 1024 && quality > 20) {
        quality -= 10;
        buffer = await source.clone().jpeg({ quality }).toBuffer();
      }
    }

    const ext = format === 'webp' ? 'webp' : 'jpg';
    const filename = `${baseName}.${ext}`;
    const outputPath = path.join(uploadDir, filename);

    fs.writeFileSync(outputPath, buffer);

    // Ganti buffer mentah dengan hasil kompresi yang sudah tersimpan
    req.file.filename = filename;
    req.file.path = outputPath;
    delete req.file.buffer;

    next();
  } catch (error) {
    // Sharp gagal memproses gambar: fallback simpan file mentah agar tidak mengembalikan error 500
    console.error('Sharp gagal memproses foto, fallback ke simpan file mentah:', error);
    try {
      if (req.file && req.file.buffer) {
        const fallbackExt = path.extname(req.file.originalname) || '.jpg';
        const filename = `${baseName}${fallbackExt}`;
        const outputPath = path.join(uploadDir, filename);
        fs.writeFileSync(outputPath, req.file.buffer);
        req.file.filename = filename;
        req.file.path = outputPath;
        delete req.file.buffer;
      }
    } catch (fallbackError) {
      console.error('Fallback simpan file juga gagal:', fallbackError);
      return next(fallbackError);
    }
    return next();
  }
};

module.exports = { uploadPresensi, processFotoPresensi, uploadDir };