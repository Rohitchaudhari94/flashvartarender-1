import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ALL_CATEGORIES } from '../utils.js';
import { Bolt } from '../components/Logo.jsx';

const EMPTY_FORM = {
  type: 'news', // 'news' | 'ad'
  title: '',
  category: 'top',
  description: '',
  content: '',
  imageUrl: '',
  targetUrl: '',
  contactPhone: '',
  source: '',
};

// Dynamically load Razorpay checkout script if not already present
function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ShareNews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: '', text: '' });
  const [paymentConfig, setPaymentConfig] = useState({ keyId: '', fee: 49, currency: 'INR' });

  // Receipt Modal state after successful payment & submission
  const [receipt, setReceipt] = useState(null);

  // User's past submissions
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Set default type from URL query if present (e.g. ?type=ad)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');
    if (typeParam === 'ad' || typeParam === 'news') {
      setFormData((prev) => ({ ...prev, type: typeParam }));
    }
  }, [location.search]);

  // Load payment gateway config
  useEffect(() => {
    api
      .get('/submissions/config')
      .then((cfg) => {
        if (cfg) setPaymentConfig(cfg);
      })
      .catch(() => {
        /* fallback to defaults */
      });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.text) return undefined;
    const t = setTimeout(() => setToast({ type: '', text: '' }), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load User's Submission History
  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingHistory(true);
      const res = await api.get('/submissions/my');
      setMySubmissions(res.submissions || []);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeSelect = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      source: type === 'ad' && !prev.source ? 'Sponsored' : prev.source,
    }));
  };

  // Main Submit & Payment Trigger
  const handleProceedToPayment = async (e) => {
    e.preventDefault();

    if (!user) {
      setToast({
        type: 'error',
        text: 'Please sign in or register an account before submitting news or advertisements.',
      });
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      setToast({ type: 'error', text: 'Please enter a title or headline.' });
      return;
    }
    if (!formData.description.trim()) {
      setToast({ type: 'error', text: 'Please enter a brief summary description.' });
      return;
    }
    if (formData.imageUrl && !formData.imageUrl.startsWith('http')) {
      setToast({ type: 'error', text: 'Image URL must start with http:// or https://' });
      return;
    }
    if (formData.type === 'ad' && formData.targetUrl && !formData.targetUrl.startsWith('http')) {
      setToast({ type: 'error', text: 'Target link must start with http:// or https://' });
      return;
    }

    setIsSubmitting(true);
    setToast({ type: '', text: '' });

    try {
      // Ensure Razorpay SDK is loaded
      const isSdkLoaded = await loadRazorpaySdk();
      if (!isSdkLoaded) {
        throw new Error('Could not load Razorpay payment SDK. Please check your internet connection.');
      }

      // Step 1: Create Order on Backend
      const orderData = await api.post('/submissions/create-order');
      if (!orderData || !orderData.orderId) {
        throw new Error('Failed to generate payment order from server.');
      }

      const razorpayKey = orderData.keyId || paymentConfig.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        throw new Error('Razorpay Key ID is not configured on server.');
      }

      // Step 2: Configure Razorpay Checkout options
      const options = {
        key: razorpayKey,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'FlashVarta News Network',
        description: `${formData.type === 'ad' ? 'Advertisement' : 'News'} Publishing Fee (₹${orderData.fee || 49})`,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: formData.contactPhone || '',
        },
        notes: {
          submissionType: formData.type,
          headline: formData.title.slice(0, 40),
        },
        theme: {
          color: '#e8431c',
        },
        handler: async function (response) {
          // Step 3: Payment verified on Razorpay client, now verify signature & record submission on backend
          try {
            setToast({ type: 'ok', text: 'Payment successful! Verifying transaction with editorial server...' });

            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...formData,
              source:
                formData.source.trim() ||
                (formData.type === 'ad' ? 'Sponsored' : `${user.name} (Community)`),
            };

            const result = await api.post('/submissions/verify-and-submit', verificationPayload);

            setReceipt({
              submission: result.submission,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              amount: paymentConfig.fee || 49,
            });

            // Reset form
            setFormData(EMPTY_FORM);
          } catch (err) {
            setToast({
              type: 'error',
              text: err.message || 'Payment verification failed. Please contact admin support with your payment ID.',
            });
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setToast({ type: 'error', text: 'Payment window was closed before completing payment.' });
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (res) {
        setIsSubmitting(false);
        setToast({
          type: 'error',
          text: `Payment failed: ${res.error?.description || 'Transaction declined'}`,
        });
      });

      razorpayInstance.open();
    } catch (err) {
      setIsSubmitting(false);
      setToast({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    }
  };

  return (
    <div className="share-news-container">
      {/* Toast Notification */}
      {toast.text && (
        <div
          className={`alert ${toast.type === 'ok' ? 'alert-ok' : 'alert-error'} toast-alert`}
          role="status"
        >
          <span>{toast.type === 'ok' ? '✓ ' : '✕ '}</span>
          {toast.text}
        </div>
      )}

      {/* Header Banner */}
      <section className="share-news-hero">
        <div className="hero-badge-row">
          <span className="hero-pill-badge">📢 Community Journalism &amp; Promotion</span>
          <span className="hero-price-pill">₹{paymentConfig.fee || 49} Publishing Fee</span>
        </div>
        <h1 className="share-news-title">Share News or Advertise on FlashVarta</h1>
        <p className="share-news-subtitle">
          Have breaking local news or an advertisement for your business? Submit your story for{' '}
          <strong>₹{paymentConfig.fee || 49}</strong>. Our editorial admin desk verifies and publishes it directly to
          thousands of daily readers across India.
        </p>

        {/* Feature Badges */}
        <div className="share-news-features">
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <div>
              <strong>Instant Razorpay Payment</strong>
              <p>UPI, GPay, PhonePe, Cards, Netbanking</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🛡️</span>
            <div>
              <strong>Verified Editorial Review</strong>
              <p>Reviewed &amp; approved by FlashVarta Admin</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌐</span>
            <div>
              <strong>High Visibility</strong>
              <p>Featured in live feed and category streams</p>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs (Submit vs My Submissions) */}
      <div className="share-news-tabs">
        <button
          type="button"
          className={`share-tab ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          📝 New Submission (₹{paymentConfig.fee || 49})
        </button>
        <button
          type="button"
          className={`share-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 My Submissions
          {mySubmissions.length > 0 && <span className="tab-pill">{mySubmissions.length}</span>}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SUBMISSION FORM & LIVE PREVIEW */}
      {/* ======================================================== */}
      {activeTab === 'submit' && (
        <div className="share-news-workspace">
          {/* Left Column: Submission Form */}
          <div className="share-form-card">
            {/* Type Switcher */}
            <div className="type-toggle-container">
              <span className="type-toggle-label">Select Submission Type:</span>
              <div className="type-toggle-buttons">
                <button
                  type="button"
                  className={`type-btn ${formData.type === 'news' ? 'active' : ''}`}
                  onClick={() => handleTypeSelect('news')}
                >
                  <span className="type-icon">📰</span>
                  <div className="type-btn-text">
                    <strong>News Article</strong>
                    <small>Breaking event, report, community story</small>
                  </div>
                </button>
                <button
                  type="button"
                  className={`type-btn ${formData.type === 'ad' ? 'active' : ''}`}
                  onClick={() => handleTypeSelect('ad')}
                >
                  <span className="type-icon">🎯</span>
                  <div className="type-btn-text">
                    <strong>Advertisement / Promotion</strong>
                    <small>Business promo, product launch, services</small>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="share-news-form">
              {/* Category */}
              <div className="form-group">
                <label htmlFor="share-category" className="form-label">
                  Category <span className="req">*</span>
                </label>
                <select
                  id="share-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input select-input"
                  required
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Headline */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="share-title" className="form-label">
                    {formData.type === 'ad' ? 'Ad Headline / Promo Title' : 'News Headline'}{' '}
                    <span className="req">*</span>
                  </label>
                  <span className="char-count">{formData.title.length}/200</span>
                </div>
                <input
                  id="share-title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={
                    formData.type === 'ad'
                      ? 'e.g., Grand Opening: Fresh Organic Grocery Now in Pune!'
                      : 'e.g., Heavy Rainfall Alerts Issued Across Coastal Maharashtra'
                  }
                  maxLength={200}
                  className="input"
                  required
                />
              </div>

              {/* Short Summary Description */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="share-desc" className="form-label">
                    Short Summary (displayed on feed card) <span className="req">*</span>
                  </label>
                  <span className="char-count">{formData.description.length}/500</span>
                </div>
                <textarea
                  id="share-desc"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide a 1-3 sentence summary that grabs reader attention..."
                  maxLength={500}
                  className="input textarea"
                  required
                />
              </div>

              {/* Detailed Article or Ad Body */}
              <div className="form-group">
                <label htmlFor="share-content" className="form-label">
                  Full Story Details / Description
                </label>
                <textarea
                  id="share-content"
                  name="content"
                  rows={6}
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Write the full news story details or comprehensive advertisement breakdown..."
                  className="input textarea"
                />
              </div>

              {/* Image URL */}
              <div className="form-group">
                <label htmlFor="share-img" className="form-label">
                  Banner / Image URL (optional)
                </label>
                <input
                  id="share-img"
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/images/story-banner.jpg"
                  className="input"
                />
                <span className="input-hint">Direct link to an image (JPG, PNG, WebP)</span>
              </div>

              {/* Ad Specific Fields */}
              {formData.type === 'ad' && (
                <div className="ad-extra-fields">
                  <div className="form-group">
                    <label htmlFor="share-target" className="form-label">
                      Target Website / Landing Page Link
                    </label>
                    <input
                      id="share-target"
                      type="url"
                      name="targetUrl"
                      value={formData.targetUrl}
                      onChange={handleChange}
                      placeholder="https://yourbrand.com/special-offer"
                      className="input"
                    />
                    <span className="input-hint">Where readers are redirected when clicking your ad</span>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label htmlFor="share-phone" className="form-label">
                        Contact / WhatsApp Number
                      </label>
                      <input
                        id="share-phone"
                        type="text"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="share-source" className="form-label">
                        Brand / Advertiser Name
                      </label>
                      <input
                        id="share-source"
                        type="text"
                        name="source"
                        value={formData.source}
                        onChange={handleChange}
                        placeholder="e.g., Pune Agro Co."
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* News Source / Submitter Attribution (if News) */}
              {formData.type === 'news' && (
                <div className="form-group">
                  <label htmlFor="share-source" className="form-label">
                    News Source / Byline
                  </label>
                  <input
                    id="share-source"
                    type="text"
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    placeholder={user?.name ? `${user.name} (Citizen Reporter)` : 'Community News'}
                    className="input"
                  />
                </div>
              )}

              {/* Payment Summary Box */}
              <div className="payment-checkout-box">
                <div className="checkout-breakdown">
                  <div className="checkout-row">
                    <span>Editorial Review &amp; Publishing Fee</span>
                    <strong>₹{paymentConfig.fee || 49}.00</strong>
                  </div>
                  <div className="checkout-row">
                    <span>Gateway Processing (Razorpay)</span>
                    <span className="free-tag">FREE</span>
                  </div>
                  <div className="checkout-divider" />
                  <div className="checkout-total">
                    <span>Total Amount Payable:</span>
                    <span className="checkout-total-price">₹{paymentConfig.fee || 49}.00</span>
                  </div>
                </div>

                {!user && (
                  <div className="alert alert-warn checkout-auth-alert">
                    <span>⚠️ Please sign in to link your account to this submission.</span>
                    <Link to="/" className="btn btn-outline btn-sm">
                      Sign In / Register
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-block checkout-pay-btn"
                >
                  {isSubmitting ? (
                    <span className="btn-loading">
                      <span className="spinner-inline" /> Processing Gateway...
                    </span>
                  ) : (
                    `🔒 Pay ₹${paymentConfig.fee || 49} & Submit for Admin Review`
                  )}
                </button>

                <p className="payment-guarantee">
                  🛡️ 100% Secure 256-bit encryption by Razorpay. Admin reviews submission within hours.
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Live Card Preview */}
          <div className="share-preview-column">
            <div className="preview-sticky">
              <div className="preview-header">
                <h3>Live Feed Preview</h3>
                <span className="preview-badge">Real-time Simulation</span>
              </div>
              <p className="preview-help">
                This is exactly how your {formData.type === 'ad' ? 'sponsored advertisement' : 'news story'} will
                appear to readers on the FlashVarta homepage:
              </p>

              {/* Render Simulated NewsCard */}
              <div className={`card preview-news-card ${formData.type === 'ad' ? 'card-ad' : ''}`}>
                <div className="card-media">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Preview banner"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="card-ph">
                      <Bolt size={36} />
                    </div>
                  )}
                  <span className="chip">{formData.category || 'top'}</span>
                  {formData.type === 'ad' && <span className="ad-badge-corner">Sponsored</span>}
                </div>
                <div className="card-body">
                  <h3 className="card-title">
                    {formData.title || 'Your Headline Will Appear Here Once Typed'}
                  </h3>
                  <p className="card-desc">
                    {formData.description ||
                      'Your summary description will be shown here to summarize the story or offer.'}
                  </p>
                  <div className="card-meta">
                    <span className="src">
                      {formData.source || (formData.type === 'ad' ? 'Sponsored' : user?.name || 'Community')}
                    </span>
                    {formData.type === 'ad' ? (
                      <span className="badge badge-ad">Sponsored Ad</span>
                    ) : (
                      <span className="badge badge-community">Community</span>
                    )}
                    <span className="when">Just now</span>
                  </div>
                  {formData.type === 'ad' && formData.targetUrl && (
                    <div className="ad-action-row">
                      <span className="ad-cta-link">Visit Sponsor Link &rarr;</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Publishing Workflow explanation */}
              <div className="workflow-steps-box">
                <h4>Publishing Workflow</h4>
                <ol className="workflow-steps">
                  <li>
                    <strong>1. Submit &amp; Pay</strong>
                    <span>Pay ₹{paymentConfig.fee || 49} securely via Razorpay UPI or cards.</span>
                  </li>
                  <li>
                    <strong>2. Editorial Verification</strong>
                    <span>FlashVarta admin verifies authenticity and guidelines compliance.</span>
                  </li>
                  <li>
                    <strong>3. Published Live</strong>
                    <span>Goes live immediately on homepage feed with instant notifications.</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MY SUBMISSIONS HISTORY */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <section className="my-submissions-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">My News &amp; Advertisement Submissions</h2>
              <p className="muted">Track the editorial approval status of your paid submissions</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={loadHistory}>
              🔄 Refresh List
            </button>
          </div>

          {!user ? (
            <div className="empty-submissions">
              <p>Please log in to view your submission history.</p>
              <Link to="/" className="btn btn-primary">
                Sign In / Register
              </Link>
            </div>
          ) : loadingHistory ? (
            <div className="center-block">
              <div className="spinner" aria-label="Loading submissions" />
            </div>
          ) : mySubmissions.length === 0 ? (
            <div className="empty-submissions">
              <div className="empty-icon">📰</div>
              <h3>No Submissions Found</h3>
              <p>You haven&rsquo;t submitted any news articles or advertisements yet.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab('submit')}
              >
                Submit Your First News / Ad (₹{paymentConfig.fee || 49})
              </button>
            </div>
          ) : (
            <div className="submissions-grid">
              {mySubmissions.map((sub) => (
                <div key={sub._id} className="submission-card">
                  <div className="sub-header">
                    <div className="sub-type-badge-row">
                      <span className={`badge ${sub.type === 'ad' ? 'badge-ad' : 'badge-community'}`}>
                        {sub.type === 'ad' ? '🎯 Advertisement' : '📰 News Article'}
                      </span>
                      <span className="sub-cat-pill">{sub.category}</span>
                    </div>

                    <div className="sub-status-container">
                      {sub.status === 'pending' && (
                        <span className="status-badge status-pending">⏳ Pending Review</span>
                      )}
                      {sub.status === 'approved' && (
                        <span className="status-badge status-approved">✅ Published Live</span>
                      )}
                      {sub.status === 'rejected' && (
                        <span className="status-badge status-rejected">❌ Rejected</span>
                      )}
                    </div>
                  </div>

                  <h3 className="sub-title">{sub.title}</h3>
                  <p className="sub-desc">{sub.description}</p>

                  {/* Payment Metadata */}
                  <div className="sub-payment-info">
                    <div className="payment-meta-item">
                      <span className="meta-k">Amount Paid:</span>
                      <strong className="meta-v">₹{sub.payment?.amount || 49} (Paid)</strong>
                    </div>
                    <div className="payment-meta-item">
                      <span className="meta-k">Payment ID:</span>
                      <code className="payment-id-code">{sub.payment?.razorpayPaymentId}</code>
                    </div>
                    <div className="payment-meta-item">
                      <span className="meta-k">Submitted:</span>
                      <span className="meta-v">
                        {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Editorial Admin Feedback (if rejected) */}
                  {sub.status === 'rejected' && sub.adminNotes && (
                    <div className="admin-rejection-notes">
                      <strong>Editorial Feedback:</strong>
                      <p>{sub.adminNotes}</p>
                    </div>
                  )}

                  {/* Live Article Link (if approved) */}
                  {sub.status === 'approved' && sub.publishedArticleId && (
                    <div className="sub-live-action">
                      <Link
                        to={`/news/${sub.publishedArticleId._id || sub.publishedArticleId}`}
                        className="btn btn-outline btn-sm btn-block"
                      >
                        👁️ View Live on FlashVarta &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* SUCCESS RECEIPT MODAL */}
      {/* ======================================================== */}
      {receipt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-dialog receipt-dialog">
            <div className="receipt-header">
              <div className="receipt-check-circle">✓</div>
              <h2 className="receipt-title">Payment Received!</h2>
              <p className="receipt-sub">Your submission has been sent to our editorial desk.</p>
            </div>

            <div className="receipt-body">
              <div className="receipt-row">
                <span>Transaction Status:</span>
                <strong className="ok-text">SUCCESSFUL (PAID)</strong>
              </div>
              <div className="receipt-row">
                <span>Amount Paid:</span>
                <strong>₹{receipt.amount}.00 INR</strong>
              </div>
              <div className="receipt-row">
                <span>Razorpay Payment ID:</span>
                <code>{receipt.paymentId}</code>
              </div>
              <div className="receipt-row">
                <span>Submission Type:</span>
                <span className="capitalize">{receipt.submission?.type || 'News'}</span>
              </div>
              <div className="receipt-row">
                <span>Title:</span>
                <span className="receipt-headline-truncate">{receipt.submission?.title}</span>
              </div>
              <div className="receipt-row">
                <span>Editorial Status:</span>
                <span className="status-badge status-pending">Under Admin Review</span>
              </div>

              <div className="receipt-note-box">
                ℹ️ Our editorial team reviews submissions for community standards and quality. Once approved, your{' '}
                {receipt.submission?.type === 'ad' ? 'advertisement' : 'story'} will go live immediately on the
                FlashVarta main feed!
              </div>
            </div>

            <div className="modal-footer receipt-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setReceipt(null);
                  setActiveTab('history');
                }}
              >
                View in My Submissions &rarr;
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setReceipt(null);
                  setActiveTab('submit');
                }}
              >
                Submit Another News/Ad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
