import express from 'express';
import { body, validationResult } from 'express-validator';
import Blog from '../models/Blog.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all published blogs
// @route   GET /api/blog
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;
    const featured = req.query.featured;

    // Build query for published blogs only
    let query = { status: 'published' };
    
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .select('-content') // Exclude full content for list view
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        blogs,
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

// @desc    Get single blog by slug
// @route   GET /api/blog/:slug
// @access  Public
router.get('/:slug', async (req, res, next) => {
  try {
    const blog = await Blog.findOne({ 
      slug: req.params.slug, 
      status: 'published' 
    }).populate('author', 'name email avatar');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get featured blogs
// @route   GET /api/blog/featured/posts
// @access  Public
router.get('/featured/posts', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 3;

    const blogs = await Blog.find({ 
      status: 'published', 
      featured: true 
    })
      .populate('author', 'name email')
      .select('-content')
      .sort({ publishedAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: { blogs }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get blog categories
// @route   GET /api/blog/categories/list
// @access  Public
router.get('/categories/list', async (req, res, next) => {
  try {
    const categories = await Blog.distinct('category', { status: 'published' });
    
    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes below - require authentication and admin privileges

// @desc    Get all blogs (including drafts) - Admin only
// @route   GET /api/blog/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const category = req.query.category;
    const search = req.query.search;

    // Build query
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const blogs = await Blog.find(query)
      .populate('author', 'name email')
      .select('-content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        blogs,
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

// @desc    Create new blog post - Admin only
// @route   POST /api/blog
// @access  Private/Admin
router.post('/', protect, adminOnly, [
  body('title').trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
  body('excerpt').trim().isLength({ min: 10 }).withMessage('Excerpt must be at least 10 characters'),
  body('content').trim().isLength({ min: 50 }).withMessage('Content must be at least 50 characters'),
  body('category').isIn([
    'Digital Marketing',
    'Software Development',
    'Cloud Computing',
    'Training',
    'Business Branding',
    'Technology',
    'Innovation',
    'General'
  ]).withMessage('Invalid category'),
  body('featuredImageCloudinary.url').optional().isURL().withMessage('Featured image URL must be valid'),
  body('contentImages').optional().isArray().withMessage('Content images must be an array')
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

    const blogData = {
      ...req.body,
      author: req.user.id
    };

    const blog = await Blog.create(blogData);
    await blog.populate('author', 'name email');

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update blog post - Admin only
// @route   PUT /api/blog/:id
// @access  Private/Admin
router.put('/:id', protect, adminOnly, [
  body('title').optional().trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
  body('excerpt').optional().trim().isLength({ min: 10 }).withMessage('Excerpt must be at least 10 characters'),
  body('content').optional().trim().isLength({ min: 50 }).withMessage('Content must be at least 50 characters')
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

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully',
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete blog post - Admin only
// @route   DELETE /api/blog/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single blog by ID (Admin only)
// @route   GET /api/blog/admin/:id
// @access  Private/Admin
router.get('/admin/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name email avatar');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { blog }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
