const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, default: '' },
    actorEmail: { type: String, default: '' },
    action: {
      type: String,
      required: true,
      enum: [
        'MAKE_ADMIN',
        'REMOVE_ADMIN',
        'DEACTIVATE_USER',
        'ACTIVATE_USER',
        'DELETE_USER',
        'UPDATE_USER',
        'RESET_USER_PASSWORD',
        'NEWS_SUBMISSION_PAID',
        'APPROVE_SUBMISSION',
        'REJECT_SUBMISSION',
        'DELETE_SUBMISSION',
      ],
    },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetName: { type: String, default: '' },
    targetEmail: { type: String, default: '' },
    previousValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    outcome: { type: String, enum: ['SUCCESS', 'FAILURE'], default: 'SUCCESS' },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetUserId: 1 });
auditLogSchema.index({ actorUserId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
