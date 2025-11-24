# Clean Cloak Backend API

Backend API for Clean Cloak - Professional Cleaning Services Platform

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
- Set `MONGODB_URI` to your MongoDB connection string
- Set `JWT_SECRET` to a secure random string
- Configure IntaSend payment keys
- Configure other environment variables as needed

4. **Start the server:**

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## 🌐 Deployment

### Vercel Deployment

This backend is configured for Vercel deployment with the following setup:

**Automatic Deployment:**
- Push to `main` branch → Auto-deploys to Vercel
- Environment variables configured in Vercel dashboard
- Serverless functions for each API route

**Current Deployment:**
- **URL:** `https://clean-cloak-b.vercel.app`
- **Health Check:** `https://clean-cloak-b.vercel.app/api/health`

**Required Vercel Environment Variables:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clean-cloak
JWT_SECRET=your-secure-jwt-secret
INTASEND_PUBLISHABLE_KEY=your-intasend-public-key
INTASEND_SECRET_KEY=your-intasend-secret-key
FRONTEND_URL=your-frontend-url
BACKEND_URL=https://clean-cloak-b.vercel.app
NODE_ENV=production
PORT=5000
```

## 📡 Complete API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |

### Bookings (`/api/bookings`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/bookings/public` | Create booking (no auth) | Public |
| POST | `/api/bookings` | Create new booking | Private (Client) |
| GET | `/api/bookings` | Get user's bookings | Private |
| GET | `/api/bookings/opportunities` | Get cleaner opportunities | Private (Cleaner) |
| GET | `/api/bookings/:id` | Get single booking | Private |
| POST | `/api/bookings/:id/pay` | Pay for booking (IntaSend) | Private (Client) |
| PUT | `/api/bookings/:id/status` | Update booking status | Private (Cleaner/Admin) |
| PUT | `/api/bookings/:id/rating` | Rate completed booking | Private (Client) |
| DELETE | `/api/bookings/:id` | Cancel booking | Private (Client/Admin) |

### Cleaners (`/api/cleaners`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/cleaners/profile` | Create cleaner profile | Private (Cleaner) |
| GET | `/api/cleaners/profile` | Get own profile | Private (Cleaner) |
| PUT | `/api/cleaners/profile` | Update profile | Private (Cleaner) |
| GET | `/api/cleaners` | Get all cleaners (with filters) | Public |
| GET | `/api/cleaners/:id` | Get single cleaner | Public |

### Users (`/api/users`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users/profile` | Get user profile | Private |
| PUT | `/api/users/profile` | Update user profile | Private |

### Admin (`/api/admin`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/cleaners/pending` | Get pending cleaner profiles | Private (Admin) |
| GET | `/api/admin/cleaners/approved` | Get approved cleaner profiles | Private (Admin) |
| GET | `/api/admin/cleaners/:id` | Get single cleaner profile | Private (Admin) |
| PUT | `/api/admin/cleaners/:id/approve` | Approve cleaner profile | Private (Admin) |

### Payments (`/api/payments`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payments/webhook` | IntaSend payment webhook | Public |

### Chat (`/api/chat`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/chat` | Create chat room | Private |
| GET | `/api/chat/:bookingId` | Get chat room | Private |
| POST | `/api/chat/:bookingId/message` | Send message | Private |
| GET | `/api/chat` | Get all user chats | Private |

### Tracking (`/api/tracking`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/tracking` | Start tracking | Private (Cleaner) |
| GET | `/api/tracking/:bookingId` | Get tracking data | Private |
| PUT | `/api/tracking/:bookingId/location` | Update location | Private (Cleaner) |
| PUT | `/api/tracking/:bookingId/status` | Update status | Private (Cleaner) |

### Verification (`/api/verification`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/verification/status` | Get verification status | Public |
| POST | `/api/verification/verify` | Submit verification | Public |
| POST | `/api/verification/resend` | Resend verification | Public |
| GET | `/api/verification/pending-profiles` | Get pending profiles | Private (Admin) |

### Team Leader (`/api/team-leader`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/team-leader/dashboard` | Team leader dashboard | Private (Team Leader) |
| GET | `/api/team-leader/payments` | Get team payments | Private (Team Leader) |
| POST | `/api/team-leader/payments` | Create payment | Private (Team Leader) |
| GET | `/api/team-leader/teams` | Get teams | Private (Team Leader) |
| POST | `/api/team-leader/teams` | Create team | Private (Team Leader) |

### Health Check

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/health` | API health check | Public |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

**To access protected routes:**
1. Login or register to get a token
2. Include token in Authorization header:
```
Authorization: Bearer <your-token>
```

**User Roles:**
- `client`: Can create bookings and manage their profile
- `cleaner`: Can manage profile, view opportunities, track jobs
- `admin`: Can approve cleaners, manage all bookings
- `team_leader`: Can manage teams and payments

## 💳 Payment Integration

### IntaSend Payment Gateway

The backend integrates with IntaSend for payment processing:

**Features:**
- M-Pesa STK Push for client payments
- Automatic 60/40 split (cleaner/platform)
- Webhook handling for payment confirmation
- Cleaner payout processing

**Payment Flow:**
1. Client creates booking
2. Client initiates payment via `/api/bookings/:id/pay`
3. IntaSend sends STK Push to client's phone
4. Client confirms payment on phone
5. IntaSend webhook confirms payment
6. Backend updates booking status
7. Backend processes cleaner payout

## 📦 Database Models

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  phone: String (required, unique),
  password: String (required, hashed),
  role: ['client', 'cleaner', 'admin', 'team_leader'],
  verificationStatus: ['pending', 'verified', 'rejected'],
  isActive: Boolean,
  isVerified: Boolean,
  profileImage: String
}
```

### Booking
```javascript
{
  client: ObjectId (ref: User),
  cleaner: ObjectId (ref: User),
  serviceCategory: ['car-detailing', 'home-cleaning'],
  vehicleType: ['sedan', 'suv', 'van', 'truck', 'motorcycle', 'other'],
  carServiceOption: ['INTERIOR', 'EXTERIOR', 'PAINT', 'FULL'],
  propertySize: ['studio', '1br', '2br', '3br', '4br+', 'office', 'commercial'],
  cleaningServiceOption: ['basic', 'deep', 'move-in', 'post-construction', 'regular'],
  bookingType: ['immediate', 'scheduled'],
  scheduledDate: String,
  scheduledTime: String,
  paymentMethod: ['mpesa', 'card', 'cash'],
  price: Number (required),
  totalPrice: Number,
  platformFee: Number,
  cleanerPayout: Number,
  location: {
    address: String,
    coordinates: [Number],
    manualAddress: String
  },
  paymentStatus: ['pending', 'paid', 'failed', 'refunded'],
  paid: Boolean,
  paidAt: Date,
  status: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
  rating: Number (1-5),
  review: String,
  completedAt: Date
}
```

### CleanerProfile
```javascript
{
  user: ObjectId (ref: User),
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  profileImage: String,
  passportPhoto: String,
  fullBodyPhoto: String,
  services: ['car-detailing', 'home-cleaning'],
  bio: String,
  address: String (required),
  city: String (required),
  portfolioImages: [String],
  beforeAfterPhotos: [{
    bookingId: String,
    beforeImage: String,
    afterImage: String,
    description: String,
    uploadedBy: String,
    uploadedAt: Date,
    servicesUsed: [String]
  }],
  approvalStatus: ['pending', 'approved', 'rejected'],
  approvalNotes: String,
  approvalHistory: [{
    status: String,
    notes: String,
    admin: ObjectId (ref: User),
    changedAt: Date
  }],
  totalJobs: Number,
  completedJobs: Number,
  rating: Number (1-5),
  totalRatings: Number,
  verified: Boolean,
  verification: {
    idVerified: Boolean,
    idNumber: String,
    idDocumentFront: String,
    idDocumentBack: String,
    policeCheck: Boolean,
    policeCertificate: String,
    references: [{
      name: String,
      phone: String,
      relationship: String,
      verified: Boolean
    }],
    insuranceCoverage: Boolean,
    insuranceDocument: String,
    verifiedAt: Date
  },
  mpesaPhoneNumber: String (required, Kenya format),
  isAvailable: Boolean,
  workingHours: {
    start: String,
    end: String
  }
}
```

### Transaction
```javascript
{
  booking: ObjectId (ref: Booking),
  client: ObjectId (ref: User),
  cleaner: ObjectId (ref: User),
  type: ['payment', 'payout', 'refund'],
  amount: Number (required),
  paymentMethod: ['mpesa', 'card', 'cash'],
  transactionId: String (required),
  reference: String (required),
  description: String (required),
  status: ['pending', 'completed', 'failed'],
  processedAt: Date,
  metadata: {
    intasendData: Object,
    split: {
      platformFee: Number,
      cleanerPayout: Number
    },
    mpesaPhone: String
  }
}
```

### ChatRoom
```javascript
{
  booking: ObjectId (ref: Booking),
  client: ObjectId (ref: User),
  cleaner: ObjectId (ref: User),
  messages: [{
    sender: ObjectId (ref: User),
    senderRole: ['client', 'cleaner'],
    message: String,
    imageUrl: String,
    read: Boolean,
    timestamp: Date
  }],
  lastMessage: Object,
  unreadCount: {
    client: Number,
    cleaner: Number
  },
  active: Boolean
}
```

### Tracking
```javascript
{
  booking: ObjectId (ref: Booking),
  cleaner: ObjectId (ref: User),
  status: ['assigned', 'in_progress', 'completed', 'cancelled'],
  currentLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    address: String,
    timestamp: Date
  }],
  estimatedArrival: String
}
```

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **Payment Gateway:** IntaSend
- **CORS:** cors middleware
- **Security:** Helmet, Rate Limiting
- **Logging:** Morgan
- **File Upload:** Multer
- **UUID:** uuid

## 📝 Complete Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clean-cloak

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# CORS Configuration
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000

# IntaSend Payment Gateway
INTASEND_PUBLISHABLE_KEY=ISPubKey_test_your-key
INTASEND_SECRET_KEY=ISSecretKey_live_your-key
INTASEND_WEBHOOK_SECRET=your-intasend-webhook-secret
INTASEND_ENVIRONMENT=test

# Team Leader System Configuration
TEAM_LEADER_COMMISSION_RATE=0.40
CREW_MEMBER_COMMISSION_RATE=0.60
AUTO_TEAM_ASSIGNMENT=true
MAX_CREW_SIZE=10
MIN_TEAM_LEADER_RATING=4.0

# Verification System Configuration
VERIFICATION_REQUIRED=true
BACKGROUND_CHECK_ENABLED=true

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔄 Development

**Run in development mode with auto-reload:**
```bash
npm run dev
```

**Check API health:**
```bash
curl http://localhost:5000/api/health
```

**Test authentication:**
```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","phone":"0712345678","password":"password123"}'

# Login user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","password":"password123"}'
```

## 🚨 Recent Fixes & Updates

### Critical Fixes Applied:
1. **Booking Model Update**: Fixed schema mismatch with all required fields and `calculatePricing()` method
2. **Environment Variables**: Updated MongoDB URI and added missing variables for Vercel deployment
3. **Transaction Model**: Updated to match payment route expectations
4. **Tracking Model**: Fixed to support location tracking features
5. **Chat Import**: Fixed model import path in chat routes
6. **UUID Dependency**: Added to package.json for booking operations
7. **File System References**: Removed unused file-based storage code

### Deployment Fixes:
- Configured for Vercel serverless deployment
- Fixed environment variable handling
- Resolved model import issues
- Updated CORS configuration for production

## 📱 API Usage Examples

### Create a Booking (Public)
```bash
curl -X POST https://clean-cloak-b.vercel.app/api/bookings/public \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "name": "John Doe",
      "phone": "0712345678",
      "email": "john@example.com"
    },
    "serviceCategory": "car-detailing",
    "vehicleType": "sedan",
    "carServiceOption": "FULL",
    "bookingType": "immediate",
    "paymentMethod": "mpesa",
    "price": 3000,
    "location": {
      "manualAddress": "Nairobi, Kenya"
    }
  }'
```

### Get Available Cleaners
```bash
curl "https://clean-cloak-b.vercel.app/api/cleaners?service=car-detailing&city=Nairobi"
```

### Admin Dashboard - Get Pending Cleaners
```bash
curl -X GET https://clean-cloak-b.vercel.app/api/admin/cleaners/pending \
  -H "Authorization: Bearer <admin-token>"
```

## 🚧 Future Enhancements

- **Real-time Features**: Socket.io integration for live chat and tracking
- **SMS Notifications**: Twilio integration for booking updates
- **Email Notifications**: Nodemailer for email confirmations
- **File Upload**: Cloud storage integration for images
- **Advanced Analytics**: Booking analytics and reporting
- **Push Notifications**: Mobile app notifications
- **Multi-language Support**: i18n for multiple languages
- **Advanced Search**: Elasticsearch integration
- **Caching**: Redis for performance optimization
- **Microservices**: Split into separate services

## 🐛 Troubleshooting

### Common Issues:

1. **Server Crashes on Startup**
   - Check all model imports are correct
   - Verify environment variables are set
   - Check MongoDB connection string

2. **Authentication Failures**
   - Verify JWT_SECRET is set
   - Check token format in Authorization header
   - Ensure user exists in database

3. **Payment Issues**
   - Verify IntaSend keys are correct
   - Check webhook URL configuration
   - Ensure M-Pesa phone format is correct

4. **Database Connection Issues**
   - Check MongoDB URI format
   - Verify network access to MongoDB
   - Check database user permissions

### Debug Mode:
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check environment variables
node -e "console.log(process.env)"
```

## 📞 Support

For issues and support:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check Vercel deployment logs
4. Verify environment variables in Vercel dashboard

---

**Last Updated**: November 2024
**Version**: 2.0.0
**Deployment**: Vercel Serverless
