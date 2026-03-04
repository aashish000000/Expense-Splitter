const jwt = require('jsonwebtoken');
const config = require('../config');
const { findUserById } = require('../db');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, config.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
};

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Also check for userId in headers/query/body for backward compatibility
  const legacyUserId = req.headers['x-user-id'] || req.query.userId || req.body?.userId;

  if (token) {
    const decoded = verifyToken(token, config.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    return next();
  }

  // Backward compatibility with localStorage userId
  if (legacyUserId) {
    const user = await findUserById(legacyUserId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  return res.status(401).json({ success: false, message: 'Authentication required' });
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const decoded = verifyToken(token, config.JWT_SECRET);
    if (decoded) {
      const user = await findUserById(decoded.userId);
      if (user) req.user = user;
    }
  }
  next();
};

module.exports = { generateTokens, verifyToken, authenticateJWT, optionalAuth };
