import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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
app.use(cors({ 
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Routes
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
