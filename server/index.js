const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dns = require("dns");
require("dotenv").config();

// Pin DNS to Google + Cloudflare so Atlas SRV lookups don't SERVFAIL on
// stale IPv6 link-local resolvers (a known Node-on-macOS quirk).
// Only do this locally — on Vercel it can break Atlas SRV resolution.
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
    dns.setDefaultResultOrder?.("ipv4first");
  } catch (e) {
    // best-effort
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration for production
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://mini-linkedin-platform.vercel.app", // Add your Vercel URL here later
      /\.vercel\.app$/, // Allow all Vercel preview deployments
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Mini LinkedIn API is running!",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      users: "/api/users",
      posts: "/api/posts",
      upload: "/api/upload",
    },
  });
});

// MongoDB connection with better error handling.
// On serverless (Vercel) the same container is reused across invocations,
// so we cache the connection promise and reuse it instead of reconnecting.
let connPromise = null;
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connPromise) return connPromise;

  const mongoURI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/mini-linkedin";

  connPromise = mongoose
    .connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then((m) => {
      console.log("MongoDB connected successfully");
      return m.connection;
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error.message);
      connPromise = null; // allow a retry on the next request
      throw error;
    });

  return connPromise;
};

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected. Attempting to reconnect...");
  if (process.env.NODE_ENV === "production") {
    connectDB();
  }
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Ensure the DB is connected before handling API requests (serverless-safe).
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503).json({
      message: "Database unavailable",
      error: error.message,
    });
  }
});

// Routes with better error handling and debugging
try {
  console.log("Loading route files...");

  // Load users router
  console.log("Loading users router...");
  const usersRouter = require("./routes/users");
  console.log("Users router loaded successfully");

  // Load posts router
  console.log("Loading posts router...");
  const postsRouter = require("./routes/posts");
  console.log("Posts router loaded successfully");

  // Load upload router
  console.log("Loading upload router...");
  const uploadRouter = require("./routes/upload");
  console.log("Upload router loaded successfully");

  // Register routes
  console.log("Registering routes...");
  app.use("/api/users", usersRouter);
  console.log("Users routes registered at /api/users");

  app.use("/api/posts", postsRouter);
  console.log("Posts routes registered at /api/posts");

  app.use("/api/upload", uploadRouter);
  console.log("Upload routes registered at /api/upload");

  console.log("All routes loaded and registered successfully");

  // List all registered routes for debugging
  console.log("Registered routes:");
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(
        `  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`
      );
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(
            `  ${Object.keys(handler.route.methods)} ${middleware.regexp.source
              .replace("\\", "")
              .replace("?", "")}${handler.route.path}`
          );
        }
      });
    }
  });
} catch (error) {
  console.error("Error loading routes:", error);
  console.error("Stack trace:", error.stack);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "production" ? {} : err.stack,
  });
});

// 404 handler
app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  try {
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
} catch (error) {
  console.error("Error closing MongoDB connection:", error);
  process.exit(1);
}
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  try {
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
} catch (error) {
  console.error("Error closing MongoDB connection:", error);
  process.exit(1);
}
});

// Start a long-running server only when NOT on Vercel.
// On Vercel the exported `app` is wrapped as a serverless function instead,
// and the DB connects lazily via the /api middleware above.
if (!process.env.VERCEL) {
  connectDB().catch((e) => console.error("Initial DB connect failed:", e.message));
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Health check available at: http://localhost:${PORT}/health`);
  });

  // Handle server errors
  server.on("error", (error) => {
    console.error("Server error:", error);
  });
}

module.exports = app;
