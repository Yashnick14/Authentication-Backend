import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth/AuthRoute.js";

// Convert ES module URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") }); // points to root

connectDB();

const app = express();

console.log(
  "Loaded OTP secret from env:",
  process.env.OTP_SECRET_KEY ? "Yes" : "No"
);

// middleware
app.use(express.json());

//cors configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server requests (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked for origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Default Route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// API Routes
app.use("/api/auth", authRoutes);

// Start Server
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}`);
});
