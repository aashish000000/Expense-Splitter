const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db, findUserByEmail, findUserByUsername } = require('../db');
const config = require('../config');
const { generateTokens, verifyToken } = require('../middleware/jwtAuth');
const { validate, registerRules, loginRules } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  registerRules,
  validate,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const existingEmail = await findUserByEmail(email.toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const hashpassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const userId = uuidv4();

    await db.insert({
      collection: 'users',
      id: userId,
      username: username.trim(),
      email: email.toLowerCase().trim(),
      hashpassword,
      createdAt: new Date().toISOString(),
    });

    const tokens = generateTokens(userId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId,
      ...tokens,
    });
  })
);

router.post(
  '/login',
  authLimiter,
  loginRules,
  validate,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const user = await findUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.hashpassword);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id);
    const { hashpassword, ...safeUser } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: safeUser,
      ...tokens,
    });
  })
);

router.post(
  '/refresh-token',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyToken(refreshToken, config.JWT_REFRESH_SECRET);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(decoded.userId);
    res.json({ success: true, ...tokens });
  })
);

module.exports = router;
