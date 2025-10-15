import dotenv from 'dotenv';
import { validateCloudinaryConfig } from '../utils/cloudinaryHelper.js';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Middleware to validate Cloudinary configuration
 */
export const validateCloudinary = (req, res, next) => {
  try {
    // Double-check environment variables are loaded
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary configuration is missing or invalid. Please check your environment variables.',
        error: 'CLOUDINARY_CONFIG_ERROR'
      });
    }

    if (!validateCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary configuration is missing or invalid. Please check your environment variables.',
        error: 'CLOUDINARY_CONFIG_ERROR'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in Cloudinary validation middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Cloudinary configuration error.',
      error: 'CLOUDINARY_CONFIG_ERROR'
    });
  }
};

export default validateCloudinary;
