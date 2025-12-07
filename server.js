const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");
const serverless = require("serverless-http");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Request timeout for serverless
app.use((req, res, next) => {
  res.setTimeout(25000, () => {
    console.error("Request timeout:", req.url);
    res.status(408).json({
      success: false,
      message: "Request timeout",
    });
  });
  next();
});

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// CORS configuration
app.use(
  cors({
    origin: [
      // ✅ NEW - Production Netlify frontend
      "https://rad-maamoul-c7a511.netlify.app",

      // ✅ APK support (mobile app)
      "capacitor://localhost",
      "ionic://localhost",
      "http://localhost",

      // Old Netlify deployments (backup)
      "https://sprightly-trifle-9b980c.netlify.app",
      "https://teal-daffodil-d3a9b2.netlify.app",

      // Local development
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection with serverless optimization
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    cachedDb = conn;
    console.log("✅ MongoDB Connected Successfully");
    return conn;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    throw err;
  }
}

// Enhanced error handling for serverless
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Initialize connection
connectToDatabase().catch((err) => {
  console.error("Failed to initialize database connection:", err);
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/bookings", require("./routes/bookings"));
app.use("/api/cleaners", require("./routes/cleaners"));
app.use("/api/users", require("./routes/users"));
app.use("/api/tracking", require("./routes/tracking"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/team-leader", require("./routes/team-leader")); // Team Leader System
app.use("/api/verification", require("./routes/verification")); // Verification System
app.use("/api/chat", require("./routes/chat"));

app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const health = {
      status: "OK",
      message: "Clean Cloak API is running",
      timestamp: new Date().toISOString(),
      database: {
        state: dbStates[dbState],
        healthy: dbState === 1,
      },
      environment: process.env.NODE_ENV || "development",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
      },
    };

    if (dbState !== 1) {
      health.status = "WARNING";
      health.message = "Database connection issue";
    }

    res.status(dbState === 1 ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Enhanced error middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get("User-Agent"),
  });

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      error: err,
    }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

// Export for serverless (Vercel) or start server (Render/Traditional hosting)
if (process.env.VERCEL) {
  // Vercel serverless deployment
  module.exports = serverless(app);
} else {
  // Traditional server for Render, Heroku, Railway, or local development
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🌐 Frontend URL: ${process.env.FRONTEND_URL || "https://teal-daffodil-d3a9b2.netlify.app/"}`,
    );
  });
}
