const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { pool } = require('./config/db');
const authRoutes = require('./modules/auth/authRoutes');
const presensiRoutes = require('./modules/presensi/presensiRoutes'); // <--- Import ini
const jurnalRoutes = require('./modules/jurnal/jurnalRoutes');
const adminRoutes = require('./modules/admin/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static Folder untuk Akses Foto Presensi
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/presensi', presensiRoutes); // <--- Tambahkan ini
app.use('/api/v1/jurnal', jurnalRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health Check Route
app.get('/api/v1/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.status(200).json({
      status: 'success',
      message: 'Server & Database BPS Magang terhubung dengan baik!',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Gagal terhubung ke Database',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server BPS Magang berjalan di http://localhost:${PORT}`);
});