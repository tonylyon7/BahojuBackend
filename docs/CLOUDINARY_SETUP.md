# Cloudinary Integration Setup Guide

## Overview
This guide explains how to set up and use Cloudinary for image uploads in the Bahoju Tech backend API.

## Prerequisites
1. A Cloudinary account (free tier available)
2. Node.js backend with the required dependencies installed

## Setup Instructions

### 1. Create Cloudinary Account
1. Go to [Cloudinary](https://cloudinary.com/) and sign up for a free account
2. After registration, go to your Dashboard
3. Note down your:
   - Cloud Name
   - API Key
   - API Secret

### 2. Update Environment Variables
Add the following variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 3. Available API Endpoints

#### Upload Blog Image
- **POST** `/api/cloudinary/blog-image`
- **Description**: Upload a single image for blog content
- **Authentication**: Admin required
- **Body**: Form-data with `image` field
- **Response**: Image details with Cloudinary URL

#### Upload Featured Image
- **POST** `/api/cloudinary/featured-image`
- **Description**: Upload a featured image for blog posts
- **Authentication**: Admin required
- **Body**: Form-data with `image` field
- **Response**: Featured image details with optimized URL

#### Upload Multiple Content Images
- **POST** `/api/cloudinary/content-images`
- **Description**: Upload multiple images for blog content
- **Authentication**: Admin required
- **Body**: Form-data with `images` field (max 5 files)
- **Response**: Array of uploaded image details

#### Delete Image
- **DELETE** `/api/cloudinary/:publicId`
- **Description**: Delete an image from Cloudinary
- **Authentication**: Admin required
- **Parameters**: `publicId` - Cloudinary public ID
- **Response**: Deletion confirmation

#### Get Images List
- **GET** `/api/cloudinary/images`
- **Description**: Get list of uploaded images
- **Authentication**: Admin required
- **Query Parameters**: 
  - `folder` (optional): Specific folder to search
  - `limit` (optional): Maximum results (default: 50)
- **Response**: List of images with metadata

## Image Transformations

### Blog Images
- **Max dimensions**: 1200x800px
- **Quality**: Auto-optimized
- **Format**: Auto-converted to best format

### Featured Images
- **Max dimensions**: 1920x1080px
- **Quality**: Auto-optimized
- **Format**: Auto-converted to best format

### Content Images
- **Max dimensions**: 800x600px
- **Quality**: Auto-optimized
- **Format**: Auto-converted to best format

## Folder Structure
Images are organized in Cloudinary folders:
- `bahoju/blog-images/` - Regular blog images
- `bahoju/featured-images/` - Featured blog images
- `bahoju/content-images/` - Blog content images

## Usage Examples

### Upload Featured Image (JavaScript)
```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('/api/cloudinary/featured-image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});

const result = await response.json();
console.log('Uploaded image URL:', result.data.image.url);
```

### Upload Multiple Content Images
```javascript
const formData = new FormData();
imageFiles.forEach(file => {
  formData.append('images', file);
});

const response = await fetch('/api/cloudinary/content-images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});

const result = await response.json();
result.data.images.forEach(image => {
  console.log('Image URL:', image.url);
});
```

## Blog Model Integration

The Blog model now includes Cloudinary fields:

```javascript
{
  // Existing fields...
  featuredImageCloudinary: {
    public_id: String,
    url: String
  },
  contentImages: [{
    public_id: String,
    url: String,
    alt: String
  }]
}
```

## Error Handling

Common error responses:
- `400`: Invalid file type or missing file
- `401`: Authentication required
- `403`: Admin privileges required
- `500`: Cloudinary configuration error or upload failure

## File Restrictions

- **Supported formats**: JPEG, PNG, GIF, WebP
- **Maximum file size**: 10MB per image
- **Maximum files per upload**: 5 images for multiple upload

## Security Features

1. **Authentication**: All endpoints require admin authentication
2. **File validation**: Only image files are accepted
3. **Size limits**: Prevents oversized uploads
4. **Configuration validation**: Ensures Cloudinary is properly configured

## Troubleshooting

### Common Issues

1. **"Cloudinary configuration is missing"**
   - Check your `.env` file has all required Cloudinary variables
   - Restart your server after adding environment variables

2. **"Invalid file type"**
   - Ensure you're uploading image files (JPEG, PNG, GIF, WebP)
   - Check the file extension and MIME type

3. **"File too large"**
   - Reduce image file size to under 10MB
   - Consider compressing images before upload

4. **Upload timeout**
   - Check your internet connection
   - Verify Cloudinary service status

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your `.env` file.

## Best Practices

1. **Image Optimization**: Use Cloudinary's auto-optimization features
2. **Responsive Images**: Utilize different image sizes for different devices
3. **Alt Text**: Always provide alt text for accessibility
4. **Cleanup**: Delete unused images to manage storage quota
5. **Backup**: Consider backing up important images outside Cloudinary

## Support
For issues related to Cloudinary integration, check:
1. Cloudinary documentation: https://cloudinary.com/documentation
2. This project's GitHub issues
3. Server logs for detailed error messages
