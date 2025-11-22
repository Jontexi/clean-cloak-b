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

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |

### Bookings (`/api/bookings`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/bookings` | Create new booking | Private (Client) |
| GET | `/api/bookings` | Get user's bookings | Private |
| GET | `/api/bookings/:id` | Get single booking | Private |
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

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

**To access protected routes:**
1. Login or register to get a token
2. Include token in Authorization header:
```
Authorization: Bearer <your-token>
```

## 📦 Database Models

### User
- name, email, phone, password
- role: client | cleaner | admin
- isVerified, profileImage

### Booking
- client, cleaner (refs to User)
- serviceCategory: car-detailing | home-cleaning
- vehicleType, carServiceOption (for car detailing)
- propertySize, cleaningServiceOption (for home cleaning)
- location, bookingType, scheduledDate, scheduledTime
- paymentMethod, price, paymentStatus
- status: pending | confirmed | in-progress | completed | cancelled
- rating, review

### CleanerProfile
- user (ref to User)
- services: [car-detailing, home-cleaning]
- bio, address, city
- portfolioImages
- totalJobs, completedJobs, rating, totalRatings
- verified, isAvailable, workingHours

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **CORS:** cors middleware

## 📝 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/clean-cloak
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
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

## 📱 Next Steps

1. **Install MongoDB** (if not already installed)
2. **Configure environment variables**
3. **Start the backend server**
4. **Update frontend to connect to API**
5. **Test API endpoints** using Postman or similar tool

## 🚧 Future Enhancements

- M-PESA payment integration (Daraja API)
- SMS notifications
- Email notifications
- File upload for images (Multer + Cloud storage)
- Real-time updates (Socket.io)
- Admin dashboard endpoints
- Analytics and reporting
