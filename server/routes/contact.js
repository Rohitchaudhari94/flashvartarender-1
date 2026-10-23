const router = require('express').Router();
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const ContactMessage = require('../models/ContactMessage');
const { protect, adminOnly } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

// Rate limiting for public message submission: max 15 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages sent. Please wait a few minutes before trying again.' },
});

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ========================================================
// 1. PUBLIC ROUTE: Submit a Contact Message
// POST /api/contact
// ========================================================
router.post('/', contactLimiter, async (req, res, next) => {
  try {
    // Spam protection honeypot: bots that fill invisible fields are silently dropped
    if (req.body.hp_website || req.body.website_url) {
      return res.json({
        success: true,
        message: 'Thank you for reaching out! Your message has been received.',
      });
    }

    const rawName = String(req.body.name || '').trim();
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const rawSubject = String(req.body.subject || '').trim();
    const rawMessage = String(req.body.message || '').trim();

    // Frontend & Backend Validation
    if (!rawName || rawName.length < 2) {
      return res.status(400).json({ message: 'Please enter your full name (at least 2 characters).' });
    }
    if (rawName.length > 100) {
      return res.status(400).json({ message: 'Name cannot exceed 100 characters.' });
    }

    if (!rawEmail || !isEmail(rawEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (rawEmail.length > 150) {
      return res.status(400).json({ message: 'Email address cannot exceed 150 characters.' });
    }

    if (!rawSubject || rawSubject.length < 3) {
      return res.status(400).json({ message: 'Please enter a subject (at least 3 characters).' });
    }
    if (rawSubject.length > 200) {
      return res.status(400).json({ message: 'Subject cannot exceed 200 characters.' });
    }

    if (!rawMessage || rawMessage.length < 10) {
      return res.status(400).json({ message: 'Please write a message (at least 10 characters).' });
    }
    if (rawMessage.length > 5000) {
      return res.status(400).json({ message: 'Message body cannot exceed 5000 characters.' });
    }

    // Sanitize user inputs to prevent XSS and HTML injection
    const name = sanitizeText(rawName);
    const email = rawEmail;
    const subject = sanitizeText(rawSubject);
    const message = sanitizeText(rawMessage);

    // Persist to MongoDB
    const newMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      isRead: false,
    });

    console.log(`[Contact Message Stored] ID: ${newMessage._id} | From: ${name} <${email}> | Subject: "${subject}"`);

    res.status(201).json({
      success: true,
      message: 'Thank you for reaching out! Your message has been received and saved.',
      id: newMessage._id,
    });
  } catch (err) {
    next(err);
  }
});

// ========================================================
// 2. ADMIN ROUTES: Restricted to authenticated administrators
// All routes below require protect and adminOnly middleware
// ========================================================

// GET /api/contact/admin/messages
// Paginated, searchable, filterable list of client messages
router.get('/admin/messages', protect, adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const status = String(req.query.status || 'all').toLowerCase();
    const search = String(req.query.search || req.query.q || '').trim();
    const sort = String(req.query.sort || 'newest').toLowerCase();

    const filter = {};

    // Filter by read / unread status
    if (status === 'unread') {
      filter.isRead = false;
    } else if (status === 'read') {
      filter.isRead = true;
    }

    // Search by sender name, email, or subject
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [total, messages, totalAll, unreadCount, readCount] = await Promise.all([
      ContactMessage.countDocuments(filter),
      ContactMessage.find(filter).sort(sortOption).skip(skip).limit(limit),
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ isRead: false }),
      ContactMessage.countDocuments({ isRead: true }),
    ]);

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        total: totalAll,
        unread: unreadCount,
        read: readCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/contact/admin/messages/:id
// Retrieve complete single message details
router.get('/admin/messages/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await ContactMessage.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Auto-mark as read if requested
    if (req.query.markRead === 'true' && !message.isRead) {
      message.isRead = true;
      await message.save();
    }

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/contact/admin/messages/:id/read
// Mark as Read or Unread
router.patch('/admin/messages/:id/read', protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await ContactMessage.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const nextStatus = req.body.isRead !== undefined ? Boolean(req.body.isRead) : !message.isRead;
    message.isRead = nextStatus;
    await message.save();

    res.json({
      success: true,
      message,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/contact/admin/messages/:id
// Delete a message permanently
router.delete('/admin/messages/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const message = await ContactMessage.findByIdAndDelete(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({
      success: true,
      message: `Message from "${message.name}" has been deleted.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
