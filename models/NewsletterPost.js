import mongoose from 'mongoose';

const newsletterPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Newsletter title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true,
    maxlength: [1500, 'Subject cannot exceed 1500 characters']
  },
  content: {
    type: String,
    required: [true, 'Newsletter content is required']
  },
  htmlContent: {
    type: String,
    required: [true, 'HTML content is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft'
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  recipients: {
    total: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['general', 'tech-insights', 'project-updates', 'offers', 'announcements'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }],
  analytics: {
    opens: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    unsubscribes: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
newsletterPostSchema.index({ status: 1 });
newsletterPostSchema.index({ scheduledAt: 1 });
newsletterPostSchema.index({ sentAt: -1 });
newsletterPostSchema.index({ author: 1 });
newsletterPostSchema.index({ category: 1 });

// Virtual for formatted sent date
newsletterPostSchema.virtual('formattedSentDate').get(function() {
  if (this.sentAt) {
    return this.sentAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return null;
});

// Method to mark as sent
newsletterPostSchema.methods.markAsSent = function(recipientStats) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.recipients = recipientStats;
  return this.save();
};

// Method to mark as failed
newsletterPostSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

// Static method to get recent newsletters
newsletterPostSchema.statics.getRecentNewsletters = function(limit = 10) {
  return this.find({ status: 'sent' })
    .sort({ sentAt: -1 })
    .limit(limit)
    .populate('author', 'name email');
};

// Static method to get newsletter statistics
newsletterPostSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalOpens: { $sum: '$analytics.opens' },
        totalClicks: { $sum: '$analytics.clicks' }
      }
    }
  ]);
};

export default mongoose.model('NewsletterPost', newsletterPostSchema);
