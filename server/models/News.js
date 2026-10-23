const mongoose = require('mongoose');
const CATEGORIES = require('../utils/categories');

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
    description: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
      maxlength: 500,
    },
    content: { type: String, default: '', maxlength: 20000 },
    imageUrl: { type: String, default: '', trim: true },
    category: { type: String, enum: CATEGORIES, default: 'top' },
    source: { type: String, default: 'FlashVarta', trim: true, maxlength: 80 },
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date },
    slug: { type: String, trim: true, lowercase: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['news', 'ad'], default: 'news' },
    targetUrl: { type: String, default: '', trim: true },
    isSponsored: { type: Boolean, default: false },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  },
  { timestamps: true }
);

newsSchema.pre('save', function (next) {
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 100);
  }
  next();
});

newsSchema.index({ createdAt: -1 });
newsSchema.index({ slug: 1 });

module.exports = mongoose.model('News', newsSchema);
