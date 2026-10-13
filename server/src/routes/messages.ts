import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.js';
import { getOrCreateSessionToken } from './address.js';

export const messagesRouter = Router();

/**
 * GET /api/messages
 * Retrieves all messages for current address (newest first)
 */
messagesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const addressRecord = await storage.getAddress(sessionToken);

    if (!addressRecord) {
      res.json({ success: true, data: [] });
      return;
    }

    const messages = await storage.getMessages(addressRecord.address);

    // Return message summaries (omitting large html/raw data for fast listing)
    const summaries = messages.map((m) => ({
      id: m.id,
      address: m.address,
      from: m.from,
      to: m.to,
      subject: m.subject,
      preview: m.preview,
      detectedCode: m.detectedCode,
      hasAttachments: m.attachments.length > 0,
      attachmentsCount: m.attachments.length,
      createdAt: m.createdAt
    }));

    res.json({
      success: true,
      data: summaries
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

/**
 * GET /api/messages/:id
 * Retrieves full message details: HTML, plain-text, headers, attachments
 */
messagesRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const addressRecord = await storage.getAddress(sessionToken);

    if (!addressRecord) {
      res.status(403).json({ error: 'Unauthorized or expired session' });
      return;
    }

    const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const message = await storage.getMessageById(msgId);
    if (!message || message.address.toLowerCase() !== addressRecord.address.toLowerCase()) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message details:', error);
    res.status(500).json({ error: 'Failed to retrieve message details' });
  }
});

/**
 * DELETE /api/messages/:id
 * Permanently deletes a single message
 */
messagesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const addressRecord = await storage.getAddress(sessionToken);

    if (!addressRecord) {
      res.status(403).json({ error: 'Unauthorized or expired session' });
      return;
    }

    const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await storage.deleteMessage(msgId, addressRecord.address);
    if (!deleted) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Message permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * GET /api/messages/:id/attachments/:attId
 * Attachment download endpoint
 */
messagesRouter.get('/:id/attachments/:attId', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const addressRecord = await storage.getAddress(sessionToken);

    if (!addressRecord) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const attId = Array.isArray(req.params.attId) ? req.params.attId[0] : req.params.attId;
    const message = await storage.getMessageById(msgId);
    if (!message || message.address.toLowerCase() !== addressRecord.address.toLowerCase()) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const att = message.attachments.find((a) => a.id === attId);
    if (!att || !att.contentBase64) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const buffer = Buffer.from(att.contentBase64, 'base64');
    res.setHeader('Content-Type', att.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error serving attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});
