const express = require('express');
const router = express.Router();
const { login } = require('./authController');

// POST /api/v1/auth/login
router.post('/login', login);

module.exports = router;