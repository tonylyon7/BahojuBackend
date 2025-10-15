import express from 'express';
import { body, validationResult } from 'express-validator';
import Contact from '../models/Contact.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendContactNotification, sendAutoResponseEmail } from '../utils/emailService.js';

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('company').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters if provided'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  body('inquiryType').isIn(['TECH SERVICES', 'TRAINING', 'INTERNSHIP']).withMessage('Invalid inquiry type')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, company, message, inquiryType } = req.body;

    // Create contact entry
    const contact = await Contact.create({
      firstName,
      lastName,
      email,
      company: company || undefined, // Only include company if provided
      message,
      inquiryType
    });

    // Send notification email to admin (async, don't wait for it)
    sendContactNotification(contact).catch(err => {
      console.error('Failed to send contact notification:', err);
    });

    // Send auto-response email to user (async, don't wait for it)
    sendAutoResponseEmail(contact).catch(err => {
      console.error('Failed to send auto-response email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
      data: {
        contact: {
          id: contact._id,
          fullName: contact.fullName,
          email: contact.email,
          company: contact.company,
          inquiryType: contact.inquiryType,
          createdAt: contact.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all contacts (Admin only)
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const inquiryType = req.query.inquiryType;
    const search = req.query.search;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (inquiryType) query.inquiryType = inquiryType;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const contacts = await Contact.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        contacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single contact (Admin only)
// @route   GET /api/contact/:id
// @access  Private/Admin
router.get('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('notes.addedBy', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Mark as read
    if (!contact.isRead) {
      contact.isRead = true;
      await contact.save();
    }

    res.status(200).json({
      success: true,
      data: { contact }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update contact status (Admin only)
// @route   PUT /api/contact/:id
// @access  Private/Admin
router.put('/:id', protect, adminOnly, [
  body('status').optional().isIn(['new', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, priority, assignedTo } = req.body;
    const updateData = {};

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;

    // Set response date if status is resolved or closed
    if (status && ['resolved', 'closed'].includes(status)) {
      updateData.responseDate = new Date();
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: { contact }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add note to contact (Admin only)
// @route   POST /api/contact/:id/notes
// @access  Private/Admin
router.post('/:id/notes', protect, adminOnly, [
  body('note').trim().isLength({ min: 1 }).withMessage('Note cannot be empty')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    contact.notes.push({
      note: req.body.note,
      addedBy: req.user.id
    });

    await contact.save();

    // Populate the new note
    await contact.populate('notes.addedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: { 
        contact,
        newNote: contact.notes[contact.notes.length - 1]
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete contact (Admin only)
// @route   DELETE /api/contact/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
