import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  smtpPort: parseInt(process.env.SMTP_PORT || '25', 10),
  domain: (process.env.DOMAIN || 'tgmail.com').toLowerCase(),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  env: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || '',
  // Address TTL in seconds (default 30 minutes = 1800s)
  addressTtlSeconds: parseInt(process.env.ADDRESS_TTL_SECONDS || '1800', 10),
  extensionSeconds: 600, // 10 minutes
  maxExtensions: 2,
  maxMessageSize: 10 * 1024 * 1024, // 10MB
  maxAttachmentSize: 5 * 1024 * 1024, // 5MB
  maxMessagesPerAddress: 50,
  rateLimitAddressesPerHour: 10,
  cookieSecret: process.env.COOKIE_SECRET || 'tgmail-secret-token-key-2026',
  cookieName: 'tgmail_session'
};
