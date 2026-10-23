const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware: requires valid token and active account
 */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please log in to continue' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
};

/**
 * Optional protect: attaches user if token is present, but allows guest access
 */
const optionalProtect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // Guest visitor - ignore token verification errors
  }
  next();
};

/**
 * Restricts access to standard administrators and primary administrator
 */
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'primary_admin')) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};

/**
 * Restricts access strictly to the single Primary Administrator
 */
const primaryAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'primary_admin') {
    return next();
  }
  res.status(403).json({ message: 'Primary administrator privileges required' });
};

module.exports = {
  protect,
  optionalProtect,
  adminOnly,
  primaryAdminOnly,
  // Standard specification aliases
  authenticateUser: protect,
  requireAdmin: adminOnly,
  requirePrimaryAdmin: primaryAdminOnly,
};
