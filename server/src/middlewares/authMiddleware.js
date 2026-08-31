const { verifyToken } = require('../utils/jwt');

// Middleware untuk memverifikasi token JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      message: 'Akses ditolak. Token tidak ditemukan atau format salah.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Menyimpan data user (user_id, role, dll) ke request
    next();
  } catch (error) {
    return res.status(403).json({
      status: 'fail',
      message: 'Token tidak valid atau sudah kadaluwarsa.'
    });
  }
};

// Middleware Role-Based Access Control (RBAC)
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Akses ditolak. Anda tidak memiliki izin untuk fitur ini.'
      });
    }
    next();
  };
};

module.exports = { authenticateJWT, authorizeRole };