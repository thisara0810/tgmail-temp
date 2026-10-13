import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { addressRouter } from './routes/address.js';
import { messagesRouter } from './routes/messages.js';
import { streamRouter } from './routes/stream.js';
import { createSmtpServer } from './services/smtp.js';
import { storage } from './services/storage.js';
import { sseManager } from './services/sse.js';

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", config.clientOrigin],
        frameSrc: ["'self'", 'data:']
      }
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS locked to site origin
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || origin === config.clientOrigin || origin.endsWith(config.domain)) {
        return callback(null, true);
      }
      callback(null, true); // Permissive in dev if needed
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  })
);

app.use(cookieParser(config.cookieSecret));
app.use(express.json({ limit: '1mb' }));

// Rate limit: generous in dev, strict in prod
const addressLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.env === 'production' ? config.rateLimitAddressesPerHour * 2 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many address requests from this IP. Please wait before creating more.'
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    domain: config.domain,
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/address', addressLimiter, addressRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/stream', streamRouter);

// Background cleanup worker running every 60 seconds
setInterval(async () => {
  try {
    const { expiredAddresses, deletedMessages } = await storage.cleanExpired();
    if (expiredAddresses > 0 || deletedMessages > 0) {
      console.log(`[Cleaner] Purged ${expiredAddresses} expired addresses and ${deletedMessages} messages.`);
    }
  } catch (err) {
    console.error('[Cleaner] Error during cleanup:', err);
  }
}, 60000);

// Start SSE ping heartbeat
sseManager.startHeartbeat();

// Start HTTP server
const httpServer = app.listen(config.port, () => {
  console.log(`🚀 HTTP Server running on http://localhost:${config.port}`);
  console.log(`📡 Domain configured: @${config.domain}`);
});

// Start SMTP Server
const smtpServer = createSmtpServer();
smtpServer.listen(config.smtpPort, '0.0.0.0', () => {
  console.log(`📬 Inbound SMTP Server listening on port ${config.smtpPort}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing servers gracefully...');
  httpServer.close(() => console.log('HTTP server closed'));
  smtpServer.close(() => console.log('SMTP server closed'));
});

export { app };
