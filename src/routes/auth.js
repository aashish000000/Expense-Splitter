const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db, findUserByEmail, findUserByUsername } = require('../db');
const config = require('../config');

const router = express.Router();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidUsername = (username) => /^[a-zA-Z0-9_-]{3,30}$/.test(username);
const sanitizeString = (str) => str?.toString().trim() || '';

router.post('/register', async (req, res) => {
  try {
    const username = sanitizeString(req.body.username);
    const email = sanitizeString(req.body.email).toLowerCase();
    const password = req.body.password;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({ message: 'Username must be 3-30 characters (letters, numbers, underscores, hyphens only - no spaces)' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) return res.status(400).json({ message: 'Email already registered' });

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) return res.status(400).json({ message: 'Username already taken' });

    const hashpassword = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
    const userId = uuidv4();

    await db.insert({ collection: 'users', id: userId, username, email, hashpassword });
    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = sanitizeString(req.body.username);
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await findUserByUsername(username);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.hashpassword);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const { hashpassword, ...safeUser } = user;
    res.status(200).json({ message: 'Login successful', user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
