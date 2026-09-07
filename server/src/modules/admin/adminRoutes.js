const express = require('express');
const router = express.Router();
const { getAllPresensi, verifikasiJurnal } = require('./adminController');
const { authenticateJWT, authorizeRole } = require('../../middlewares/authMiddleware');

// Proteksi seluruh route admin/pembimbing
router.use(authenticateJWT, authorizeRole('admin', 'pembimbing'));

// GET /api/v1/admin/presensi -> getAllPresensi
router.get('/presensi', getAllPresensi);

// PUT /api/v1/admin/jurnal/:id/verifikasi -> verifikasiJurnal
router.put('/jurnal/:id/verifikasi', verifikasiJurnal);

module.exports = router;
