const { query } = require('../../config/db');
const bcrypt = require('bcryptjs');

// ==================== PRESENSI ====================

const getAllPresensi = async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const { tanggal = todayDate, user_id } = req.query;

    let sql = `
      SELECT 
        p.presensi_id,
        p.user_id,
        u.nama_lengkap,
        u.email,
        u.asal_instansi,
        p.tipe_presensi,
        p.waktu_presensi,
        p.tanggal,
        p.latitude,
        p.longitude,
        p.akurasi_gps,
        p.jarak_meter,
        p.status_gps,
        p.foto_url,
        p.is_anomali,
        p.reviewed_by,
        p.reviewed_at,
        p.created_at
      FROM presensi p
      JOIN users u ON p.user_id = u.user_id
    `;

    const conditions = [];
    const params = [];

    if (tanggal && tanggal !== 'all') {
      conditions.push('p.tanggal = ?');
      params.push(tanggal);
    }

    if (user_id) {
      conditions.push('p.user_id = ?');
      params.push(user_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.waktu_presensi DESC';

    const rows = await query(sql, params);

    return res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('GetAllPresensi Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

// ==================== JURNAL ====================

const getAllJurnal = async (req, res) => {
  try {
    const { tanggal, user_id, status_submit } = req.query;

    let sql = `
      SELECT 
        j.jurnal_id,
        j.user_id,
        u.nama_lengkap,
        u.email,
        u.asal_instansi,
        j.tanggal,
        j.kategori AS judul_kegiatan,
        j.aktivitas_utama AS deskripsi_kegiatan,
        j.lampiran_url,
        j.status_submit,
        j.created_at,
        j.updated_at
      FROM jurnal j
      JOIN users u ON j.user_id = u.user_id
    `;

    const conditions = [];
    const params = [];

    if (tanggal) {
      conditions.push('j.tanggal = ?');
      params.push(tanggal);
    }

    if (user_id) {
      conditions.push('j.user_id = ?');
      params.push(user_id);
    }

    if (status_submit) {
      conditions.push('j.status_submit = ?');
      params.push(status_submit);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY j.tanggal DESC, j.created_at DESC';

    const rows = await query(sql, params);

    // Attach catatan pembimbing for each jurnal
    for (let row of rows) {
      const catatan = await query(
        `SELECT c.catatan, c.admin_id, a.nama_lengkap AS admin_nama
         FROM catatan_jurnal c
         JOIN users a ON c.admin_id = a.user_id
         WHERE c.jurnal_id = ?
         ORDER BY c.admin_id DESC LIMIT 1`,
        [row.jurnal_id]
      );
      row.catatan_pembimbing = catatan[0]?.catatan || null;
      row.admin_reviewer = catatan[0]?.admin_nama || null;
    }

    return res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('GetAllJurnal Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

const verifikasiJurnal = async (req, res) => {
  const jurnalId = req.params.id;
  const { status_verifikasi, catatan_pembimbing } = req.body;

  if (!status_verifikasi) {
    return res.status(400).json({
      status: 'fail',
      message: 'status_verifikasi wajib dikirim (contoh: "disetujui" atau "revisi/ditolak").'
    });
  }

  try {
    const existingJurnal = await query(
      'SELECT jurnal_id, user_id, status_submit FROM jurnal WHERE jurnal_id = ?',
      [jurnalId]
    );

    if (existingJurnal.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'Data jurnal tidak ditemukan.'
      });
    }

    const statusSubmit = (status_verifikasi === 'disetujui' || status_verifikasi === 'diverifikasi')
      ? 'diverifikasi'
      : 'draft';

    await query(
      'UPDATE jurnal SET status_submit = ?, updated_at = NOW() WHERE jurnal_id = ?',
      [statusSubmit, jurnalId]
    );

    if (catatan_pembimbing && typeof catatan_pembimbing === 'string' && catatan_pembimbing.trim()) {
      await query(
        'INSERT INTO catatan_jurnal (jurnal_id, admin_id, catatan) VALUES (?, ?, ?)',
        [jurnalId, req.user.user_id, catatan_pembimbing.trim()]
      );
    }

    return res.status(200).json({
      status: 'success',
      message: `Jurnal berhasil diverifikasi dengan status: ${status_verifikasi}.`,
      data: {
        jurnal_id: Number(jurnalId),
        status_submit: statusSubmit,
        status_verifikasi,
        catatan_pembimbing: catatan_pembimbing ? catatan_pembimbing.trim() : null
      }
    });
  } catch (error) {
    console.error('VerifikasiJurnal Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

// ==================== USER MANAGEMENT ====================

const getAllUsers = async (req, res) => {
  try {
    const rows = await query(
      `SELECT user_id, nisn_nim, nama_lengkap, email, role, status_akun, asal_instansi
       FROM users ORDER BY user_id ASC`
    );
    return res.status(200).json({
      status: 'success',
      total: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('GetAllUsers Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

const createUser = async (req, res) => {
  const { nisn_nim, nama_lengkap, email, password, role, status_akun = 'aktif', asal_instansi } = req.body;

  if (!nisn_nim || !nama_lengkap || !email || !password || !role) {
    return res.status(400).json({
      status: 'fail',
      message: 'nisn_nim, nama_lengkap, email, password, dan role wajib diisi.'
    });
  }

  try {
    const existing = await query(
      'SELECT user_id FROM users WHERE email = ? OR nisn_nim = ?',
      [email, nisn_nim]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email atau NISN/NIM sudah terdaftar.'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (nisn_nim, nama_lengkap, email, password_hash, role, status_akun, asal_instansi)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nisn_nim, nama_lengkap, email, password_hash, role, status_akun, asal_instansi || null]
    );

    return res.status(201).json({
      status: 'success',
      message: 'User berhasil dibuat.'
    });
  } catch (error) {
    console.error('CreateUser Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

const updateUser = async (req, res) => {
  const userId = req.params.id;
  const { nisn_nim, nama_lengkap, email, role, status_akun, asal_instansi, password } = req.body;

  try {
    const existing = await query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User tidak ditemukan.'
      });
    }

    const duplicateCheck = await query(
      'SELECT user_id FROM users WHERE (email = ? OR nisn_nim = ?) AND user_id != ?',
      [email, nisn_nim, userId]
    );

    if (duplicateCheck.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email atau NISN/NIM sudah digunakan user lain.'
      });
    }

    let sql = `UPDATE users SET nisn_nim = ?, nama_lengkap = ?, email = ?, role = ?, status_akun = ?, asal_instansi = ?`;
    const params = [nisn_nim, nama_lengkap, email, role, status_akun, asal_instansi || null];

    if (password && password.trim()) {
      const password_hash = await bcrypt.hash(password, 10);
      sql += `, password_hash = ?`;
      params.push(password_hash);
    }

    sql += ` WHERE user_id = ?`;
    params.push(userId);

    await query(sql, params);

    return res.status(200).json({
      status: 'success',
      message: 'User berhasil diperbarui.'
    });
  } catch (error) {
    console.error('UpdateUser Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const existing = await query('SELECT user_id, role FROM users WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'User tidak ditemukan.'
      });
    }

    if (existing[0].role === 'admin') {
      return res.status(400).json({
        status: 'fail',
        message: 'Tidak dapat menghapus akun admin.'
      });
    }

    await query('DELETE FROM catatan_jurnal WHERE jurnal_id IN (SELECT jurnal_id FROM jurnal WHERE user_id = ?)', [userId]);
    await query('DELETE FROM jurnal WHERE user_id = ?', [userId]);
    await query('DELETE FROM presensi WHERE user_id = ?', [userId]);
    await query('DELETE FROM users WHERE user_id = ?', [userId]);

    return res.status(200).json({
      status: 'success',
      message: 'User berhasil dihapus.'
    });
  } catch (error) {
    console.error('DeleteUser Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

module.exports = {
  getAllPresensi,
  getAllJurnal,
  verifikasiJurnal,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
