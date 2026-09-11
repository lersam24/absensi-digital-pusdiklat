const express = require('express');
const router = express.Router();
const {
  getAllPresensi,
  getAllJurnal,
  verifikasiJurnal,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} = require('./adminController');
const { authenticateJWT, authorizeRole } = require('../../middlewares/authMiddleware');

// Proteksi seluruh route admin/pembimbing
router.use(authenticateJWT, authorizeRole('admin', 'pembimbing'));

// Presensi
router.get('/presensi', getAllPresensi);

// Jurnal
router.get('/jurnal', getAllJurnal);
router.put('/jurnal/:id/verifikasi', verifikasiJurnal);

// User Management (admin only)
router.get('/users', authorizeRole('admin'), getAllUsers);
router.post('/users', authorizeRole('admin'), createUser);
router.put('/users/:id', authorizeRole('admin'), updateUser);
router.delete('/users/:id', authorizeRole('admin'), deleteUser);

module.exports = router;
