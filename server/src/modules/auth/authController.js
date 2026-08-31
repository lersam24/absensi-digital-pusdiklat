const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { generateToken } = require('../../utils/jwt');

const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      status: 'fail',
      message: 'Email/NISN/NIM dan password wajib diisi.'
    });
  }

  try {
    const users = await query(
      'SELECT user_id, nisn_nim, nama_lengkap, email, password_hash, role, status_akun FROM users WHERE email = ? OR nisn_nim = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: 'fail',
        message: 'Kredensial tidak valid (User tidak ditemukan).'
      });
    }

    const user = users[0];

    // --- DEBUG LOGGING ---
    console.log('=== DEBUG LOGIN ===');
    console.log('Password Input:', JSON.stringify(password));
    console.log('Hash dari DB:', JSON.stringify(user.password_hash));
    console.log('Panjang Hash:', user.password_hash ? user.password_hash.length : 0);
    // ---------------------

    if (user.status_akun !== 'aktif') {
      return res.status(403).json({
        status: 'fail',
        message: 'Akun Anda sedang nonaktif.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Hasil Match Bcrypt:', isPasswordValid);
    console.log('===================');

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'Kredensial tidak valid (Password salah).'
      });
    }

    const payload = {
      user_id: user.user_id,
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      role: user.role
    };

    const token = generateToken(payload);

    return res.status(200).json({
      status: 'success',
      message: 'Login berhasil!',
      data: {
        token,
        user: {
          user_id: user.user_id,
          nama_lengkap: user.nama_lengkap,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server.'
    });
  }
};

module.exports = { login };