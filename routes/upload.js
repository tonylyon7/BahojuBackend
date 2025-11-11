import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = './uploads/';
    
    // Create subdirectories based on file type
    if (file.mimetype.startsWith('image/')) {
      uploadPath += 'images/';
    } else if (file.mimetype === 'application/pdf') {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'others/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  },
  fileFilter: fileFilter
});

// @desc    Upload single file
// @route   POST /api/upload/single
// @access  Private/Admin
router.post('/single', protect, adminOnly, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `/uploads/${path.relative('./uploads', req.file.path).replace(/\\/g, '/')}`;

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload multiple files
// @route   POST /api/upload/multiple
// @access  Private/Admin
router.post('/multiple', protect, adminOnly, upload.array('files', 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${path.relative('./uploads', file.path).replace(/\\/g, '/')}`,
      path: file.path
    }));

    res.status(200).json({
      success: true,
      message: `${files.length} files uploaded successfully`,
      data: { files }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/upload/:filename
// @access  Private/Admin
router.delete('/:filename', protect, adminOnly, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    
    // Search for the file in all subdirectories
    const searchPaths = [
      `./uploads/images/${filename}`,
      `./uploads/documents/${filename}`,
      `./uploads/others/${filename}`,
      `./uploads/${filename}`
    ];
    
    let filePath = null;
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        filePath = searchPath;
        break;
      }
    }
    
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get list of uploaded files
// @route   GET /api/upload/files
// @access  Private/Admin
router.get('/files', protect, adminOnly, async (req, res, next) => {
  try {
    const type = req.query.type; // 'images', 'documents', 'others', or 'all'
    const files = [];
    
    const scanDirectory = (dirPath, category) => {
      if (fs.existsSync(dirPath)) {
        const dirFiles = fs.readdirSync(dirPath);
        dirFiles.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isFile()) {
            files.push({
              filename: file,
              category,
              size: stats.size,
              url: `/uploads/${path.relative('./uploads', filePath).replace(/\\/g, '/')}`,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime
            });
          }
        });
      }
    };

    // Scan directories based on type filter
    if (!type || type === 'all') {
      scanDirectory('./uploads/images', 'images');
      scanDirectory('./uploads/documents', 'documents');
      scanDirectory('./uploads/others', 'others');
      scanDirectory('./uploads', 'root');
    } else {
      scanDirectory(`./uploads/${type}`, type);
    }

    // Sort by creation date (newest first)
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: { 
        files,
        total: files.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per upload.'
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
