const router = require('express').Router();
const mongoose = require('mongoose');
const News = require('../models/News');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ContactMessage = require('../models/ContactMessage');
const Submission = require('../models/Submission');
const CATEGORIES = require('../utils/categories');
const { protect, adminOnly, primaryAdminOnly } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

// All admin routes require at least standard administrator privileges
router.use(protect, adminOnly);

const isHttpUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pickNews = (b) => ({
  title: sanitizeText(b.title),
  description: sanitizeText(b.description),
  content: sanitizeText(b.content),
  imageUrl: String(b.imageUrl || '').trim(),
  category: String(b.category || 'top').toLowerCase(),
  source: sanitizeText(b.source) || 'FlashVarta',
  isPublished: b.isPublished === undefined ? true : Boolean(b.isPublished),
});

const validateNews = (d) => {
  if (!d.title) return 'Headline is required';
  if (!d.description) return 'Short description is required';
  if (!CATEGORIES.includes(d.category)) return 'Invalid category selected';
  if (d.imageUrl && !isHttpUrl(d.imageUrl)) return 'Image URL must start with http:// or https://';
  return null;
};

// GET /api/admin/stats
// Calculates real figures directly from MongoDB
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      activeUsers,
      totalArticles,
      publishedArticles,
      totalMessages,
      unreadMessages,
      readMessages,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $in: ['admin', 'primary_admin'] } }),
      User.countDocuments({ isActive: true }),
      News.countDocuments(),
      News.countDocuments({ isPublished: true }),
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ isRead: false }),
      ContactMessage.countDocuments({ isRead: true }),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'approved' }),
      Submission.countDocuments({ status: 'rejected' }),
    ]);

    const feeInr = parseInt(process.env.SUBMISSION_FEE_INR, 10) || 49;
    const totalRevenue = totalSubmissions * feeInr;

    res.json({
      totalUsers,
      totalAdmins,
      activeUsers,
      articles: totalArticles,
      published: publishedArticles,
      drafts: totalArticles - publishedArticles,
      totalMessages,
      unreadMessages,
      readMessages,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalRevenue,
      submissionFee: feeInr,
    });
  } catch (err) {
    next(err);
  }
});

// ---- Articles Management ----

// GET /api/admin/news
router.get('/news', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || 'all').toLowerCase();
    const status = String(req.query.status || 'all').toLowerCase();

    const filter = {};
    if (category !== 'all' && CATEGORIES.includes(category)) {
      filter.category = category;
    }
    if (status === 'published') filter.isPublished = true;
    if (status === 'draft') filter.isPublished = false;

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { source: rx }];
    }

    const items = await News.find(filter).sort({ createdAt: -1 }).populate('author', 'name email role');
    res.json({ articles: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/news
router.post('/news', async (req, res, next) => {
  try {
    const data = pickNews(req.body);
    const error = validateNews(data);
    if (error) return res.status(400).json({ message: error });

    const article = new News({
      ...data,
      author: req.user._id,
      publishedAt: data.isPublished ? new Date() : undefined,
    });
    await article.save();

    res.status(201).json({ article });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/news/:id
router.put('/news/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Article not found' });
    const data = pickNews(req.body);
    const error = validateNews(data);
    if (error) return res.status(400).json({ message: error });

    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    Object.assign(article, data);
    if (data.isPublished && !article.publishedAt) {
      article.publishedAt = new Date();
    }
    await article.save();

    res.json({ article });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/news/:id/status
router.patch('/news/:id/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Article not found' });
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    const nextState = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : !article.isPublished;
    article.isPublished = nextState;
    if (nextState && !article.publishedAt) {
      article.publishedAt = new Date();
    }
    await article.save();

    res.json({ article });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/news/:id
router.delete('/news/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Article not found' });
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ---- User Management ----

// GET /api/admin/users (Viewable by both Primary Admin and Secondary Admins)
router.get('/users', async (req, res, next) => {
  try {
    const search = String(req.query.search || req.query.q || '').trim();
    const roleFilter = String(req.query.role || 'all').toLowerCase();
    const sort = String(req.query.sort || 'newest').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = {};
    if (roleFilter !== 'all' && ['user', 'admin', 'primary_admin'].includes(roleFilter)) {
      filter.role = roleFilter;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { loginIdentifier: rx }];
    }

    const sortOption = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .select('-password'),
    ]);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/role (Primary Admin ONLY)
router.patch('/users/:id/role', primaryAdminOnly, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) return res.status(404).json({ message: 'User not found' });

    const newRole = String(req.body.role || '').toLowerCase();
    if (!['user', 'admin'].includes(newRole)) {
      return res.status(400).json({ message: 'Role must be either "user" or "admin"' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Protect Primary Admin from demotion / modification
    if (targetUser.role === 'primary_admin') {
      return res.status(403).json({ message: 'The Primary Administrator account cannot be modified or demoted.' });
    }

    // Protect against self-demotion
    if (String(req.user._id) === targetId) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole;
    await targetUser.save();

    // Record audit log
    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: newRole === 'admin' ? 'MAKE_ADMIN' : 'REMOVE_ADMIN',
      targetUserId: targetUser._id,
      targetName: targetUser.name,
      targetEmail: targetUser.email,
      previousValue: previousRole,
      newValue: newRole,
      outcome: 'SUCCESS',
      details: `Role changed from ${previousRole} to ${newRole} by Primary Admin`,
      timestamp: new Date(),
    });

    res.json({ user: targetUser });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status (Primary Admin ONLY) - Activate / Deactivate
router.patch('/users/:id/status', primaryAdminOnly, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) return res.status(404).json({ message: 'User not found' });

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Protect Primary Admin from deactivation
    if (targetUser.role === 'primary_admin') {
      return res.status(403).json({ message: 'The Primary Administrator account cannot be deactivated.' });
    }

    // Protect against self-deactivation
    if (String(req.user._id) === targetId) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const nextStatus = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !targetUser.isActive;
    const prevStatus = targetUser.isActive;
    targetUser.isActive = nextStatus;
    await targetUser.save();

    // Record audit log
    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: nextStatus ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      targetUserId: targetUser._id,
      targetName: targetUser.name,
      targetEmail: targetUser.email,
      previousValue: String(prevStatus),
      newValue: String(nextStatus),
      outcome: 'SUCCESS',
      details: `Account ${nextStatus ? 'activated' : 'deactivated'} by Primary Admin`,
      timestamp: new Date(),
    });

    res.json({ user: targetUser });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id (Primary Admin ONLY) - Permanently remove user
router.delete('/users/:id', primaryAdminOnly, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) return res.status(404).json({ message: 'User not found' });

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Protect Primary Admin from deletion
    if (targetUser.role === 'primary_admin') {
      return res.status(403).json({ message: 'The Primary Administrator account cannot be deleted.' });
    }

    // Protect against self-deletion
    if (String(req.user._id) === targetId) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    await User.findByIdAndDelete(targetId);

    // Record audit log
    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: 'DELETE_USER',
      targetUserId: targetUser._id,
      targetName: targetUser.name,
      targetEmail: targetUser.email,
      previousValue: targetUser.role,
      newValue: 'DELETED',
      outcome: 'SUCCESS',
      details: `Account deleted permanently by Primary Admin`,
      timestamp: new Date(),
    });

    res.json({ message: `User "${targetUser.name}" has been permanently removed.` });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/reset-password (Primary Admin ONLY)
// Securely assigns a new password to a user account without ever exposing existing or new password
router.post('/users/:id/reset-password', primaryAdminOnly, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    if (!mongoose.isValidObjectId(targetId)) return res.status(404).json({ message: 'User not found' });

    const newPassword = String(req.body.newPassword || '').trim();
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Target user password assignment (will be bcrypt-hashed via pre('save'))
    targetUser.password = newPassword;
    await targetUser.save();

    // Audit log - records that password was reset without ever logging the secret
    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: 'RESET_USER_PASSWORD',
      targetUserId: targetUser._id,
      targetName: targetUser.name,
      targetEmail: targetUser.email,
      previousValue: '[PROTECTED_HASH]',
      newValue: '[NEW_BCRYPT_HASH]',
      outcome: 'SUCCESS',
      details: `Password securely reset for user "${targetUser.name}" by Primary Admin`,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Password for "${targetUser.name}" has been securely updated.`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs (Primary Admin ONLY)
router.get('/audit-logs', primaryAdminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
});

// ========================================================
// ---- Submissions & Ads Management (Paid ₹49 submissions) ----
// ========================================================

// GET /api/admin/submissions
router.get('/submissions', async (req, res, next) => {
  try {
    const search = String(req.query.search || req.query.q || '').trim();
    const typeFilter = String(req.query.type || 'all').toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (typeFilter !== 'all' && ['news', 'ad'].includes(typeFilter)) {
      filter.type = typeFilter;
    }
    if (statusFilter !== 'all' && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { title: rx },
        { description: rx },
        { authorName: rx },
        { authorEmail: rx },
        { 'payment.razorpayPaymentId': rx },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, submissions] = await Promise.all([
      Submission.countDocuments(filter),
      Submission.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name email role')
        .populate('publishedArticleId', 'title slug isPublished')
        .populate('reviewedBy', 'name email'),
    ]);

    res.json({
      submissions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/submissions/:id
router.get('/submissions/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const submission = await Submission.findById(req.params.id)
      .populate('author', 'name email role')
      .populate('publishedArticleId')
      .populate('reviewedBy', 'name email');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    res.json({ submission });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/submissions/:id/approve (Publishes to live feed)
router.patch('/submissions/:id/approve', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    let article;
    if (submission.publishedArticleId) {
      article = await News.findById(submission.publishedArticleId);
    }

    if (!article) {
      article = new News({
        title: submission.title,
        description: submission.description,
        content: submission.content,
        imageUrl: submission.imageUrl || '',
        category: submission.category || 'top',
        source: submission.source || (submission.type === 'ad' ? 'Sponsored' : 'FlashVarta Community'),
        isPublished: true,
        publishedAt: new Date(),
        author: submission.author,
        type: submission.type,
        isSponsored: submission.type === 'ad',
        targetUrl: submission.targetUrl || '',
        submission: submission._id,
      });
    } else {
      article.title = submission.title;
      article.description = submission.description;
      article.content = submission.content;
      article.imageUrl = submission.imageUrl || '';
      article.category = submission.category;
      article.source = submission.source || (submission.type === 'ad' ? 'Sponsored' : 'FlashVarta Community');
      article.isPublished = true;
      article.publishedAt = article.publishedAt || new Date();
      article.type = submission.type;
      article.isSponsored = submission.type === 'ad';
      article.targetUrl = submission.targetUrl || '';
    }

    await article.save();

    const previousStatus = submission.status;
    submission.status = 'approved';
    submission.publishedArticleId = article._id;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    if (req.body.adminNotes !== undefined) {
      submission.adminNotes = sanitizeText(req.body.adminNotes);
    }
    await submission.save();

    // Audit log
    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: 'APPROVE_SUBMISSION',
      targetUserId: submission.author,
      targetName: submission.authorName,
      targetEmail: submission.authorEmail,
      previousValue: previousStatus,
      newValue: 'APPROVED',
      outcome: 'SUCCESS',
      details: `Admin published ${submission.type.toUpperCase()} "${submission.title}" to live feed (Article ID: ${article._id})`,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Submission approved and published to the live feed as a ${submission.type === 'ad' ? 'Sponsored Ad' : 'Community Story'}.`,
      submission,
      article,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/submissions/:id/reject
router.patch('/submissions/:id/reject', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const previousStatus = submission.status;
    submission.status = 'rejected';
    submission.adminNotes = sanitizeText(req.body.adminNotes || 'Submission did not meet editorial guidelines.');
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();

    // If an article was previously published for this submission, unpublish it
    if (submission.publishedArticleId) {
      await News.findByIdAndUpdate(submission.publishedArticleId, { isPublished: false });
    }

    await submission.save();

    // Audit log
    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: 'REJECT_SUBMISSION',
      targetUserId: submission.author,
      targetName: submission.authorName,
      targetEmail: submission.authorEmail,
      previousValue: previousStatus,
      newValue: 'REJECTED',
      outcome: 'SUCCESS',
      details: `Admin rejected ${submission.type.toUpperCase()} "${submission.title}". Reason: ${submission.adminNotes}`,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Submission has been rejected.',
      submission,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/submissions/:id
router.delete('/submissions/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    if (submission.publishedArticleId) {
      await News.findByIdAndDelete(submission.publishedArticleId);
    }

    await Submission.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      actorUserId: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      action: 'DELETE_SUBMISSION',
      targetUserId: submission.author,
      targetName: submission.authorName,
      targetEmail: submission.authorEmail,
      previousValue: submission.status,
      newValue: 'DELETED',
      outcome: 'SUCCESS',
      details: `Admin deleted ${submission.type.toUpperCase()} submission "${submission.title}" (Payment ID: ${submission.payment?.razorpayPaymentId})`,
      timestamp: new Date(),
    });

    res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


