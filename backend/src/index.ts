import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import modelImportRoutes from './routes/modelImport.routes';
import exportRoutes from './routes/export.routes';
import licenseRoutes from './routes/license.routes';
import { validateAuthConfig } from './config/auth.config';

dotenv.config();

// Validate auth configuration in production
validateAuthConfig();

const app = express();

// Security middleware
app.use(helmet());

// CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.CORS_ORIGIN,
      process.env.FRONTEND_URL,
    ].filter(Boolean) // Remove undefined/null
  : [
      process.env.CORS_ORIGIN,
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      // Allow local network IPs in development only
      ...(process.env.ALLOW_LOCAL_NETWORK === 'true' ? ['local-network'] : []),
    ].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow local network IPs if enabled
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_LOCAL_NETWORK === 'true' &&
      (origin.startsWith('http://192.168.') ||
       origin.startsWith('http://10.') ||
       origin.startsWith('http://localhost'))
    ) {
      return callback(null, true);
    }

    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(morgan('combined'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Routes
// Apply stricter rate limiting to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/models', modelImportRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/license', licenseRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
});

export default app;
