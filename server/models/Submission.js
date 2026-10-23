const mongoose = require('mongoose');
const CATEGORIES = require('../utils/categories');

const submissionSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    authorName: {
      type: String,
      trim: true,
      default: '',
    },
    authorEmail: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['news', 'ad'],
      default: 'news',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Headline or title is required'],
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'top',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      default: '',
      maxlength: 20000,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    targetUrl: {
      type: String,
      default: '',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    source: {
      type: String,
      default: 'Community News',
      trim: true,
      maxlength: 80,
    },
    payment: {
      amount: { type: Number, default: 49 },
      currency: { type: String, default: 'INR' },
      razorpayOrderId: { type: String, required: true },
      razorpayPaymentId: { type: String, required: true },
      razorpaySignature: { type: String, required: true },
      status: {
        type: String,
        enum: ['paid', 'failed', 'refunded'],
        default: 'paid',
      },
      paidAt: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    publishedArticleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'News',
    },
  },
  { timestamps: true }
);

submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ author: 1, createdAt: -1 });
submissionSchema.index({ 'payment.razorpayPaymentId': 1 });

module.exports = mongoose.model('Submission', submissionSchema);
