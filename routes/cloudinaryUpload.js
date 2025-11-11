import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { protect, adminOnly } from '../middleware/auth.js';
import validateCloudinary from '../middleware/cloudinaryValidation.js';

const router = express.Router();

// Configure multer for memory storage (we'll upload to Cloudinary directly)
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for images
  },
  fileFilter: fileFilter
});

// @desc    Upload blog image to Cloudinary
// @route   POST /api/cloudinary/blog-image
// @access  Private/Admin
router.post('/blog-image', protect, adminOnly, validateCloudinary, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'bahoju/blog-images',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.status(200).json({
      success: true,
      message: 'Blog image uploaded successfully',
      data: {
        image: {
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          created_at: result.created_at
        }
      }
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image to Cloudinary',
      error: error.message
    });
  }
});

// @desc    Upload featured image for blog
// @route   POST /api/cloudinary/featured-image
// @access  Private/Admin
router.post('/featured-image', protect, adminOnly, validateCloudinary, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    // Upload to Cloudinary with specific transformations for featured images
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'bahoju/featured-images',
          resource_type: 'image',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.status(200).json({
      success: true,
      message: 'Featured image uploaded successfully',
      data: {
        image: {
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          size: result.bytes,
          created_at: result.created_at
        }
      }
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload featured image to Cloudinary',
      error: error.message
    });
  }
});

// @desc    Upload multiple images for blog content
// @route   POST /api/cloudinary/content-images
// @access  Private/Admin
router.post('/content-images', protect, adminOnly, validateCloudinary, upload.array('images', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files uploaded'
      });
    }

    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'bahoju/content-images',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' },
              { format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    const images = results.map(result => ({
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      created_at: result.created_at
    }));

    res.status(200).json({
      success: true,
      message: `${images.length} content images uploaded successfully`,
      data: { images }
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload content images to Cloudinary',
      error: error.message
    });
  }
});

// @desc    Delete image from Cloudinary
// @route   DELETE /api/cloudinary/:publicId
// @access  Private/Admin
router.delete('/:publicId', protect, adminOnly, validateCloudinary, async (req, res, next) => {
  try {
    const publicId = req.params.publicId;
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully from Cloudinary'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found or already deleted'
      });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image from Cloudinary',
      error: error.message
    });
  }
});

// @desc    Get list of images from Cloudinary
// @route   GET /api/cloudinary/images
// @access  Private/Admin
router.get('/images', protect, adminOnly, validateCloudinary, async (req, res, next) => {
  try {
    const folder = req.query.folder || 'bahoju';
    const maxResults = parseInt(req.query.limit) || 50;
    
    const result = await cloudinary.search
      .expression(`folder:${folder}/*`)
      .sort_by([['created_at', 'desc']])
      .max_results(maxResults)
      .execute();

    const images = result.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      width: resource.width,
      height: resource.height,
      format: resource.format,
      size: resource.bytes,
      created_at: resource.created_at,
      folder: resource.folder
    }));

    res.status(200).json({
      success: true,
      data: {
        images,
        total: result.total_count,
        next_cursor: result.next_cursor
      }
    });
  } catch (error) {
    console.error('Cloudinary search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images from Cloudinary',
      error: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB for images.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 images per upload.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

export default router;
