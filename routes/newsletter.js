import express from 'express';
import Newsletter from '../models/Newsletter.js';
import NewsletterPost from '../models/NewsletterPost.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email already exists
    let subscriber = await Newsletter.findOne({ email });

    if (subscriber) {
      if (subscriber.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Email is already subscribed to our newsletter'
        });
      } else {
        // Reactivate subscription
        await subscriber.resubscribe();
        return res.status(200).json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
          data: { subscriber }
        });
      }
    }

    // Create new subscriber
    subscriber = new Newsletter({
      email,
      source: 'website'
    });

    await subscriber.save();

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to Bahoju Newsletter!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0573A0 0%, #15C4DB 100%); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Bahoju!</h1>
            </div>
            <div style="padding: 40px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Thank you for subscribing!</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                You're now part of the Bahoju community! Get ready to receive:
              </p>
              <ul style="color: #666; line-height: 1.8; margin-bottom: 30px;">
                <li>Latest technology trends and insights</li>
                <li>Behind-the-scenes project updates</li>
                <li>Exclusive offers and early access</li>
                <li>Industry news and expert tips</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://bahoju.com" style="background: #0573A0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
                  Visit Our Website
                </a>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                You can unsubscribe at any time by clicking the unsubscribe link in our emails.
              </p>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter! Check your email for confirmation.',
      data: { subscriber }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already subscribed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter. Please try again.'
    });
  }
});

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscriber = await Newsletter.findOne({ email });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our newsletter list'
      });
    }

    if (!subscriber.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Email is already unsubscribed'
      });
    }

    await subscriber.unsubscribe();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe. Please try again.'
    });
  }
});

// @route   GET /api/newsletter/subscribers
// @desc    Get all newsletter subscribers (Admin only)
// @access  Private
router.get('/subscribers', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;

    let query = {};
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const subscribers = await Newsletter.find(query)
      .sort({ subscribedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Newsletter.countDocuments(query);
    const activeCount = await Newsletter.countDocuments({ isActive: true });
    const inactiveCount = await Newsletter.countDocuments({ isActive: false });

    res.status(200).json({
      success: true,
      data: {
        subscribers,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        },
        stats: {
          total,
          active: activeCount,
          inactive: inactiveCount
        }
      }
    });

  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscribers'
    });
  }
});

// @route   POST /api/newsletter/send
// @desc    Send newsletter to all subscribers (Admin only)
// @access  Private
router.post('/send', authenticateAdmin, async (req, res) => {
  try {
    const { title, subject, content, htmlContent, category = 'general', scheduledAt } = req.body;

    if (!title || !subject || !content || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, content, and HTML content are required'
      });
    }

    // Create newsletter post
    const newsletterPost = new NewsletterPost({
      title,
      subject,
      content,
      htmlContent,
      author: req.admin.id,
      category,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'scheduled' : 'draft'
    });

    await newsletterPost.save();

    // If not scheduled, send immediately
    if (!scheduledAt) {
      const activeSubscribers = await Newsletter.getActiveSubscribers();
      
      if (activeSubscribers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active subscribers found'
        });
      }

      let sentCount = 0;
      let failedCount = 0;

      // Send emails to all subscribers
      for (const subscriber of activeSubscribers) {
        try {
          await sendEmail({
            to: subscriber.email,
            subject,
            html: htmlContent
          });
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send to ${subscriber.email}:`, emailError);
          failedCount++;
        }
      }

      // Update newsletter post with results
      await newsletterPost.markAsSent({
        total: activeSubscribers.length,
        sent: sentCount,
        failed: failedCount
      });

      res.status(200).json({
        success: true,
        message: `Newsletter sent successfully to ${sentCount} subscribers`,
        data: {
          newsletterPost,
          stats: {
            total: activeSubscribers.length,
            sent: sentCount,
            failed: failedCount
          }
        }
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Newsletter scheduled successfully',
        data: { newsletterPost }
      });
    }

  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send newsletter'
    });
  }
});

// @route   GET /api/newsletter/posts
// @desc    Get all newsletter posts (Admin only)
// @access  Private
router.get('/posts', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;

    let query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const posts = await NewsletterPost.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await NewsletterPost.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get newsletter posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newsletter posts'
    });
  }
});

// @route   GET /api/newsletter/stats
// @desc    Get newsletter statistics (Admin only)
// @access  Private
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalSubscribers = await Newsletter.countDocuments();
    const activeSubscribers = await Newsletter.countDocuments({ isActive: true });
    const inactiveSubscribers = await Newsletter.countDocuments({ isActive: false });
    
    const totalPosts = await NewsletterPost.countDocuments();
    const sentPosts = await NewsletterPost.countDocuments({ status: 'sent' });
    const draftPosts = await NewsletterPost.countDocuments({ status: 'draft' });
    const scheduledPosts = await NewsletterPost.countDocuments({ status: 'scheduled' });

    // Get recent activity
    const recentSubscribers = await Newsletter.find()
      .sort({ subscribedAt: -1 })
      .limit(5)
      .select('email subscribedAt');

    const recentPosts = await NewsletterPost.find({ status: 'sent' })
      .sort({ sentAt: -1 })
      .limit(5)
      .select('title sentAt recipients')
      .populate('author', 'name');

    res.status(200).json({
      success: true,
      data: {
        subscribers: {
          total: totalSubscribers,
          active: activeSubscribers,
          inactive: inactiveSubscribers
        },
        posts: {
          total: totalPosts,
          sent: sentPosts,
          draft: draftPosts,
          scheduled: scheduledPosts
        },
        recent: {
          subscribers: recentSubscribers,
          posts: recentPosts
        }
      }
    });

  } catch (error) {
    console.error('Get newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newsletter statistics'
    });
  }
});

export default router;
