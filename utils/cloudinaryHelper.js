import cloudinary from '../config/cloudinary.js';

/**
 * Upload image buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      resource_type: 'image',
      quality: 'auto',
      format: 'auto'
    };

    const uploadOptions = { ...defaultOptions, ...options };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Get optimized image URL from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformations - Image transformations
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto',
    format: 'auto'
  };

  const finalTransformations = { ...defaultTransformations, ...transformations };

  return cloudinary.url(publicId, finalTransformations);
};

/**
 * Generate responsive image URLs
 * @param {string} publicId - Cloudinary public ID
 * @returns {Object} - Object containing different sized image URLs
 */
export const generateResponsiveUrls = (publicId) => {
  return {
    thumbnail: getOptimizedImageUrl(publicId, { width: 150, height: 150, crop: 'fill' }),
    small: getOptimizedImageUrl(publicId, { width: 400, height: 300, crop: 'limit' }),
    medium: getOptimizedImageUrl(publicId, { width: 800, height: 600, crop: 'limit' }),
    large: getOptimizedImageUrl(publicId, { width: 1200, height: 800, crop: 'limit' }),
    original: getOptimizedImageUrl(publicId)
  };
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary image URL
 * @returns {string|null} - Extracted public ID or null if invalid
 */
export const extractPublicId = (url) => {
  try {
    const regex = /\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Validate Cloudinary configuration
 * @returns {boolean} - True if configuration is valid
 */
export const validateCloudinaryConfig = () => {
  try {
    // Check environment variables directly
    const envCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const envApiKey = process.env.CLOUDINARY_API_KEY;
    const envApiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!envCloudName || !envApiKey || !envApiSecret) {
      return false;
    }
    
    // Check cloudinary config
    const { cloud_name, api_key, api_secret } = cloudinary.config();
    return !!(cloud_name && api_key && api_secret);
  } catch (error) {
    console.error('Error in validateCloudinaryConfig:', error);
    return false;
  }
};
