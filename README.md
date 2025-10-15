# Bahoju Tech Backend API

A comprehensive Node.js backend API for the Bahoju Tech website, built with Express.js and MongoDB.

## 🚀 Features

- **Admin System**: Simple admin authentication for blog and content management
- **Admin Authentication**: JWT-based authentication for admin users only
- **Contact Management**: Handle contact form submissions with email notifications
- **Blog Management**: Full CRUD operations for blog posts with categories and tags
- **File Upload**: Secure file upload system for images and documents
- **Statistics Management**: Dynamic website statistics management
- **Email Service**: Automated email notifications and communications
- **Security**: Rate limiting, CORS, helmet, input validation
- **Error Handling**: Centralized error handling with detailed logging

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Environment**: dotenv

## 📁 Project Structure

```
Backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── errorHandler.js      # Global error handling
├── models/
│   ├── Admin.js             # Admin model
│   ├── Contact.js           # Contact form model
│   ├── Blog.js              # Blog post model
│   └── Stats.js             # Website statistics model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── contact.js           # Contact form routes
│   ├── blog.js              # Blog management routes
│   ├── upload.js            # File upload routes
│   └── stats.js             # Statistics routes
├── scripts/
│   └── seedData.js          # Database seeding script
├── utils/
│   └── emailService.js      # Email service utilities
├── uploads/                 # File upload directory
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
├── server.js                # Main server file
└── README.md               # This file
```

## ⚡ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd Bahoju/Backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy the `.env` file and update the values:
   ```bash
   # Database
   MONGODB_URI=mongodb://localhost:27017/bahoju_tech
   
   # Server
   PORT=5000
   NODE_ENV=development
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   
   # Email (Gmail example)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   # Admin
   ADMIN_EMAIL=admin@bahojutech.com
   ADMIN_PASSWORD=admin123
   
   # Frontend
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

5. **Seed the database** (optional):
   ```bash
   npm run seed
   ```

6. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new admin | Public |
| POST | `/auth/login` | Admin login | Public |
| GET | `/auth/me` | Get current admin | Private |
| PUT | `/auth/profile` | Update admin profile | Private |

### Contact Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/contact` | Submit contact form | Public |
| GET | `/contact` | Get all contacts | Admin |
| GET | `/contact/:id` | Get single contact | Admin |
| PUT | `/contact/:id` | Update contact | Admin |
| POST | `/contact/:id/notes` | Add note to contact | Admin |
| DELETE | `/contact/:id` | Delete contact | Admin |

### Blog Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/blog` | Get published blogs | Public |
| GET | `/blog/:slug` | Get single blog | Public |
| GET | `/blog/featured/posts` | Get featured blogs | Public |
| GET | `/blog/categories/list` | Get categories | Public |
| GET | `/blog/admin/all` | Get all blogs | Admin |
| POST | `/blog` | Create blog post | Admin |
| PUT | `/blog/:id` | Update blog post | Admin |
| DELETE | `/blog/:id` | Delete blog post | Admin |

### Statistics Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/stats` | Get website stats | Public |
| PUT | `/stats` | Update stats | Admin |

### Upload Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/upload/single` | Upload single file | Admin |
| POST | `/upload/multiple` | Upload multiple files | Admin |
| GET | `/upload/files` | List uploaded files | Admin |
| DELETE | `/upload/:filename` | Delete file | Admin |


## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `EMAIL_SERVICE` | Email service provider | gmail |
| `EMAIL_HOST` | SMTP host | smtp.gmail.com |
| `EMAIL_PORT` | SMTP port | 587 |
| `EMAIL_USER` | Email username | Required |
| `EMAIL_PASS` | Email password/app password | Required |
| `ADMIN_EMAIL` | Admin email address | Required |
| `ADMIN_PASSWORD` | Default admin password | Required |
| `FRONTEND_URL` | Frontend application URL | Required |
| `MAX_FILE_SIZE` | Max upload file size | 5242880 (5MB) |

### Email Configuration

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `EMAIL_PASS`

## 🗄️ Database Models

### Admin Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar: String,
  isActive: Boolean,
  lastLogin: Date
}
```

### Contact Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  company: String,
  message: String,
  inquiryType: String,
  status: String,
  priority: String,
  assignedTo: ObjectId,
  notes: Array,
  isRead: Boolean
}
```

### Blog Model
```javascript
{
  title: String,
  slug: String (unique),
  excerpt: String,
  content: String,
  author: ObjectId,
  category: String,
  tags: Array,
  featuredImage: String,
  status: String,
  featured: Boolean,
  views: Number,
  seo: Object
}
```

### Stats Model
```javascript
{
  clients: Number,
  projects: Number,
  supportHours: Number,
  employees: Number,
  lastUpdated: Date,
  updatedBy: ObjectId
}
```

## 🚀 Deployment

### Production Setup

1. **Set environment to production**:
   ```bash
   NODE_ENV=production
   ```

2. **Use MongoDB Atlas** for production database

3. **Configure proper email service** (SendGrid, AWS SES, etc.)

4. **Set up reverse proxy** (Nginx recommended)

5. **Enable HTTPS** with SSL certificates

6. **Use PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "bahoju-api"
   ```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevent API abuse
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Input Validation**: Express validator for request validation
- **File Upload Security**: File type and size restrictions

## 🧪 Testing

Run the health check endpoint to verify the API is working:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Bahoju Tech API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run seed` | Seed database with sample data |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Email: support@bahojutech.com
- Documentation: [API Docs](http://localhost:5000/api/health)

---

**Bahoju Tech** - Innovate. Elevate. Dominate.
