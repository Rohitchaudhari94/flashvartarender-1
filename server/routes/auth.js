const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  loginIdentifier: u.loginIdentifier || undefined,
  role: u.role,
  isActive: u.isActive !== undefined ? u.isActive : true,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt,
});

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// POST /api/auth/register (public registration strictly sets 'user' role)
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) return res.status(400).json({ message: 'Please enter your name (at least 2 characters)' });
    if (!isEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'That email is already registered. Try logging in.' });
    }

    // Server-side role enforcement: public registration is ALWAYS 'user' role
    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
      isActive: true,
    });

    res.status(201).json({ token: sign(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login (supports normal email or admin@123 identifier)
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const rawIdentifier = String(req.body.email || req.body.identifier || req.body.loginIdentifier || '').trim();
    const password = String(req.body.password || '');

    if (!rawIdentifier || !password) {
      return res.status(400).json({ message: 'Email/Identifier and password are required' });
    }

    const identifier = rawIdentifier.toLowerCase();

    // Match by email OR by loginIdentifier (e.g. admin@123), case-insensitively
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { loginIdentifier: identifier },
        { email: new RegExp(`^${escaped}$`, 'i') },
        { loginIdentifier: new RegExp(`^${escaped}$`, 'i') },
      ],
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials. Please verify your identifier and password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.json({ token: sign(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/change-password
// Allows authenticated users to securely update their password without exposing it
router.post('/change-password', protect, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '').trim();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword; // Will be hashed via pre('save') bcrypt salt 12
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

