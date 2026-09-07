const express = require('express');
const router = express.Router();
const { clockIn, clockOut, getTodayStatus, getPresensiHistory } = require('./presensiController');
const { authenticateJWT, authorizeRole } = require('../../middlewares/authMiddleware');
const uploadPresensi = require('../../utils/upload');

// Wrapper Middleware untuk menangani upload & error multer
const handleUpload = (req, res, next) => {
  const upload = uploadPresensi.single('foto');
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: 'fail',
        message: err.message
      });
    }
    next();
  });
};

// GET /api/v1/presensi/today
router.get(
  '/today',
  authenticateJWT,
  getTodayStatus
);

// GET /api/v1/presensi/histori
router.get(
  '/histori',
  authenticateJWT,
  getPresensiHistory
);

// POST /api/v1/presensi/clock-in
router.post(
  '/clock-in',
  authenticateJWT,
  authorizeRole('peserta', 'admin'),
  handleUpload,
  clockIn
);

// POST /api/v1/presensi/clock-out
router.post(
  '/clock-out',
  authenticateJWT,
  authorizeRole('peserta', 'admin'),
  handleUpload,
  clockOut
);

module.exports = router;