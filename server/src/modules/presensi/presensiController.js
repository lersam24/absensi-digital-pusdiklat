const { query } = require('../../config/db');
const { getDistanceInMeters } = require('../../utils/haversine');

// Clock-In (Presensi Masuk)
const clockIn = async (req, res) => {
  console.log('=== DEBUG PRESENSI ===');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  console.log('======================');
  
  const userId = req.user.user_id;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ status: 'fail', message: 'Koordinat lokasi wajib dikirim.' });
  }

  if (!req.file) {
    return res.status(400).json({ status: 'fail', message: 'Foto bukti presensi wajib diunggah.' });
  }

  try {
    const todayDate = new Date().toISOString().split('T')[0];

    // Cek apakah hari ini sudah melakukan clock-in
    const existing = await query(
      'SELECT presensi_id FROM presensi WHERE user_id = ? AND tanggal = ?',
      [userId, todayDate]
    );

    if (existing.length > 0) {
      return res.status(400).json({ status: 'fail', message: 'Anda sudah melakukan presensi masuk hari ini.' });
    }

    // Ambil konfigurasi lokasi & jam kantor dari database
    const configRows = await query('SELECT * FROM pengaturan_lokasi LIMIT 1');
    const config = configRows[0] || {};

    const officeLat = parseFloat(config.latitude || '-6.3350000');
    const officeLng = parseFloat(config.longitude || '106.8250000');
    const maxRadius = parseFloat(config.radius_meter || 50);
    const workStartTime = config.jam_masuk_standar || '08:00:00';

    // Hitung jarak user ke lokasi kantor
    const distance = getDistanceInMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      officeLat,
      officeLng
    );

    const isRadiusValid = distance <= maxRadius;

    // Tentukan status keterlambatan
    const now = new Date();
    const currentTimeStr = now.toTimeString().split(' ')[0];
    const statusKehadiran = currentTimeStr > workStartTime ? 'terlambat' : 'hadir';
    
    // Pastikan variabel fotoFilename terdefinisi dari req.file.filename
    const fotoFilename = req.file ? req.file.filename : null;

    // Query INSERT disesuaikan dengan skema tabel presensi asli
    await query(
      `INSERT INTO presensi 
       (user_id, tipe_presensi, waktu_presensi, tanggal, latitude, longitude, jarak_meter, foto_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        'masuk',
        new Date(),
        todayDate,
        parseFloat(req.body.latitude),
        parseFloat(req.body.longitude),
        Math.round(distance),
        fotoFilename
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Presensi masuk berhasil dicatat.',
      data: {
        tanggal: todayDate,
        jam_masuk: currentTimeStr,
        status_kehadiran: statusKehadiran,
        jarak_meter: Math.round(distance),
        dalam_radius: isRadiusValid
      }
    });
  } catch (error) {
    console.error('ClockIn Error Detail:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message,
      sqlMessage: error.sqlMessage || null 
    });
  }
};

// Clock-Out (Presensi Pulang)
const clockOut = async (req, res) => {
  console.log('=== DEBUG PRESENSI (PULANG) ===');
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  console.log('===============================');

  const userId = req.user.user_id;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ status: 'fail', message: 'Koordinat lokasi wajib dikirim.' });
  }

  if (!req.file) {
    return res.status(400).json({ status: 'fail', message: 'Foto bukti presensi wajib diunggah.' });
  }

  try {
    const todayDate = new Date().toISOString().split('T')[0];

    // Cek apakah pengguna sudah pernah clock-in hari ini
    const existingIn = await query(
      'SELECT presensi_id FROM presensi WHERE user_id = ? AND tanggal = ? AND tipe_presensi = "masuk"',
      [userId, todayDate]
    );

    if (existingIn.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Anda belum melakukan presensi masuk hari ini.'
      });
    }

    // Cek apakah pengguna sudah pernah clock-out hari ini
    const existingOut = await query(
      'SELECT presensi_id FROM presensi WHERE user_id = ? AND tanggal = ? AND tipe_presensi = "pulang"',
      [userId, todayDate]
    );

    if (existingOut.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Anda sudah melakukan presensi pulang hari ini.'
      });
    }

    // Ambil konfigurasi lokasi kantor dari database
    const configRows = await query('SELECT * FROM pengaturan_lokasi LIMIT 1');
    const config = configRows[0] || {};

    const officeLat = parseFloat(config.latitude || '-6.3350000');
    const officeLng = parseFloat(config.longitude || '106.8250000');
    const maxRadius = parseFloat(config.radius_meter || 50);

    // Hitung jarak user ke lokasi kantor
    const distance = getDistanceInMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      officeLat,
      officeLng
    );

    // Validasi jarak
    if (distance > maxRadius) {
      return res.status(400).json({
        status: 'fail',
        message: 'Gagal melakukan presensi pulang karena Anda berada di luar radius lokasi yang diizinkan.'
      });
    }

    // Tentukan foto file name
    const fotoFilename = req.file ? req.file.filename : null;

    // Query INSERT disesuaikan dengan skema tabel presensi asli
    await query(
      `INSERT INTO presensi 
       (user_id, tipe_presensi, waktu_presensi, tanggal, latitude, longitude, jarak_meter, foto_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.user_id,
        'pulang',
        new Date(),
        todayDate,
        parseFloat(req.body.latitude),
        parseFloat(req.body.longitude),
        Math.round(distance),
        fotoFilename
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Presensi pulang berhasil dicatat.',
      data: {
        tanggal: todayDate,
        jarak_meter: Math.round(distance)
      }
    });
  } catch (error) {
    console.error('ClockOut Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

// Ambil Status Presensi Hari Ini
const getTodayStatus = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const todayDate = new Date().toISOString().split('T')[0];

    // Ambil data presensi hari ini
    const rows = await query(
      'SELECT tipe_presensi, waktu_presensi, foto_url FROM presensi WHERE user_id = ? AND tanggal = ?',
      [userId, todayDate]
    );

    const clockInData = rows.find(r => r.tipe_presensi === 'masuk') || null;
    const clockOutData = rows.find(r => r.tipe_presensi === 'pulang') || null;

    const canClockIn = !clockInData;
    const canClockOut = !!clockInData && !clockOutData;

    return res.status(200).json({
      status: 'success',
      data: {
        tanggal: todayDate,
        can_clock_in: canClockIn,
        can_clock_out: canClockOut,
        clock_in: clockInData,
        clock_out: clockOutData
      }
    });
  } catch (error) {
    console.error('GetTodayStatus Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

// Ambil Riwayat Presensi
const getPresensiHistory = async (req, res) => {
  const userId = req.user.user_id;
  const { start_date, end_date } = req.query;

  try {
    let sql = 'SELECT * FROM presensi WHERE user_id = ?';
    const params = [userId];

    if (start_date && end_date) {
      sql += ' AND tanggal BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    sql += ' ORDER BY tanggal DESC, waktu_presensi DESC';

    const rows = await query(sql, params);

    return res.status(200).json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    console.error('GetPresensiHistory Error Detail:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

module.exports = { clockIn, clockOut, getTodayStatus, getPresensiHistory };