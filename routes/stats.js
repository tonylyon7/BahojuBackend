import express from 'express';
import { body, validationResult } from 'express-validator';
import Stats from '../models/Stats.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get website statistics
// @route   GET /api/stats
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    let stats = await Stats.findOne().populate('updatedBy', 'name email');
    
    // If no stats exist, create default stats
    if (!stats) {
      // Create a default admin user for stats if none exists
      const defaultStats = {
        clients: 300,
        projects: 500,
        supportHours: 1250,
        employees: 14,
        updatedBy: null // Will be set when an admin updates it
      };
      
      stats = await Stats.create(defaultStats);
    }

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update website statistics - Admin only
// @route   PUT /api/stats
// @access  Private/Admin
router.put('/', protect, adminOnly, [
  body('clients').optional().isInt({ min: 0 }).withMessage('Clients must be a positive number'),
  body('projects').optional().isInt({ min: 0 }).withMessage('Projects must be a positive number'),
  body('supportHours').optional().isInt({ min: 0 }).withMessage('Support hours must be a positive number'),
  body('employees').optional().isInt({ min: 0 }).withMessage('Employees must be a positive number')
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

    const { clients, projects, supportHours, employees } = req.body;
    
    const updateData = {
      lastUpdated: new Date(),
      updatedBy: req.user.id
    };

    if (clients !== undefined) updateData.clients = clients;
    if (projects !== undefined) updateData.projects = projects;
    if (supportHours !== undefined) updateData.supportHours = supportHours;
    if (employees !== undefined) updateData.employees = employees;

    let stats = await Stats.findOne();
    
    if (!stats) {
      // Create new stats if none exist
      stats = await Stats.create({
        clients: clients || 300,
        projects: projects || 500,
        supportHours: supportHours || 1250,
        employees: employees || 14,
        updatedBy: req.user.id
      });
    } else {
      // Update existing stats
      stats = await Stats.findOneAndUpdate(
        {},
        updateData,
        { new: true, runValidators: true }
      );
    }

    await stats.populate('updatedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Statistics updated successfully',
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get stats history - Admin only
// @route   GET /api/stats/history
// @access  Private/Admin
router.get('/history', protect, adminOnly, async (req, res, next) => {
  try {
    // This would require a separate StatsHistory model to track changes over time
    // For now, just return the current stats
    const stats = await Stats.findOne().populate('updatedBy', 'name email');
    
    res.status(200).json({
      success: true,
      data: { 
        stats,
        message: 'Stats history feature coming soon'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
