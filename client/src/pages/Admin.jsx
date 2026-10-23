import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ALL_CATEGORIES, timeAgo } from '../utils.js';

const EMPTY_ARTICLE = {
  title: '',
  description: '',
  content: '',
  imageUrl: '',
  category: 'top',
  source: 'FlashVarta',
  isPublished: true,
};

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'articles' | 'messages' | 'users'

  // Statistics
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Articles state
  const [articles, setArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleCategory, setArticleCategory] = useState('all');
  const [articleStatus, setArticleStatus] = useState('all');
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [showArticleForm, setShowArticleForm] = useState(false);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messageTotal, setMessageTotal] = useState(0);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotalPages, setMessageTotalPages] = useState(1);
  const [messageStats, setMessageStats] = useState({ total: 0, unread: 0, read: 0 });
  const [messageSearch, setMessageSearch] = useState('');
  const [messageStatusFilter, setMessageStatusFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [messageSort, setMessageSort] = useState('newest'); // 'newest' | 'oldest'
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState('newest');

  // Submissions & Ads state (Paid ₹49 submissions)
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionTotal, setSubmissionTotal] = useState(0);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionTotalPages, setSubmissionTotalPages] = useState(1);
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState('all'); // 'all' | 'news' | 'ad'
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, submission: null, reason: '' });

  // Password reset modal state (Primary Admin ONLY)
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    user: null,
    newPassword: '',
    showPassword: false,
    busy: false,
    error: '',
  });

  // Confirmation Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmType: 'primary', // 'primary' | 'danger'
    onConfirm: null,
  });

  // Notifications and Busy state
  const [toast, setToast] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const isPrimaryAdmin = currentUser?.role === 'primary_admin';

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.text) return undefined;
    const t = setTimeout(() => setToast({ type: '', text: '' }), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load Dashboard Statistics
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await api.get('/admin/stats');
      setStats(data);
      if (data.totalMessages !== undefined) {
        setMessageStats({
          total: data.totalMessages || 0,
          unread: data.unreadMessages || 0,
          read: data.readMessages || 0,
        });
      }
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Articles
  const loadArticles = useCallback(async () => {
    try {
      setArticlesLoading(true);
      const queryParams = new URLSearchParams();
      if (articleSearch) queryParams.set('q', articleSearch);
      if (articleCategory !== 'all') queryParams.set('category', articleCategory);
      if (articleStatus !== 'all') queryParams.set('status', articleStatus);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const data = await api.get(`/admin/news${qs}`);
      setArticles(data.articles || []);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setArticlesLoading(false);
    }
  }, [articleSearch, articleCategory, articleStatus]);

  // Load Messages
  const loadMessages = useCallback(async () => {
    try {
      setMessagesLoading(true);
      const queryParams = new URLSearchParams({
        page: String(messagePage),
        limit: '10',
        sort: messageSort,
      });
      if (messageSearch) queryParams.set('search', messageSearch);
      if (messageStatusFilter !== 'all') queryParams.set('status', messageStatusFilter);

      const data = await api.get(`/contact/admin/messages?${queryParams.toString()}`);
      setMessages(data.messages || []);
      setMessageTotal(data.total || 0);
      setMessageTotalPages(data.totalPages || 1);
      if (data.stats) {
        setMessageStats(data.stats);
      }
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setMessagesLoading(false);
    }
  }, [messagePage, messageSearch, messageStatusFilter, messageSort]);

  // Load Users
  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const queryParams = new URLSearchParams({
        page: String(userPage),
        limit: '10',
        sort: userSort,
      });
      if (userSearch) queryParams.set('search', userSearch);
      if (userRoleFilter !== 'all') queryParams.set('role', userRoleFilter);

      const data = await api.get(`/admin/users?${queryParams.toString()}`);
      setUsers(data.users || []);
      setUserTotal(data.total || 0);
      setUserTotalPages(data.totalPages || 1);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userSearch, userRoleFilter, userSort]);

  // Load Submissions
  const loadSubmissions = useCallback(async () => {
    try {
      setSubmissionsLoading(true);
      const queryParams = new URLSearchParams({
        page: String(submissionPage),
        limit: '15',
      });
      if (submissionSearch) queryParams.set('search', submissionSearch);
      if (submissionTypeFilter !== 'all') queryParams.set('type', submissionTypeFilter);
      if (submissionStatusFilter !== 'all') queryParams.set('status', submissionStatusFilter);

      const data = await api.get(`/admin/submissions?${queryParams.toString()}`);
      setSubmissions(data.submissions || []);
      setSubmissionTotal(data.total || 0);
      setSubmissionTotalPages(data.totalPages || 1);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setSubmissionsLoading(false);
    }
  }, [submissionPage, submissionSearch, submissionTypeFilter, submissionStatusFilter]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadArticles();
    loadMessages();
    loadUsers();
    loadSubmissions();
  }, [loadStats, loadArticles, loadMessages, loadUsers, loadSubmissions]);

  const closeModal = () => {
    setModal({
      isOpen: false,
      title: '',
      message: '',
      confirmText: 'Confirm',
      confirmType: 'primary',
      onConfirm: null,
    });
  };

  // ----------------------------------------------------
  // Article Handlers
  // ----------------------------------------------------
  const handleOpenNewArticle = () => {
    setEditingArticleId(null);
    setArticleForm(EMPTY_ARTICLE);
    setShowArticleForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEditArticle = (a) => {
    setEditingArticleId(a._id);
    setArticleForm({
      title: a.title,
      description: a.description,
      content: a.content || '',
      imageUrl: a.imageUrl || '',
      category: a.category || 'top',
      source: a.source || 'FlashVarta',
      isPublished: Boolean(a.isPublished),
    });
    setShowArticleForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseArticleForm = () => {
    setShowArticleForm(false);
    setEditingArticleId(null);
    setArticleForm(EMPTY_ARTICLE);
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingArticleId) {
        await api.put(`/admin/news/${editingArticleId}`, articleForm);
        setToast({ type: 'ok', text: 'Article updated successfully.' });
      } else {
        await api.post('/admin/news', articleForm);
        setToast({
          type: 'ok',
          text: articleForm.isPublished ? 'Article published successfully to the live feed.' : 'Article saved as draft.',
        });
      }
      handleCloseArticleForm();
      await Promise.all([loadArticles(), loadStats()]);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePublish = async (a) => {
    try {
      await api.patch(`/admin/news/${a._id}/status`, { isPublished: !a.isPublished });
      setToast({
        type: 'ok',
        text: a.isPublished ? `"${a.title}" moved to drafts.` : `"${a.title}" published to live feed.`,
      });
      await Promise.all([loadArticles(), loadStats()]);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  };

  const handleDeleteArticleClick = (a) => {
    setModal({
      isOpen: true,
      title: 'Delete Article',
      message: `Are you sure you want to permanently delete "${a.title}"? This action cannot be undone.`,
      confirmText: 'Delete Article',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await api.del(`/admin/news/${a._id}`);
          setToast({ type: 'ok', text: 'Article deleted successfully.' });
          closeModal();
          await Promise.all([loadArticles(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  // ----------------------------------------------------
  // Messages Handlers
  // ----------------------------------------------------
  const handleOpenViewMessage = async (msg) => {
    setSelectedMessage(msg);
    setShowMessageModal(true);

    // If message is unread, automatically mark as read
    if (!msg.isRead) {
      try {
        await api.patch(`/contact/admin/messages/${msg._id}/read`, { isRead: true });
        // Update in-memory message status
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, isRead: true } : m))
        );
        setSelectedMessage((prev) => (prev ? { ...prev, isRead: true } : null));
        // Update stats
        setMessageStats((prev) => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          read: prev.read + 1,
        }));
        loadStats();
      } catch {
        /* quiet fail on auto-read, not blocking message view */
      }
    }
  };

  const handleCloseMessageModal = () => {
    setShowMessageModal(false);
    setSelectedMessage(null);
  };

  const handleToggleMessageRead = async (msg, e) => {
    if (e) e.stopPropagation();
    try {
      const nextRead = !msg.isRead;
      await api.patch(`/contact/admin/messages/${msg._id}/read`, { isRead: nextRead });
      setToast({
        type: 'ok',
        text: nextRead ? `Message marked as read.` : `Message marked as unread.`,
      });

      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, isRead: nextRead } : m))
      );

      if (selectedMessage && selectedMessage._id === msg._id) {
        setSelectedMessage((prev) => ({ ...prev, isRead: nextRead }));
      }

      await Promise.all([loadMessages(), loadStats()]);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  };

  const handleDeleteMessageClick = (msg, e) => {
    if (e) e.stopPropagation();
    setModal({
      isOpen: true,
      title: 'Delete Contact Message',
      message: `Are you sure you want to permanently delete the message from "${msg.name}" regarding "${msg.subject}"? This action cannot be undone.`,
      confirmText: 'Delete Message',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await api.del(`/contact/admin/messages/${msg._id}`);
          setToast({ type: 'ok', text: `Message from "${msg.name}" deleted successfully.` });
          closeModal();
          if (selectedMessage && selectedMessage._id === msg._id) {
            handleCloseMessageModal();
          }
          await Promise.all([loadMessages(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  // ----------------------------------------------------
  // User Management Handlers (Primary Admin Only actions)
  // ----------------------------------------------------
  const handlePromoteUserClick = (u) => {
    if (!isPrimaryAdmin) return;
    setModal({
      isOpen: true,
      title: 'Promote User to Administrator',
      message: `Are you sure you want to promote ${u.name} (${u.email}) to Administrator? This account will gain full privileges to create, edit, publish, and delete news articles on FlashVarta.`,
      confirmText: 'Promote to Admin',
      confirmType: 'primary',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${u._id}/role`, { role: 'admin' });
          setToast({ type: 'ok', text: `${u.name} is now an Administrator.` });
          closeModal();
          await Promise.all([loadUsers(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  const handleDemoteAdminClick = (u) => {
    if (!isPrimaryAdmin) return;
    setModal({
      isOpen: true,
      title: 'Revoke Administrator Role',
      message: `Are you sure you want to remove the Administrator role from ${u.name} (${u.email})? They will return to a standard Registered User account without article publishing access.`,
      confirmText: 'Remove Admin Role',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${u._id}/role`, { role: 'user' });
          setToast({ type: 'ok', text: `Admin role removed for ${u.name}.` });
          closeModal();
          await Promise.all([loadUsers(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  const handleToggleUserStatusClick = (u) => {
    if (!isPrimaryAdmin) return;
    const willDeactivate = u.isActive;
    setModal({
      isOpen: true,
      title: willDeactivate ? 'Deactivate User Account' : 'Reactivate User Account',
      message: willDeactivate
        ? `Are you sure you want to deactivate ${u.name}'s account? Their existing sessions will be immediately invalidated and they will be prevented from logging in.`
        : `Reactivate access for ${u.name}? They will be able to log in normally.`,
      confirmText: willDeactivate ? 'Deactivate Account' : 'Reactivate Account',
      confirmType: willDeactivate ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${u._id}/status`, { isActive: !u.isActive });
          setToast({
            type: 'ok',
            text: willDeactivate ? `${u.name}'s account has been deactivated.` : `${u.name}'s account has been reactivated.`,
          });
          closeModal();
          await Promise.all([loadUsers(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  const handleDeleteUserClick = (u) => {
    if (!isPrimaryAdmin) return;
    setModal({
      isOpen: true,
      title: 'Permanently Remove User',
      message: `Are you sure you want to permanently delete ${u.name} (${u.email})? This action immediately revokes access and permanently deletes the account from the database.`,
      confirmText: 'Permanently Delete',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await api.del(`/admin/users/${u._id}`);
          setToast({ type: 'ok', text: `Account for ${u.name} deleted permanently.` });
          closeModal();
          await Promise.all([loadUsers(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  // Secure Password Reset by Primary Admin (Passwords are NEVER displayed, only masked and securely hashed)
  const handleOpenResetPasswordModal = (u) => {
    setResetModal({
      isOpen: true,
      user: u,
      newPassword: '',
      showPassword: false,
      busy: false,
      error: '',
    });
  };

  const handleCloseResetPasswordModal = () => {
    setResetModal({
      isOpen: false,
      user: null,
      newPassword: '',
      showPassword: false,
      busy: false,
      error: '',
    });
  };

  const handleExecutePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword || resetModal.newPassword.length < 6) {
      setResetModal((prev) => ({ ...prev, error: 'Password must be at least 6 characters long.' }));
      return;
    }

    setResetModal((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      await api.post(`/admin/users/${resetModal.user._id}/reset-password`, {
        newPassword: resetModal.newPassword,
      });
      setToast({
        type: 'ok',
        text: `Password for "${resetModal.user.name}" updated securely with bcrypt encryption.`,
      });
      handleCloseResetPasswordModal();
    } catch (err) {
      setResetModal((prev) => ({ ...prev, error: err.message, busy: false }));
    }
  };

  // ----------------------------------------------------
  // Submissions Handlers (Paid ₹49 Submissions & Ads)
  // ----------------------------------------------------
  const handleOpenViewSubmission = (sub) => {
    setSelectedSubmission(sub);
    setShowSubmissionModal(true);
  };

  const handleCloseSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedSubmission(null);
  };

  const handleApproveSubmission = async (sub) => {
    try {
      setBusy(true);
      await api.patch(`/admin/submissions/${sub._id}/approve`);
      setToast({
        type: 'ok',
        text: `"${sub.title}" approved and published to the live feed!`,
      });
      if (selectedSubmission && selectedSubmission._id === sub._id) {
        handleCloseSubmissionModal();
      }
      await Promise.all([loadSubmissions(), loadArticles(), loadStats()]);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRejectSubmissionModal = (sub) => {
    setRejectModal({
      isOpen: true,
      submission: sub,
      reason: '',
    });
  };

  const handleCloseRejectModal = () => {
    setRejectModal({ isOpen: false, submission: null, reason: '' });
  };

  const handleConfirmRejectSubmission = async (e) => {
    if (e) e.preventDefault();
    if (!rejectModal.submission) return;
    try {
      setBusy(true);
      await api.patch(`/admin/submissions/${rejectModal.submission._id}/reject`, {
        adminNotes: rejectModal.reason,
      });
      setToast({
        type: 'ok',
        text: `"${rejectModal.submission.title}" marked as rejected.`,
      });
      handleCloseRejectModal();
      if (selectedSubmission && selectedSubmission._id === rejectModal.submission._id) {
        handleCloseSubmissionModal();
      }
      await Promise.all([loadSubmissions(), loadArticles(), loadStats()]);
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSubmissionClick = (sub) => {
    setModal({
      isOpen: true,
      title: 'Delete Paid Submission',
      message: `Are you sure you want to permanently delete "${sub.title}" (${sub.payment?.razorpayPaymentId})? This action cannot be undone.`,
      confirmText: 'Delete Submission',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          await api.del(`/admin/submissions/${sub._id}`);
          setToast({ type: 'ok', text: 'Submission deleted successfully.' });
          closeModal();
          if (selectedSubmission && selectedSubmission._id === sub._id) {
            handleCloseSubmissionModal();
          }
          await Promise.all([loadSubmissions(), loadStats()]);
        } catch (err) {
          setToast({ type: 'error', text: err.message });
        }
      },
    });
  };

  const unreadMessageCount = stats?.unreadMessages ?? messageStats.unread ?? 0;
  const pendingSubmissionsCount = stats?.pendingSubmissions ?? 0;

  return (
    <div className="admin-dashboard">
      {/* Top Masthead with User Meta */}
      <section className="masthead admin-masthead">
        <div>
          <div className="admin-user-badge-row">
            <span className="date-line">FlashVarta Admin Desk</span>
            {isPrimaryAdmin ? (
              <span className="badge badge-primary-admin" title="Sole Primary Administrator">
                👑 Primary Admin
              </span>
            ) : (
              <span className="badge badge-admin" title="Administrator">
                🛡️ Admin
              </span>
            )}
          </div>
          <h1 className="page-title">Publish &amp; Manage</h1>
          <p className="admin-welcome-text">
            Signed in as <strong>{currentUser?.name}</strong>
          </p>
        </div>

        <div className="admin-masthead-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setActiveTab('articles');
              handleOpenNewArticle();
            }}
          >
            + New article
          </button>
        </div>
      </section>

      {/* Permissions Context Banner for Secondary Admins */}
      {!isPrimaryAdmin && (
        <div className="admin-banner-info">
          <span className="banner-icon">ℹ️</span>
          <div>
            <strong>Editorial Admin Access:</strong> You can create, edit, publish, and delete articles, respond to contact
            messages, and review reader accounts. Role promotion and user deletions are restricted to the Primary Administrator.
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.text && (
        <div className={`alert ${toast.type === 'ok' ? 'alert-ok' : 'alert-error'} toast-alert`} role="status">
          <span>{toast.type === 'ok' ? '✓ ' : '✕ '}</span>
          {toast.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs" aria-label="Admin Navigation">
        <button
          type="button"
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'articles' ? 'active' : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          📰 Articles {stats && <span className="tab-pill">{stats.articles}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          💬 Messages{' '}
          {unreadMessageCount > 0 ? (
            <span className="tab-pill unread-pill" title={`${unreadMessageCount} unread messages`}>
              {unreadMessageCount}
            </span>
          ) : (
            stats && <span className="tab-pill">{stats.totalMessages || 0}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          📢 Submissions &amp; Ads{' '}
          {pendingSubmissionsCount > 0 ? (
            <span className="tab-pill unread-pill" title={`${pendingSubmissionsCount} pending submissions`}>
              {pendingSubmissionsCount}
            </span>
          ) : (
            stats && <span className="tab-pill">{stats.totalSubmissions || 0}</span>
          )}
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users {stats && <span className="tab-pill">{stats.totalUsers}</span>}
        </button>
      </nav>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <section className="admin-section">
          <div className="section-header">
            <h2 className="admin-section-title">Website Overview &amp; Statistics</h2>
            <span className="muted">Live figures calculated directly from the database</span>
          </div>

          {statsLoading ? (
            <div className="center-block">
              <div className="spinner" aria-label="Loading statistics" />
            </div>
          ) : stats ? (
            <>
              <div className="stats stats-grid-6">
                <div className="stat stat-card">
                  <div className="stat-icon">📄</div>
                  <span className="stat-number">{stats.articles}</span>
                  <div className="stat-label">Total Articles</div>
                  <div className="stat-sub">{stats.published} published &bull; {stats.drafts} drafts</div>
                </div>

                <div className="stat stat-card">
                  <div className="stat-icon">🌐</div>
                  <span className="stat-number ok-text">{stats.published}</span>
                  <div className="stat-label">Published Articles</div>
                  <div className="stat-sub">Live in readers&rsquo; feed</div>
                </div>

                <div className="stat stat-card">
                  <div className="stat-icon">📝</div>
                  <span className="stat-number muted-text">{stats.drafts}</span>
                  <div className="stat-label">Draft Articles</div>
                  <div className="stat-sub">Unpublished work</div>
                </div>

                <div className="stat stat-card stat-clickable" onClick={() => setActiveTab('messages')}>
                  <div className="stat-icon">💬</div>
                  <span className="stat-number">{stats.totalMessages || 0}</span>
                  <div className="stat-label">Contact Messages</div>
                  <div className="stat-sub">
                    <strong className="accent-text">{stats.unreadMessages || 0} unread</strong> &bull; {stats.readMessages || 0} read
                  </div>
                </div>

                <div className="stat stat-card">
                  <div className="stat-icon">👥</div>
                  <span className="stat-number">{stats.totalUsers}</span>
                  <div className="stat-label">Total Registered Users</div>
                  <div className="stat-sub">{stats.activeUsers} active accounts</div>
                </div>

                <div className="stat stat-card">
                  <div className="stat-icon">🛡️</div>
                  <span className="stat-number accent-text">{stats.totalAdmins}</span>
                  <div className="stat-label">Total Admins</div>
                  <div className="stat-sub">1 Primary &bull; {Math.max(0, stats.totalAdmins - 1)} secondary</div>
                </div>

                <div className="stat stat-card stat-clickable" onClick={() => setActiveTab('submissions')}>
                  <div className="stat-icon">📢</div>
                  <span className="stat-number">{stats.totalSubmissions || 0}</span>
                  <div className="stat-label">Paid Submissions (₹49)</div>
                  <div className="stat-sub">
                    <strong className="accent-text">{stats.pendingSubmissions || 0} pending</strong> &bull; {stats.approvedSubmissions || 0} approved
                  </div>
                </div>

                <div className="stat stat-card">
                  <div className="stat-icon">💰</div>
                  <span className="stat-number ok-text">₹{stats.totalRevenue || 0}</span>
                  <div className="stat-label">Gateway Revenue</div>
                  <div className="stat-sub">Razorpay collected (₹49/sub)</div>
                </div>
              </div>

              {/* Quick Navigation Shortcuts */}
              <div className="quick-actions-panel">
                <h3 className="quick-actions-title">Quick Administration Actions</h3>
                <div className="quick-actions-grid">
                  <button
                    type="button"
                    className="action-card"
                    onClick={() => {
                      setActiveTab('submissions');
                    }}
                  >
                    <span className="action-card-icon">📢</span>
                    <div>
                      <strong>
                        Review Paid Submissions{' '}
                        {stats.pendingSubmissions > 0 && `(${stats.pendingSubmissions} Pending)`}
                      </strong>
                      <p>Verify reader news &amp; business advertisements to publish live.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="action-card"
                    onClick={() => {
                      setActiveTab('articles');
                      handleOpenNewArticle();
                    }}
                  >
                    <span className="action-card-icon">✍️</span>
                    <div>
                      <strong>Write &amp; Publish Article</strong>
                      <p>Draft a breaking headline with images and categories.</p>
                    </div>
                  </button>

                  <button type="button" className="action-card" onClick={() => setActiveTab('messages')}>
                    <span className="action-card-icon">💬</span>
                    <div>
                      <strong>Client Messages Desk {stats.unreadMessages > 0 && `(${stats.unreadMessages} New)`}</strong>
                      <p>Read inquiries, tips, and feedback from website visitors.</p>
                    </div>
                  </button>

                  <button type="button" className="action-card" onClick={() => setActiveTab('articles')}>
                    <span className="action-card-icon">📂</span>
                    <div>
                      <strong>Manage Articles Catalog</strong>
                      <p>Review, filter, edit, or unpublish existing stories.</p>
                    </div>
                  </button>

                  <button type="button" className="action-card" onClick={() => setActiveTab('users')}>
                    <span className="action-card-icon">👤</span>
                    <div>
                      <strong>User Directory &amp; Roles</strong>
                      <p>View registered readers, manage admin promotions &amp; status.</p>
                    </div>
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ARTICLES */}
      {/* ======================================================== */}
      {activeTab === 'articles' && (
        <section className="admin-section">
          {/* Article Create / Edit Form */}
          {showArticleForm && (
            <form className="panel article-edit-panel" onSubmit={handleSaveArticle}>
              <div className="panel-header-row">
                <h2 className="panel-title">{editingArticleId ? 'Edit Article' : 'Create New Article'}</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleCloseArticleForm}>
                  ✕ Close
                </button>
              </div>

              <div className="field">
                <label htmlFor="a-title">Headline</label>
                <input
                  id="a-title"
                  className="input"
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  maxLength={200}
                  placeholder="Compelling, accurate news headline"
                  required
                />
                <span className="field-hint">{articleForm.title.length}/200 characters</span>
              </div>

              <div className="field">
                <label htmlFor="a-desc">Short Summary / Lead</label>
                <textarea
                  id="a-desc"
                  className="input"
                  rows={2}
                  value={articleForm.description}
                  onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                  maxLength={500}
                  placeholder="Brief summary that appears in cards and feeds"
                  required
                />
                <span className="field-hint">{articleForm.description.length}/500 characters</span>
              </div>

              <div className="field">
                <label htmlFor="a-content">Full Story Content</label>
                <textarea
                  id="a-content"
                  className="input"
                  rows={9}
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="Full article content. Separate paragraphs with a blank line."
                />
              </div>

              <div className="form-row">
                <div className="field">
                  <label htmlFor="a-cat">Category</label>
                  <select
                    id="a-cat"
                    className="input"
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="a-src">Source / Byline</label>
                  <input
                    id="a-src"
                    className="input"
                    value={articleForm.source}
                    onChange={(e) => setArticleForm({ ...articleForm, source: e.target.value })}
                    maxLength={80}
                    placeholder="e.g. FlashVarta / Rohit Chaudhari"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="a-img">Featured Image URL (optional)</label>
                <input
                  id="a-img"
                  className="input"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={articleForm.imageUrl}
                  onChange={(e) => setArticleForm({ ...articleForm, imageUrl: e.target.value })}
                />
                {articleForm.imageUrl && (
                  <img
                    className="img-preview"
                    src={articleForm.imageUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = 'block';
                    }}
                  />
                )}
              </div>

              <label className="check">
                <input
                  type="checkbox"
                  checked={articleForm.isPublished}
                  onChange={(e) => setArticleForm({ ...articleForm, isPublished: e.target.checked })}
                />
                Publish immediately (uncheck to save as a draft)
              </label>

              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={handleCloseArticleForm}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : editingArticleId ? 'Save Changes' : articleForm.isPublished ? 'Publish Article' : 'Save Draft'}
                </button>
              </div>
            </form>
          )}

          {/* Article Filters Toolbar */}
          <div className="toolbar">
            <div className="toolbar-search">
              <input
                className="input input-sm"
                type="search"
                placeholder="Search headlines, sources..."
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
              />
            </div>

            <div className="toolbar-filters">
              <select
                className="input input-sm"
                value={articleCategory}
                onChange={(e) => setArticleCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>

              <select
                className="input input-sm"
                value={articleStatus}
                onChange={(e) => setArticleStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published Only</option>
                <option value="draft">Drafts Only</option>
              </select>

              {!showArticleForm && (
                <button className="btn btn-primary btn-sm" onClick={handleOpenNewArticle}>
                  + New Article
                </button>
              )}
            </div>
          </div>

          {/* Articles List */}
          <div className="admin-header-row">
            <h3 className="admin-subheading">Articles Catalog</h3>
            <span className="muted">
              {articles.length} {articles.length === 1 ? 'article found' : 'articles found'}
            </span>
          </div>

          {articlesLoading ? (
            <div className="center-block">
              <div className="spinner" aria-label="Loading articles" />
            </div>
          ) : articles.length === 0 ? (
            <div className="empty">
              <h3>No articles found</h3>
              <p>No stories matched your current search and filter criteria.</p>
              <button className="btn btn-outline btn-sm" onClick={handleOpenNewArticle}>
                Write a new story
              </button>
            </div>
          ) : (
            <ul className="rows">
              {articles.map((a) => (
                <li key={a._id} className="row">
                  <div className="row-main">
                    <div className="row-title">{a.title}</div>
                    <div className="row-sub">
                      <span className="chip chip-inline">{a.category}</span>
                      <span className={a.isPublished ? 'status ok' : 'status draft'}>
                        {a.isPublished ? 'Published' : 'Draft'}
                      </span>
                      <span>
                        {a.author?.name ? `by ${a.author.name} · ` : ''}
                        Updated {timeAgo(a.updatedAt || a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleTogglePublish(a)}
                    >
                      {a.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenEditArticle(a)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteArticleClick(a)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CONTACT MESSAGES MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'messages' && (
        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2 className="admin-section-title">Client Contact Messages</h2>
              <p className="muted">
                Inquiries, news tips, and messages submitted via the website&rsquo;s Contact form.
              </p>
            </div>
            <div className="message-stats-chips">
              <span className="msg-chip msg-chip-total">
                Total: <strong>{messageStats.total}</strong>
              </span>
              <span className="msg-chip msg-chip-unread">
                Unread: <strong>{messageStats.unread}</strong>
              </span>
              <span className="msg-chip msg-chip-read">
                Read: <strong>{messageStats.read}</strong>
              </span>
            </div>
          </div>

          {/* Messages Filter & Search Toolbar */}
          <div className="toolbar">
            <div className="toolbar-search">
              <input
                className="input input-sm"
                type="search"
                placeholder="Search sender, email, or subject..."
                value={messageSearch}
                onChange={(e) => {
                  setMessageSearch(e.target.value);
                  setMessagePage(1);
                }}
              />
            </div>

            <div className="toolbar-filters">
              <select
                className="input input-sm"
                value={messageStatusFilter}
                onChange={(e) => {
                  setMessageStatusFilter(e.target.value);
                  setMessagePage(1);
                }}
              >
                <option value="all">All Messages</option>
                <option value="unread">Unread Only ({messageStats.unread})</option>
                <option value="read">Read Only ({messageStats.read})</option>
              </select>

              <select
                className="input input-sm"
                value={messageSort}
                onChange={(e) => {
                  setMessageSort(e.target.value);
                  setMessagePage(1);
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Messages Table */}
          {messagesLoading ? (
            <div className="center-block">
              <div className="spinner" aria-label="Loading messages" />
            </div>
          ) : messages.length === 0 ? (
            <div className="empty">
              <h3>No messages found</h3>
              <p>
                {messageSearch || messageStatusFilter !== 'all'
                  ? 'No contact messages matched your search or status filter.'
                  : 'No messages have been submitted yet through the Contact Us form.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="admin-table messages-table" role="table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '90px' }}>Status</th>
                    <th scope="col">Sender Name</th>
                    <th scope="col">Email Address</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Date Submitted</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr
                      key={m._id}
                      className={`message-row ${!m.isRead ? 'tr-unread' : 'tr-read'}`}
                      onClick={() => handleOpenViewMessage(m)}
                    >
                      {/* Status */}
                      <td>
                        <span className={`msg-status-pill ${m.isRead ? 'pill-read' : 'pill-unread'}`}>
                          {m.isRead ? '✓ Read' : '● Unread'}
                        </span>
                      </td>

                      {/* Sender */}
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar msg-avatar" aria-hidden="true">
                            {m.name.charAt(0).toUpperCase()}
                          </span>
                          <strong className="user-display-name">{m.name}</strong>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <a
                          href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                          className="msg-email-link"
                          onClick={(e) => e.stopPropagation()}
                          title="Open in email application"
                        >
                          {m.email}
                        </a>
                      </td>

                      {/* Subject */}
                      <td>
                        <div className="msg-subject-preview">
                          <span className="msg-subject-text">{m.subject}</span>
                          <span className="msg-body-snippet muted">
                            {m.message.slice(0, 75)}…
                          </span>
                        </div>
                      </td>

                      {/* Submission Date */}
                      <td>
                        <div className="date-cell">
                          <span>
                            {new Date(m.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="muted date-sub">{timeAgo(m.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenViewMessage(m)}
                            title="Open complete message modal"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={(e) => handleToggleMessageRead(m, e)}
                            title={m.isRead ? 'Mark as Unread' : 'Mark as Read'}
                          >
                            {m.isRead ? 'Mark Unread' : 'Mark Read'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={(e) => handleDeleteMessageClick(m, e)}
                            title="Permanently delete message"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {messageTotalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={messagePage <= 1}
                onClick={() => setMessagePage((p) => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <span className="pagination-info">
                Page {messagePage} of {messageTotalPages} ({messageTotal} messages)
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={messagePage >= messageTotalPages}
                onClick={() => setMessagePage((p) => Math.min(messageTotalPages, p + 1))}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB 4: USERS & ROLE MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <section className="admin-section">
          <div className="section-header">
            <div>
              <h2 className="admin-section-title">User Registration &amp; Role Management</h2>
              <p className="muted">
                Total registered user accounts: <strong>{userTotal}</strong>. (Passwords are encrypted and never displayed).
              </p>
            </div>
          </div>

          {/* User Filter & Search Toolbar */}
          <div className="toolbar">
            <div className="toolbar-search">
              <input
                className="input input-sm"
                type="search"
                placeholder="Search by name, email, identifier..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
              />
            </div>

            <div className="toolbar-filters">
              <select
                className="input input-sm"
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="user">Registered Users</option>
                <option value="admin">Administrators</option>
                <option value="primary_admin">Primary Admin</option>
              </select>

              <select
                className="input input-sm"
                value={userSort}
                onChange={(e) => {
                  setUserSort(e.target.value);
                  setUserPage(1);
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Responsive User Management Table */}
          {usersLoading ? (
            <div className="center-block">
              <div className="spinner" aria-label="Loading users" />
            </div>
          ) : users.length === 0 ? (
            <div className="empty">
              <h3>No users found</h3>
              <p>No user accounts matched your search criteria.</p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="admin-table" role="table">
                <thead>
                  <tr>
                    <th scope="col">User Name</th>
                    <th scope="col">Email / Identifier</th>
                    <th scope="col">Registration Date</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isTargetPrimary = u.role === 'primary_admin';
                    const isSelf = String(currentUser?._id || currentUser?.id) === String(u._id);

                    return (
                      <tr key={u._id} className={!u.isActive ? 'tr-deactivated' : ''}>
                        {/* Name */}
                        <td>
                          <div className="user-cell">
                            <span className="user-avatar" aria-hidden="true">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <strong className="user-display-name">{u.name}</strong>
                              {isSelf && <span className="badge-self">You</span>}
                            </div>
                          </div>
                        </td>

                        {/* Email / Identifier */}
                        <td>
                          <div className="identifier-cell">
                            <span>{u.email}</span>
                            {u.loginIdentifier && u.loginIdentifier !== 'admin@123' && (
                              <span className="login-id-tag">ID: {u.loginIdentifier}</span>
                            )}
                          </div>
                        </td>

                        {/* Registration Date */}
                        <td>
                          <div className="date-cell">
                            <span>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="muted date-sub">{timeAgo(u.createdAt)}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          {u.role === 'primary_admin' && (
                            <span className="badge badge-primary-admin" title="Sole Primary Administrator">
                              👑 Primary Admin
                            </span>
                          )}
                          {u.role === 'admin' && (
                            <span className="badge badge-admin" title="Administrator">
                              🛡️ Admin
                            </span>
                          )}
                          {u.role === 'user' && (
                            <span className="badge badge-user" title="Standard Reader">
                              👤 Reader
                            </span>
                          )}
                        </td>

                        {/* Account Status */}
                        <td>
                          <span className={`status-pill ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="table-actions">
                            {/* Primary Admin Row: Protected */}
                            {isTargetPrimary ? (
                              <span className="badge-protected" title="Account cannot be altered, demoted, or deleted">
                                🔒 Protected Account
                              </span>
                            ) : isPrimaryAdmin ? (
                              /* Primary Admin View of Regular Users & Secondary Admins */
                              <>
                                {u.role === 'user' && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handlePromoteUserClick(u)}
                                    title="Grant article publishing permissions"
                                  >
                                    Make Admin
                                  </button>
                                )}

                                {u.role === 'admin' && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleDemoteAdminClick(u)}
                                    title="Revoke admin privileges"
                                  >
                                    Remove Admin
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className={`btn ${u.isActive ? 'btn-ghost' : 'btn-outline'} btn-sm`}
                                  onClick={() => handleToggleUserStatusClick(u)}
                                  title={u.isActive ? 'Revoke user sessions & login' : 'Restore user access'}
                                >
                                  {u.isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleOpenResetPasswordModal(u)}
                                  title="Securely reset password without displaying old password"
                                >
                                  Reset Password
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteUserClick(u)}
                                  title="Permanently remove user"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              /* Secondary Admin View: Read-Only Actions */
                              <span className="muted text-sm">Primary Admin only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {userTotalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <span className="pagination-info">
                Page {userPage} of {userTotalPages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={userPage >= userTotalPages}
                onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* TAB: SUBMISSIONS & ADS (Paid ₹49 Gateway) */}
      {/* ======================================================== */}
      {activeTab === 'submissions' && (
        <section className="admin-section">
          <div className="section-header submissions-section-header">
            <div>
              <h2 className="admin-section-title">News &amp; Advertisement Submissions</h2>
              <span className="muted">
                Paid submissions (₹49 via Razorpay). Review and publish directly to the live feed.
              </span>
            </div>
            <div className="submissions-summary-tags">
              <span className="badge badge-primary-admin">
                Revenue: ₹{stats?.totalRevenue || 0}
              </span>
              <span className="badge badge-admin">
                {pendingSubmissionsCount} Pending Review
              </span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-wrap">
              <input
                type="search"
                className="input"
                placeholder="Search by title, submitter, or Razorpay ID..."
                value={submissionSearch}
                onChange={(e) => {
                  setSubmissionSearch(e.target.value);
                  setSubmissionPage(1);
                }}
              />
            </div>

            <div className="admin-filter-group">
              <select
                className="input filter-select"
                value={submissionTypeFilter}
                onChange={(e) => {
                  setSubmissionTypeFilter(e.target.value);
                  setSubmissionPage(1);
                }}
                aria-label="Filter by submission type"
              >
                <option value="all">All Types (News &amp; Ads)</option>
                <option value="news">📰 News Only</option>
                <option value="ad">🎯 Advertisements Only</option>
              </select>

              <select
                className="input filter-select"
                value={submissionStatusFilter}
                onChange={(e) => {
                  setSubmissionStatusFilter(e.target.value);
                  setSubmissionPage(1);
                }}
                aria-label="Filter by approval status"
              >
                <option value="all">All Statuses</option>
                <option value="pending">⏳ Pending Review</option>
                <option value="approved">✅ Published Live</option>
                <option value="rejected">❌ Rejected</option>
              </select>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadSubmissions}
                title="Refresh submissions list"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Submissions List / Table */}
          {submissionsLoading ? (
            <div className="center-block">
              <div className="spinner" aria-label="Loading submissions" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="admin-empty-state">
              <span className="empty-state-icon">📢</span>
              <h3>No submissions found</h3>
              <p>
                {submissionSearch || submissionTypeFilter !== 'all' || submissionStatusFilter !== 'all'
                  ? 'No submissions match your active filter criteria.'
                  : 'No paid news or advertisement submissions have been received yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (Visible on >= 769px) */}
              <div className="table-responsive-wrapper submissions-desktop-table">
                <table className="admin-table submissions-table" role="table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '85px' }}>Type</th>
                      <th scope="col">Headline &amp; Details</th>
                      <th scope="col">Submitter</th>
                      <th scope="col">Payment (Razorpay)</th>
                      <th scope="col" style={{ width: '130px' }}>Status</th>
                      <th scope="col" className="text-right" style={{ width: '260px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      return (
                        <tr key={sub._id}>
                          {/* Type */}
                          <td>
                            <span
                              className={`badge ${
                                sub.type === 'ad' ? 'badge-ad' : 'badge-community'
                              }`}
                            >
                              {sub.type === 'ad' ? '🎯 Ad' : '📰 News'}
                            </span>
                          </td>

                          {/* Title & Preview */}
                          <td>
                            <div className="sub-table-headline-cell">
                              {sub.imageUrl ? (
                                <img
                                  src={sub.imageUrl}
                                  alt=""
                                  className="sub-table-thumb"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="sub-table-thumb-ph">📄</div>
                              )}
                              <div className="sub-table-title-wrap">
                                <strong className="sub-table-title">{sub.title}</strong>
                                <div className="sub-table-meta-line">
                                  <span className="chip chip-xs">{sub.category}</span>
                                  {sub.type === 'ad' && sub.targetUrl && (
                                    <a
                                      href={sub.targetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="sub-table-link"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      🔗 Sponsor Link
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Submitter */}
                          <td>
                            <div className="sub-submitter-cell">
                              <strong>{sub.authorName || sub.author?.name || 'Reader'}</strong>
                              <span className="muted text-xs">{sub.authorEmail || sub.author?.email}</span>
                              {sub.contactPhone && (
                                <span className="sub-phone-tag">📞 {sub.contactPhone}</span>
                              )}
                            </div>
                          </td>

                          {/* Payment Details */}
                          <td>
                            <div className="sub-payment-cell">
                              <span className="ok-text font-bold">
                                ₹{sub.payment?.amount || 49} (Paid)
                              </span>
                              <code className="payment-id-code text-xs">
                                {sub.payment?.razorpayPaymentId}
                              </code>
                              <span className="muted text-xs">{timeAgo(sub.createdAt)}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            {sub.status === 'pending' && (
                              <span className="status-badge status-pending">⏳ Pending Review</span>
                            )}
                            {sub.status === 'approved' && (
                              <span className="status-badge status-approved">✅ Published</span>
                            )}
                            {sub.status === 'rejected' && (
                              <span className="status-badge status-rejected">❌ Rejected</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-right">
                            <div className="table-actions">
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenViewSubmission(sub)}
                                title="Review full submission details"
                              >
                                👁️ Review
                              </button>

                              {sub.status !== 'approved' && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleApproveSubmission(sub)}
                                  title="Approve and publish to live news feed"
                                  disabled={busy}
                                >
                                  ✅ Publish
                                </button>
                              )}

                              {sub.status !== 'rejected' && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleOpenRejectSubmissionModal(sub)}
                                  title="Reject submission"
                                  disabled={busy}
                                >
                                  ❌ Reject
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteSubmissionClick(sub)}
                                title="Delete submission permanently"
                                disabled={busy}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (Visible on <= 768px) */}
              <div className="submissions-mobile-cards">
                {submissions.map((sub) => (
                  <div key={sub._id} className="sub-mobile-card">
                    <div className="sub-mobile-card-top">
                      <div className="sub-mobile-badges">
                        <span
                          className={`badge ${
                            sub.type === 'ad' ? 'badge-ad' : 'badge-community'
                          }`}
                        >
                          {sub.type === 'ad' ? '🎯 Ad' : '📰 News'}
                        </span>
                        <span className="chip chip-xs">{sub.category}</span>
                      </div>
                      <div className="sub-mobile-status">
                        {sub.status === 'pending' && (
                          <span className="status-badge status-pending">⏳ Pending</span>
                        )}
                        {sub.status === 'approved' && (
                          <span className="status-badge status-approved">✅ Published</span>
                        )}
                        {sub.status === 'rejected' && (
                          <span className="status-badge status-rejected">❌ Rejected</span>
                        )}
                      </div>
                    </div>

                    <div className="sub-mobile-card-main">
                      {sub.imageUrl ? (
                        <div className="sub-mobile-thumb-wrap">
                          <img
                            src={sub.imageUrl}
                            alt=""
                            className="sub-mobile-thumb"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="sub-table-thumb-ph">📄</div>
                      )}
                      <div className="sub-mobile-info">
                        <h4 className="sub-mobile-title">{sub.title}</h4>
                        {sub.type === 'ad' && sub.targetUrl && (
                          <a
                            href={sub.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sub-mobile-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🔗 Sponsor Destination
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="sub-mobile-meta-grid">
                      <div className="sub-mobile-meta-item">
                        <span className="meta-k">Submitter</span>
                        <strong>{sub.authorName || sub.author?.name || 'Reader'}</strong>
                        <span className="muted text-xs">{sub.authorEmail || sub.author?.email}</span>
                        {sub.contactPhone && (
                          <span className="sub-phone-tag">📞 {sub.contactPhone}</span>
                        )}
                      </div>
                      <div className="sub-mobile-meta-item">
                        <span className="meta-k">Payment</span>
                        <span className="ok-text font-bold">
                          ₹{sub.payment?.amount || 49} (Paid)
                        </span>
                        <code className="payment-id-code text-xs">
                          {sub.payment?.razorpayPaymentId}
                        </code>
                        <span className="muted text-xs">{timeAgo(sub.createdAt)}</span>
                      </div>
                    </div>

                    <div className="sub-mobile-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenViewSubmission(sub)}
                      >
                        👁️ Review
                      </button>

                      {sub.status !== 'approved' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveSubmission(sub)}
                          disabled={busy}
                        >
                          ✅ Publish
                        </button>
                      )}

                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenRejectSubmissionModal(sub)}
                          disabled={busy}
                        >
                          ❌ Reject
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSubmissionClick(sub)}
                        disabled={busy}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {submissionTotalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={submissionPage <= 1}
                onClick={() => setSubmissionPage((p) => Math.max(1, p - 1))}
              >
                &larr; Previous
              </button>
              <span className="pagination-info">
                Page {submissionPage} of {submissionTotalPages} ({submissionTotal} submissions)
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={submissionPage >= submissionTotalPages}
                onClick={() => setSubmissionPage((p) => Math.min(submissionTotalPages, p + 1))}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </section>
      )}


      {/* ======================================================== */}
      {/* MESSAGE DETAILS MODAL */}
      {/* ======================================================== */}
      {showMessageModal && selectedMessage && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="msg-modal-title">
          <div className="modal-card modal-card-lg">
            <div className="modal-header">
              <div className="msg-modal-title-area">
                <span className={`msg-status-pill ${selectedMessage.isRead ? 'pill-read' : 'pill-unread'}`}>
                  {selectedMessage.isRead ? '✓ Read' : '● Unread'}
                </span>
                <h3 id="msg-modal-title" className="modal-title">
                  {selectedMessage.subject}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseMessageModal}
                aria-label="Close message details"
              >
                ✕
              </button>
            </div>

            <div className="modal-body msg-modal-body">
              {/* Message Meta Bar */}
              <div className="msg-details-meta-grid">
                <div>
                  <span className="msg-meta-label">From:</span>
                  <strong>{selectedMessage.name}</strong>
                </div>

                <div>
                  <span className="msg-meta-label">Email Address:</span>
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                    className="msg-email-link-active"
                  >
                    {selectedMessage.email} ↗
                  </a>
                </div>

                <div>
                  <span className="msg-meta-label">Date Submitted:</span>
                  <span>
                    {new Date(selectedMessage.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Message Content */}
              <div className="msg-content-wrapper">
                <label className="msg-meta-label">Message Content:</label>
                <div className="msg-content-box">
                  <p>{selectedMessage.message}</p>
                </div>
              </div>
            </div>

            <div className="modal-footer msg-modal-footer">
              <div className="msg-modal-footer-left">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                  className="btn btn-primary"
                >
                  ✉️ Reply to {selectedMessage.email}
                </a>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleToggleMessageRead(selectedMessage)}
                >
                  {selectedMessage.isRead ? 'Mark as Unread' : 'Mark as Read'}
                </button>
              </div>

              <div className="msg-modal-footer-right">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteMessageClick(selectedMessage)}
                >
                  Delete Message
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleCloseMessageModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECURE PASSWORD RESET MODAL (Primary Admin Only) */}
      {/* ======================================================== */}
      {resetModal.isOpen && resetModal.user && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <h3 id="reset-modal-title" className="modal-title">
                Secure Password Reset
              </h3>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseResetPasswordModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleExecutePasswordReset}>
              <div className="modal-body">
                <p className="muted" style={{ marginBottom: '14px' }}>
                  Assigning new credentials for <strong>{resetModal.user.name}</strong> ({resetModal.user.email}).
                  Existing passwords are never revealed to anyone and are stored only as secure bcrypt hashes.
                </p>

                {resetModal.error && (
                  <div className="alert alert-error" role="alert">
                    {resetModal.error}
                  </div>
                )}

                <div className="field">
                  <label htmlFor="reset-new-password">New Password (masked by default)</label>
                  <div className="input-wrap">
                    <input
                      id="reset-new-password"
                      type={resetModal.showPassword ? 'text' : 'password'}
                      className="input"
                      placeholder="Minimum 6 characters"
                      required
                      value={resetModal.newPassword}
                      onChange={(e) =>
                        setResetModal({ ...resetModal, newPassword: e.target.value })
                      }
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="input-toggle"
                      onClick={() =>
                        setResetModal({ ...resetModal, showPassword: !resetModal.showPassword })
                      }
                      aria-label={resetModal.showPassword ? 'Hide password' : 'Show password'}
                    >
                      {resetModal.showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <span className="field-hint">Will be securely hashed with bcrypt salt 12 on the server.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleCloseResetPasswordModal}
                  disabled={resetModal.busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetModal.busy}>
                  {resetModal.busy ? 'Updating…' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBMISSION REVIEW MODAL */}
      {/* ======================================================== */}
      {showSubmissionModal && selectedSubmission && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sub-modal-title">
          <div className="modal-card modal-card-lg">
            <div className="modal-header">
              <div className="msg-modal-title-area sub-modal-title-area">
                <div className="sub-modal-badges">
                  <span className={`badge ${selectedSubmission.type === 'ad' ? 'badge-ad' : 'badge-community'}`}>
                    {selectedSubmission.type === 'ad' ? '🎯 Advertisement' : '📰 News Story'}
                  </span>
                  <span className="chip chip-inline">{selectedSubmission.category}</span>
                </div>
                <h3 id="sub-modal-title" className="modal-title">
                  {selectedSubmission.title}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseSubmissionModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Payment & Submitter Bar */}
              <div className="admin-sub-meta-box">
                <div className="sub-meta-col">
                  <span className="meta-k">Submitter:</span>
                  <strong>{selectedSubmission.authorName || selectedSubmission.author?.name}</strong>
                  <span className="muted text-xs">{selectedSubmission.authorEmail || selectedSubmission.author?.email}</span>
                  {selectedSubmission.contactPhone && (
                    <span className="muted text-xs">📞 {selectedSubmission.contactPhone}</span>
                  )}
                </div>
                <div className="sub-meta-col">
                  <span className="meta-k">Payment Verification:</span>
                  <span className="ok-text font-bold">₹{selectedSubmission.payment?.amount || 49} (PAID VIA RAZORPAY)</span>
                  <code className="payment-id-code text-xs">{selectedSubmission.payment?.razorpayPaymentId}</code>
                </div>
                <div className="sub-meta-col">
                  <span className="meta-k">Editorial Status:</span>
                  {selectedSubmission.status === 'pending' && <span className="status-badge status-pending">Pending Review</span>}
                  {selectedSubmission.status === 'approved' && <span className="status-badge status-approved">Live on Feed</span>}
                  {selectedSubmission.status === 'rejected' && <span className="status-badge status-rejected">Rejected</span>}
                </div>
              </div>

              {/* Image banner preview if provided */}
              {selectedSubmission.imageUrl && (
                <div className="sub-modal-banner-preview">
                  <img
                    src={selectedSubmission.imageUrl}
                    alt="Banner preview"
                    className="sub-modal-img"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Lead Summary */}
              <div className="sub-modal-section">
                <h4>Short Summary (Headline Card Description)</h4>
                <p className="sub-modal-lead">{selectedSubmission.description}</p>
              </div>

              {/* Detailed Content */}
              {selectedSubmission.content && (
                <div className="sub-modal-section">
                  <h4>Detailed Article / Ad Copy</h4>
                  <div className="sub-modal-content-text">
                    {selectedSubmission.content.split(/\n{2,}/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Ad Links (if ad) */}
              {selectedSubmission.type === 'ad' && selectedSubmission.targetUrl && (
                <div className="sub-modal-section ad-target-box">
                  <h4>🎯 Advertiser Target URL</h4>
                  <a
                    href={selectedSubmission.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    Open Sponsor Destination: {selectedSubmission.targetUrl} &rarr;
                  </a>
                </div>
              )}

              {/* Rejection / Admin Notes */}
              {selectedSubmission.adminNotes && (
                <div className="sub-modal-section">
                  <h4>Admin Notes / Feedback</h4>
                  <p className="admin-notes-p">{selectedSubmission.adminNotes}</p>
                </div>
              )}

              {/* If already published live, link to article */}
              {selectedSubmission.status === 'approved' && selectedSubmission.publishedArticleId && (
                <div className="alert alert-ok" style={{ marginTop: '16px' }}>
                  <span>✓ This story is published in the public feed!</span>
                  <a
                    href={`/news/${selectedSubmission.publishedArticleId._id || selectedSubmission.publishedArticleId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{ marginLeft: '12px' }}
                  >
                    View Live Article &rarr;
                  </a>
                </div>
              )}
            </div>

            <div className="modal-footer sub-modal-footer">
              <div className="modal-footer-left sub-modal-footer-left">
                {selectedSubmission.status !== 'approved' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleApproveSubmission(selectedSubmission)}
                    disabled={busy}
                  >
                    ✅ Approve &amp; Publish to Feed
                  </button>
                )}
                {selectedSubmission.status !== 'rejected' && (
                  <button
                    type="button"
                    className="btn btn-danger btn-outline"
                    onClick={() => handleOpenRejectSubmissionModal(selectedSubmission)}
                    disabled={busy}
                  >
                    ❌ Reject Submission
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-ghost" onClick={handleCloseSubmissionModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REJECT SUBMISSION MODAL */}
      {/* ======================================================== */}
      {rejectModal.isOpen && rejectModal.submission && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reject-modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <h3 id="reject-modal-title" className="modal-title">
                Reject Submission
              </h3>
              <button type="button" className="btn-close" onClick={handleCloseRejectModal} aria-label="Close modal">
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmRejectSubmission}>
              <div className="modal-body">
                <p className="modal-message">
                  Are you sure you want to reject &ldquo;{rejectModal.submission.title}&rdquo;?
                  If an article was previously published for this submission, it will be unlisted from the live feed.
                </p>

                <div className="field" style={{ marginTop: '14px' }}>
                  <label htmlFor="reject-reason">Feedback for Submitter (Optional):</label>
                  <textarea
                    id="reject-reason"
                    className="input textarea"
                    rows={3}
                    placeholder="e.g., Image resolution too low, violates guidelines, or needs factual correction."
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer reject-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={handleCloseRejectModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={busy}>
                  {busy ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {modal.isOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <h3 id="modal-title" className="modal-title">
                {modal.title}
              </h3>
              <button type="button" className="btn-close" onClick={closeModal} aria-label="Close modal">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modal.message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${modal.confirmType === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={modal.onConfirm}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
