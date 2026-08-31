const { query } = require('../../config/db');

// Create Jurnal (Mengisi Jurnal Harian Baru)
const createJurnal = async (req, res) => {
  const userId = req.user.user_id;
  const { judul_kegiatan, deskripsi_kegiatan } = req.body;

  if (!judul_kegiatan || !deskripsi_kegiatan) {
    return res.status(400).json({
      status: 'fail',
      message: 'Judul kegiatan dan deskripsi kegiatan wajib diisi.'
    });
  }

  try {
    const todayDate = new Date().toISOString().split('T')[0];

    // Cek apakah user sudah mengisi jurnal pada tanggal hari ini
    const existing = await query(
      'SELECT jurnal_id FROM jurnal WHERE user_id = ? AND tanggal = ?',
      [userId, todayDate]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Anda sudah mengisi jurnal harian untuk hari ini'
      });
    }

    const lampiranFilename = req.file ? req.file.filename : null;

    // Query INSERT ke tabel jurnal (sesuai skema kolom tabel database asli)
    await query(
      `INSERT INTO jurnal (user_id, tanggal, kategori, aktivitas_utama, lampiran_url) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, todayDate, judul_kegiatan, deskripsi_kegiatan, lampiranFilename]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Jurnal harian berhasil disimpan.'
    });
  } catch (error) {
    console.error('CreateJurnal Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

// Ambil Jurnal Hari Ini
const getTodayJurnal = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const todayDate = new Date().toISOString().split('T')[0];

    const rows = await query(
      `SELECT 
         jurnal_id, 
         user_id, 
         tanggal, 
         kategori AS judul_kegiatan, 
         aktivitas_utama AS deskripsi_kegiatan, 
         lampiran_url, 
         status_submit, 
         created_at 
       FROM jurnal 
       WHERE user_id = ? AND tanggal = ?`,
      [userId, todayDate]
    );

    return res.status(200).json({
      status: 'success',
      data: rows[0] || null
    });
  } catch (error) {
    console.error('GetTodayJurnal Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

// Ambil Riwayat Jurnal
const getJurnalHistory = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const rows = await query(
      `SELECT 
         jurnal_id, 
         user_id, 
         tanggal, 
         kategori AS judul_kegiatan, 
         aktivitas_utama AS deskripsi_kegiatan, 
         lampiran_url, 
         status_submit, 
         created_at 
       FROM jurnal 
       WHERE user_id = ? 
       ORDER BY tanggal DESC`,
      [userId]
    );

    return res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('GetJurnalHistory Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

module.exports = {
  createJurnal,
  getTodayJurnal,
  getJurnalHistory
};
