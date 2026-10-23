const router = require('express').Router();
const mongoose = require('mongoose');
const News = require('../models/News');
const CATEGORIES = require('../utils/categories');
const { protect, adminOnly, optionalProtect } = require('../middleware/auth');
const { fetchNews } = require('../utils/newsdata');
const { sanitizeText } = require('../utils/sanitize');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isHttpUrl = (s) => {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

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

const fromAdmin = (n) => ({
  id: String(n._id),
  origin: 'admin',
  title: n.title,
  slug: n.slug,
  description: n.description,
  content: n.content,
  imageUrl: n.imageUrl || '',
  url: null,
  source: n.source || 'FlashVarta',
  category: n.category,
  publishedAt: n.publishedAt || n.createdAt,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
  isPublished: n.isPublished,
  author: n.author ? { id: n.author._id, name: n.author.name, email: n.author.email } : undefined,
  type: n.type || 'news',
  isSponsored: Boolean(n.isSponsored || n.type === 'ad'),
  targetUrl: n.targetUrl || '',
});

// GET /api/news?category=&q=&page=
// Public feed: displays ONLY published articles
router.get('/', optionalProtect, async (req, res, next) => {
  try {
    const category = String(req.query.category || 'all').toLowerCase();
    const q = String(req.query.q || '').trim().slice(0, 100);
    const page = req.query.page ? String(req.query.page) : '';

    let articles = [];
    if (!page) {
      const filter = { isPublished: true };
      if (category !== 'all' && CATEGORIES.includes(category)) filter.category = category;
      if (q) {
        const rx = new RegExp(escapeRegex(q), 'i');
        filter.$or = [{ title: rx }, { description: rx }];
      }
      const own = await News.find(filter).sort({ createdAt: -1 }).limit(20).populate('author', 'name email');
      articles = own.map(fromAdmin);
    }

    let nextPage = null;
    let externalError = '';
    try {
      const ext = await fetchNews({ category, q, page });
      articles = articles.concat(ext.articles);
      nextPage = ext.nextPage;
    } catch (err) {
      console.error('NewsData.io error:', err.message);
      externalError = 'Live headlines are unavailable right now. Showing FlashVarta articles only.';
    }

    res.json({ articles, nextPage, externalError });
  } catch (err) {
    next(err);
  }
});

// GET /api/news/:id
// Public single story: displays published article
router.get('/:id', optionalProtect, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Article not found' });
    const n = await News.findOne({ _id: req.params.id, isPublished: true }).populate('author', 'name email');
    if (!n) return res.status(404).json({ message: 'Article not found' });
    res.json({ article: fromAdmin(n) });
  } catch (err) {
    next(err);
  }
});

// POST /api/news (Admin only)
router.post('/', protect, adminOnly, async (req, res, next) => {
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

// PUT /api/news/:id (Admin only)
router.put('/:id', protect, adminOnly, async (req, res, next) => {
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

// PATCH /api/news/:id/status (Admin only)
router.patch('/:id/status', protect, adminOnly, async (req, res, next) => {
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

// DELETE /api/news/:id (Admin only)
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Article not found' });
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
