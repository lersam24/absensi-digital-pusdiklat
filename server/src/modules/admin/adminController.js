const { query } = require('../../config/db');
const bcrypt = require('bcryptjs');

// Helper: tentukan status kehadiran berdasarkan jam masuk standar
function getJamMasukStandarFromConfig(config) {
  return config.jam_masuk_standar || '07:30:00';
}

function getStatusKehadiran(waktuPresensi, jamMasukStandar) {
  const t = new Date(waktuPresensi);
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  const currentTimeStr = `${hh}:${mm}:${ss}`;
  return currentTimeStr > jamMasukStandar ? 'terlambat' : 'tepat_waktu';
}

// ==================== PRESENSI ====================

const getAllPresensi = async (req, res) => {
  try {
    const todayDate = new Date().toISOString().split('T')[0];
    const { tanggal = todayDate, user_id } = req.query;

    // Ambil jam masuk standar dari pengaturan_lokasi
    const configRows = await query('SELECT jam_masuk_standar FROM pengaturan_lokasi LIMIT 1');
    const jamMasukStandar = getJamMasukStandarFromConfig(configRows[0] || {});

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

    // Tambahkan status_kehadiran untuk setiap record (hanya untuk tipe masuk)
    const enriched = rows.map((row) => ({
      ...row,
      status_kehadiran: row.tipe_presensi === 'masuk'
        ? getStatusKehadiran(row.waktu_presensi, jamMasukStandar)
        : null,
      jam_masuk_standar: jamMasukStandar,
    }));

    return res.status(200).json({
      status: 'success',
      total: enriched.length,
      data: enriched
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

// ==================== EXPORT REKAP ====================

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const buildRekapData = async (bulan, tahun, user_id) => {
  const bulanNum = parseInt(bulan, 10);
  const tahunNum = parseInt(tahun, 10);
  const bulanStr = String(bulanNum).padStart(2, '0');
  const tanggalAwal = `${tahunNum}-${bulanStr}-01`;
  const tanggalAkhir = `${tahunNum}-${bulanStr}-31`;

  const configRows = await query('SELECT jam_masuk_standar FROM pengaturan_lokasi LIMIT 1');
  const jamMasukStandar = getJamMasukStandarFromConfig(configRows[0] || {});

  let presensiSql = `
    SELECT 
      p.user_id,
      u.nama_lengkap,
      u.nisn_nim,
      u.asal_instansi,
      p.tanggal,
      p.waktu_presensi,
      p.tipe_presensi
    FROM presensi p
    JOIN users u ON p.user_id = u.user_id
    WHERE p.tanggal BETWEEN ? AND ?
      AND p.tipe_presensi = 'masuk'
  `;
  const presensiParams = [tanggalAwal, tanggalAkhir];

  if (user_id) {
    presensiSql += ' AND p.user_id = ?';
    presensiParams.push(user_id);
  }

  presensiSql += ' ORDER BY u.nama_lengkap ASC, p.tanggal ASC, p.waktu_presensi ASC';
  const presensiRows = await query(presensiSql, presensiParams);

  let pulangSql = `
    SELECT 
      p.user_id,
      p.tanggal,
      p.waktu_presensi
    FROM presensi p
    WHERE p.tanggal BETWEEN ? AND ?
      AND p.tipe_presensi = 'pulang'
  `;
  const pulangParams = [tanggalAwal, tanggalAkhir];

  if (user_id) {
    pulangSql += ' AND p.user_id = ?';
    pulangParams.push(user_id);
  }

  const pulangRows = await query(pulangSql, pulangParams);

  const pulangLookup = {};
  for (const p of pulangRows) {
    const key = `${p.user_id}_${p.tanggal}`;
    const waktu = new Date(p.waktu_presensi);
    const hh = String(waktu.getHours()).padStart(2, '0');
    const mm = String(waktu.getMinutes()).padStart(2, '0');
    pulangLookup[key] = `${hh}:${mm}`;
  }

  let jurnalSql = `
    SELECT 
      j.user_id,
      j.tanggal,
      j.kategori,
      j.aktivitas_utama,
      j.status_submit
    FROM jurnal j
    WHERE j.tanggal BETWEEN ? AND ?
  `;
  const jurnalParams = [tanggalAwal, tanggalAkhir];

  if (user_id) {
    jurnalSql += ' AND j.user_id = ?';
    jurnalParams.push(user_id);
  }

  const jurnalRows = await query(jurnalSql, jurnalParams);

  const jurnalLookup = {};
  for (const j of jurnalRows) {
    const key = `${j.user_id}_${j.tanggal}`;
    if (!jurnalLookup[key]) {
      jurnalLookup[key] = [];
    }
    jurnalLookup[key].push(j);
  }

  const rekap = presensiRows.map((row) => {
    const waktu = new Date(row.waktu_presensi);
    const hh = String(waktu.getHours()).padStart(2, '0');
    const mm = String(waktu.getMinutes()).padStart(2, '0');
    const jamMasuk = `${hh}:${mm}`;
    const status = jamMasuk > jamMasukStandar ? 'Terlambat' : 'Tepat Waktu';

    const key = `${row.user_id}_${row.tanggal}`;
    const jamPulang = pulangLookup[key] || '-';
    const jurnalList = jurnalLookup[key] || [];
    const ringkasanJurnal = jurnalList.length > 0
      ? jurnalList.map((j) => `[${j.status_submit}] ${j.kategori}`).join('; ')
      : '-';

    return {
      nama_lengkap: row.nama_lengkap,
      nisn_nim: row.nisn_nim,
      asal_instansi: row.asal_instansi || '-',
      tanggal: row.tanggal,
      jam_masuk: jamMasuk,
      status,
      jam_pulang: jamPulang,
      ringkasan_jurnal: ringkasanJurnal,
    };
  });

  return {
    rekap,
    bulanNum,
    tahunNum,
    bulanStr,
    bulanLabel: NAMA_BULAN[bulanNum - 1],
    jamMasukStandar,
  };
};

const buildCsv = (rekap, bulanNum, tahunNum) => {
  const header = 'No,Nama,NISN/NIM,Asal Instansi,Tanggal,Jam Masuk,Status,Jam Pulang,Ringkasan Jurnal';
  const escapeCsv = (val) => {
    const str = String(val || '-');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvRows = rekap.map((r, idx) => [
    idx + 1,
    escapeCsv(r.nama_lengkap),
    escapeCsv(r.nisn_nim),
    escapeCsv(r.asal_instansi),
    r.tanggal,
    r.jam_masuk,
    r.status,
    r.jam_pulang,
    escapeCsv(r.ringkasan_jurnal),
  ].join(','));
  return [header, ...csvRows].join('\n');
};

const buildExcel = async (rekap, bulanLabel, tahunNum, bulanStr) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pusdiklat Digital';
  const ws = wb.addWorksheet('Rekap Absensi');

  ws.columns = [
    { width: 6 },
    { width: 28 },
    { width: 16 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 42 },
  ];

  // Baris judul
  ws.mergeCells(1, 1, 1, 9);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `REKAP ABSENSI PESERTA MAGANG - ${bulanLabel.toUpperCase()} ${tahunNum}`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
  ws.getRow(1).height = 30;

  // Baris subtitle
  ws.mergeCells(2, 1, 2, 9);
  const subCell = ws.getCell(2, 1);
  subCell.value = `Periode: ${bulanLabel} ${tahunNum} | Dihasilkan: ${new Date().toLocaleDateString('id-ID')}`;
  subCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'center' };
  ws.getRow(2).height = 20;

  // Baris header
  const headerRow = ws.getRow(3);
  const headers = ['No', 'Nama', 'NISN/NIM', 'Asal Instansi', 'Tanggal', 'Jam Masuk', 'Status', 'Jam Pulang', 'Ringkasan Jurnal'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: i === 0 ? 'center' : 'left', vertical: 'middle' };
  });
  headerRow.height = 22;

  // Data
  const dataRows = rekap.map((r, idx) => [
    idx + 1,
    r.nama_lengkap,
    r.nisn_nim,
    r.asal_instansi,
    r.tanggal,
    r.jam_masuk,
    r.status,
    r.jam_pulang,
    r.ringkasan_jurnal,
  ]);

  if (dataRows.length === 0) {
    ws.mergeCells(4, 1, 4, 9);
    ws.getCell(4, 1).value = 'Tidak ada data pada periode ini.';
    ws.getCell(4, 1).font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF94A3B8' } };
    ws.getCell(4, 1).alignment = { horizontal: 'center' };
  } else {
    dataRows.forEach((rowData, ridx) => {
      const row = ws.addRow(rowData);
      const statusCell = row.getCell(7);
      statusCell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: rowData[6] === 'Terlambat' ? 'FFB45309' : 'FF047857' },
      };
      if (ridx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        });
      }
    });
  }

  // Border halus di seluruh area
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const buildPdf = (rekap, bulanLabel, tahunNum, userLabel, jamMasukStandar) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const leftMargin = 36;
      const rightEdge = pageWidth - 36;

      // Judul
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#EA580C');
      doc.text('REKAP ABSENSI PESERTA MAGANG', leftMargin, 42, {
        width: rightEdge - leftMargin,
        align: 'center',
      });
      doc.font('Helvetica').fontSize(11).fillColor('#334155');
      doc.text(
        `${bulanLabel.toUpperCase()} ${tahunNum}${userLabel ? ` - ${userLabel}` : ''}`,
        leftMargin, 64,
        { width: rightEdge - leftMargin, align: 'center' }
      );

      const cols = [
        { label: 'No', key: 'no', w: 26 },
        { label: 'Nama', key: 'nama', w: 150 },
        { label: 'NISN/NIM', key: 'nisn', w: 84 },
        { label: 'Asal Instansi', key: 'asal', w: 130 },
        { label: 'Tanggal', key: 'tanggal', w: 76 },
        { label: 'Jam Masuk', key: 'jamMasuk', w: 66 },
        { label: 'Status', key: 'status', w: 78 },
        { label: 'Jam Pulang', key: 'jamPulang', w: 66 },
        { label: 'Ringkasan Jurnal', key: 'jurnal', w: 128 },
      ];
      const tableWidth = cols.reduce((s, c) => s + c.w, 0);
      const tableX = leftMargin + (rightEdge - leftMargin - tableWidth) / 2;
      const rowHeight = 20;

      const drawHeaderRow = (y) => {
        let x = tableX;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
        cols.forEach((c) => {
          doc.rect(x, y, c.w, 22).fill('#334155');
          doc.fillColor('#FFFFFF').text(c.label, x + 3, y + 7, {
            width: c.w - 6,
            align: c.label === 'No' ? 'center' : 'left',
          });
          x += c.w;
        });
        return y + 22;
      };

      let y = drawHeaderRow(96);

      if (rekap.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#64748B');
        doc.text('Tidak ada data pada periode ini.', tableX, y + 10, {
          width: tableWidth,
          align: 'center',
        });
      } else {
        rekap.forEach((r, idx) => {
          if (y + rowHeight > doc.page.height - 40) {
            doc.addPage();
            y = drawHeaderRow(50);
          }

          const fill = idx % 2 === 1 ? '#F1F5F9' : '#FFFFFF';
          doc.rect(tableX, y, tableWidth, rowHeight).fill(fill);
          doc.rect(tableX, y, tableWidth, rowHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

          const truncate = (val, max) => {
            const str = String(val || '-');
            return str.length > max ? `${str.slice(0, max)}...` : str;
          };

          const statusColor = r.status === 'Terlambat' ? '#B45309' : '#047857';
          const vals = [
            { text: String(idx + 1), align: 'center', color: '#0F172A' },
            { text: truncate(r.nama_lengkap, 26), align: 'left', color: '#0F172A' },
            { text: truncate(r.nisn_nim, 14), align: 'left', color: '#334155' },
            { text: truncate(r.asal_instansi, 22), align: 'left', color: '#334155' },
            { text: r.tanggal, align: 'left', color: '#334155' },
            { text: r.jam_masuk, align: 'center', color: '#0F172A' },
            { text: r.status, align: 'center', color: statusColor },
            { text: r.jam_pulang, align: 'center', color: '#334155' },
            { text: truncate(r.ringkasan_jurnal, 60), align: 'left', color: '#475569' },
          ];

          let x = tableX;
          cols.forEach((c, ci) => {
            doc.font('Helvetica').fontSize(8.5).fillColor(vals[ci].color);
            doc.text(vals[ci].text, x + 3, y + 6, { width: c.w - 6, align: vals[ci].align });
            x += c.w;
          });

          y += rowHeight;
        });
      }

      doc.font('Helvetica').fontSize(8).fillColor('#94A3B8');
      doc.text(
        `Dicetak ${new Date().toLocaleDateString('id-ID')} | Jam masuk standar: ${jamMasukStandar}`,
        tableX,
        doc.page.height - 48,
        { width: tableWidth, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const exportRekap = async (req, res) => {
  try {
    const { bulan, tahun, format = 'csv', user_id } = req.query;

    if (!bulan || !tahun) {
      return res.status(400).json({
        status: 'fail',
        message: 'Parameter bulan, tahun, dan format wajib dikirim (contoh: bulan=9&tahun=2026&format=excel).'
      });
    }

    const bulanNum = parseInt(bulan, 10);
    const tahunNum = parseInt(tahun, 10);
    if (isNaN(bulanNum) || isNaN(tahunNum) || bulanNum < 1 || bulanNum > 12) {
      return res.status(400).json({
        status: 'fail',
        message: 'Format bulan/tahun tidak valid.'
      });
    }

    const { rekap, bulanStr, bulanLabel, jamMasukStandar } = await buildRekapData(bulan, tahun, user_id);

    let userLabel = null;
    if (user_id) {
      const userRows = await query('SELECT nama_lengkap FROM users WHERE user_id = ?', [user_id]);
      if (userRows.length) {
        userLabel = userRows[0].nama_lengkap;
      }
    }

    if (format === 'excel') {
      const buffer = await buildExcel(rekap, bulanLabel, tahunNum, bulanStr);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=rekap-absensi-${tahunNum}-${bulanStr}.xlsx`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const buffer = await buildPdf(rekap, bulanLabel, tahunNum, userLabel, jamMasukStandar);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=rekap-absensi-${tahunNum}-${bulanStr}.pdf`);
      return res.send(buffer);
    }

    // Default: CSV (kembar dengan perilaku sebelumnya)
    const csvContent = buildCsv(rekap, bulanNum, tahunNum);
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=rekap-absensi-${tahunNum}-${bulanStr}.csv`);
    return res.send(bom + csvContent);
  } catch (error) {
    console.error('ExportRekap Error Detail:', error);
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
  deleteUser,
  exportRekap
};
