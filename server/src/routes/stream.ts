import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.js';
import { sseManager } from '../services/sse.js';
import { getOrCreateSessionToken } from './address.js';

export const streamRouter = Router();

/**
 * GET /api/stream
 * Server-Sent Events endpoint for instant real-time inbox delivery
 */
streamRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = getOrCreateSessionToken(req, res);
  const addressRecord = await storage.getAddress(sessionToken);

  if (!addressRecord) {
    res.status(404).json({ error: 'Address session not found or expired' });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx from buffering SSE responses
  });

  sseManager.addClient(sessionToken, addressRecord.address, res);
});
