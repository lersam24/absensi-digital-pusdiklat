const { query } = require('../../config/db');

// Mengambil seluruh data presensi dengan join data user & filter opsional
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

    // Filter tanggal (default hari ini jika tidak ditentukan, kecuali jika 'all')
    if (tanggal && tanggal !== 'all') {
      conditions.push('p.tanggal = ?');
      params.push(tanggal);
    }

    // Filter user_id opsional
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

// Verifikasi jurnal sama admin
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
    // Cek keberadaan jurnal
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

    // Mapping status verifikasi ke status_submit tabel jurnal ('diverifikasi' atau 'draft')
    const statusSubmit = (status_verifikasi === 'disetujui' || status_verifikasi === 'diverifikasi')
      ? 'diverifikasi'
      : 'draft';

    // Update status submit pada tabel jurnal
    await query(
      'UPDATE jurnal SET status_submit = ?, updated_at = NOW() WHERE jurnal_id = ?',
      [statusSubmit, jurnalId]
    );

    // Jika ada catatan dari pembimbing, simpan ke tabel catatan_jurnal
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

module.exports = {
  getAllPresensi,
  verifikasiJurnal
};
