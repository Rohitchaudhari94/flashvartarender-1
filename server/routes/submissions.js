const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Submission = require('../models/Submission');
const AuditLog = require('../models/AuditLog');
const CATEGORIES = require('../utils/categories');
const { protect } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

// Initialize Razorpay SDK instance
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay API credentials are not configured on the server');
  }
  return new Razorpay({ key_id, key_secret });
};

const isHttpUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// GET /api/submissions/config
// Returns public key ID and fee
router.get('/config', (req, res) => {
  const fee = parseInt(process.env.SUBMISSION_FEE_INR, 10) || 49;
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || '',
    fee,
    currency: 'INR',
  });
});

// POST /api/submissions/create-order
// Generates a Razorpay order for Rs 49
router.post('/create-order', protect, async (req, res, next) => {
  try {
    const feeInr = parseInt(process.env.SUBMISSION_FEE_INR, 10) || 49;
    const amountInPaise = feeInr * 100;

    const rzp = getRazorpayInstance();
    const shortReceipt = `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 6)}`;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: shortReceipt,
      notes: {
        userId: String(req.user._id),
        userName: req.user.name,
        userEmail: req.user.email,
        purpose: 'FlashVarta News/Ad Submission',
      },
    };

    const order = await rzp.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      fee: feeInr,
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    res.status(500).json({
      message: err.error?.description || err.message || 'Failed to initialize payment gateway order',
    });
  }
});

// POST /api/submissions/verify-and-submit
// Validates signature and creates paid news/ad submission
router.post('/verify-and-submit', protect, async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type = 'news',
      title,
      category = 'top',
      description,
      content = '',
      imageUrl = '',
      targetUrl = '',
      contactPhone = '',
      source = '',
    } = req.body;

    // Validate payment credentials
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment transaction verification details' });
    }

    // Verify Razorpay HMAC signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'Server payment configuration missing' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed: Invalid transaction signature' });
    }

    // Check for replay attacks with identical payment ID
    const alreadyProcessed = await Submission.findOne({
      'payment.razorpayPaymentId': razorpay_payment_id,
    });
    if (alreadyProcessed) {
      return res.status(409).json({ message: 'This payment has already been credited to a submission.' });
    }

    // Validate submission inputs
    const cleanTitle = sanitizeText(title);
    const cleanDesc = sanitizeText(description);
    const cleanContent = sanitizeText(content);
    const cleanImg = String(imageUrl || '').trim();
    const cleanTarget = String(targetUrl || '').trim();
    const cleanPhone = sanitizeText(contactPhone);
    const cleanCat = String(category || 'top').toLowerCase();
    const cleanType = ['news', 'ad'].includes(type) ? type : 'news';

    if (!cleanTitle) return res.status(400).json({ message: 'Headline/Title is required' });
    if (!cleanDesc) return res.status(400).json({ message: 'Short summary or description is required' });
    if (!CATEGORIES.includes(cleanCat)) return res.status(400).json({ message: 'Invalid category selected' });
    if (cleanImg && !isHttpUrl(cleanImg)) {
      return res.status(400).json({ message: 'Image URL must start with http:// or https://' });
    }
    if (cleanTarget && !isHttpUrl(cleanTarget)) {
      return res.status(400).json({ message: 'Target link must start with http:// or https://' });
    }

    const feeInr = parseInt(process.env.SUBMISSION_FEE_INR, 10) || 49;

    const submission = new Submission({
      author: req.user._id,
      authorName: req.user.name,
      authorEmail: req.user.email,
      type: cleanType,
      title: cleanTitle,
      category: cleanCat,
      description: cleanDesc,
      content: cleanContent,
      imageUrl: cleanImg,
      targetUrl: cleanTarget,
      contactPhone: cleanPhone,
      source: sanitizeText(source) || (cleanType === 'ad' ? 'Sponsored' : `${req.user.name} (Community)`),
      payment: {
        amount: feeInr,
        currency: 'INR',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid',
        paidAt: new Date(),
      },
      status: 'pending',
    });

    await submission.save();

    // Create audit log for record keeping
    try {
      await AuditLog.create({
        actorUserId: req.user._id,
        actorName: req.user.name,
        actorEmail: req.user.email,
        action: 'NEWS_SUBMISSION_PAID',
        targetUserId: req.user._id,
        targetName: req.user.name,
        targetEmail: req.user.email,
        previousValue: 'NEW',
        newValue: 'PENDING',
        outcome: 'SUCCESS',
        details: `User submitted ${cleanType.toUpperCase()} "${cleanTitle}" after successful payment of ₹${feeInr} (Payment ID: ${razorpay_payment_id})`,
        timestamp: new Date(),
      });
    } catch {
      /* audit log quiet failure, do not abort transaction */
    }

    res.status(201).json({
      success: true,
      message: 'Payment verified successfully! Your submission has been sent to our editorial desk for review.',
      submission,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/submissions/my
// Returns all submissions created by the logged-in user
router.get('/my', protect, async (req, res, next) => {
  try {
    const submissions = await Submission.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .populate('publishedArticleId', 'title slug');

    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

// GET /api/submissions/:id
// Get single submission by ID (author or admin)
router.get('/:id', protect, async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('publishedArticleId');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const isAuthor = String(submission.author) === String(req.user._id);
    const isAdmin = ['admin', 'primary_admin'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to view this submission' });
    }

    res.json({ submission });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
