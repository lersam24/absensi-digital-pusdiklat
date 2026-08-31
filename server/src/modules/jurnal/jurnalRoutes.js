const express = require('express');
const router = express.Router();
const { createJurnal, getTodayJurnal, getJurnalHistory } = require('./jurnalController');
const { authenticateJWT } = require('../../middlewares/authMiddleware');
const uploadJurnal = require('../../utils/uploadJurnal');

// Wrapper Middleware untuk menangani upload & error multer
const handleUpload = (req, res, next) => {
  const upload = uploadJurnal.single('lampiran');
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

// POST /api/v1/jurnal -> upload lampiran (opsional) -> createJurnal
router.post('/', authenticateJWT, handleUpload, createJurnal);

// GET /api/v1/jurnal/today -> getTodayJurnal
router.get('/today', authenticateJWT, getTodayJurnal);

// GET /api/v1/jurnal -> getJurnalHistory
router.get('/', authenticateJWT, getJurnalHistory);

module.exports = router;
