import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import errorHandler from "./middleware/errorHandler.js";
import userRouter from "./routes/user.routes.js";
import cartRouter from "./routes/KomalKurtha/cart.routes.js";
import productRouter from "./routes/KomalKurtha/product.routes.js";

dotenv.config();

const app = express();

// Trust proxy to handle cookies when using HTTPS
app.set("trust proxy", 1);

// CORS configuration for allowing cross-origin requests with cookies
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // Frontend URL from env variable
    credentials: true, // Allow cookies/auth headers
    allowedHeaders: ["Content-Type", "Authorization"], // Explicitly allow headers
  })
);

// Rate Limiting Middleware
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 10 minutes
  max: 150, // Limit each IP to 300 requests per window
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", apiLimiter);

// Body parser middleware
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Cookie Parser middleware to parse cookies
app.use(cookieParser());

// User Routes
app.use("/api/v1/users", userRouter);

// Komal Kurtha Website Routes
app.use('/api/v1/komal/cart',cartRouter)
app.use('/api/v1/komal/product',productRouter)


// Error handling middleware
app.use(errorHandler);

export { app };
