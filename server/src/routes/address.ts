import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.js';
import { config } from '../config.js';
import {
  generateRandomLocalPart,
  generateSessionToken
} from '../utils/addressGenerator.js';
import { AddressRecord, AddressResponse } from '../types/index.js';
import { sseManager } from '../services/sse.js';
import { fetchAvailableDomain, createRealLiveMailAccount } from '../services/mailNetwork.js';

export const addressRouter = Router();

/**
 * Helper to obtain or set session token via cookie or x-session-token header
 */
export function getOrCreateSessionToken(req: Request, res: Response): string {
  let token = (req.cookies && req.cookies[config.cookieName]) ||
    (req.headers['x-session-token'] as string);

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    token = generateSessionToken();
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.addressTtlSeconds * 1000 * 2 // cookie outlives session slightly
    });
  }
  return token;
}

function formatAddressResponse(record: AddressRecord): AddressResponse {
  const now = Date.now();
  const timeLeftSeconds = Math.max(0, Math.floor((record.expiresAt - now) / 1000));
  const domain = record.address.split('@')[1] || config.domain;
  return {
    address: record.address,
    localPart: record.localPart,
    domain,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    timeLeftSeconds,
    isExpired: timeLeftSeconds <= 0,
    extensionsCount: record.extensionsCount,
    maxExtensions: config.maxExtensions
  };
}

/**
 * POST /api/address
 * Create or retrieve current active address for the session
 */
addressRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    let record = await storage.getAddress(sessionToken);

    if (!record) {
      const activeDomain = await fetchAvailableDomain();
      let localPart = generateRandomLocalPart();
      let email = `${localPart}@${activeDomain}`;

      const now = Date.now();
      record = {
        id: sessionToken,
        address: email,
        localPart,
        createdAt: now,
        expiresAt: now + config.addressTtlSeconds * 1000,
        extensionsCount: 0
      };

      await storage.saveAddress(record);
      createRealLiveMailAccount(email).catch(console.error);
    }

    res.json({
      success: true,
      sessionToken,
      data: formatAddressResponse(record)
    });
  } catch (error) {
    console.error('Error creating address:', error);
    res.status(500).json({ error: 'Failed to create or retrieve address' });
  }
});

/**
 * GET /api/address
 * Check status, active email, countdown timer
 */
addressRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const record = await storage.getAddress(sessionToken);

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'No active address found for this session',
        sessionToken
      });
      return;
    }

    res.json({
      success: true,
      sessionToken,
      data: formatAddressResponse(record)
    });
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/address
 * Deletes current address and cascades all messages
 */
addressRouter.delete('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const existing = await storage.getAddress(sessionToken);

    if (existing) {
      sseManager.broadcastAddressExpired(existing.address);
      await storage.deleteAddress(sessionToken);
    }

    res.json({
      success: true,
      message: 'Address and all associated messages deleted'
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

/**
 * POST /api/address/change
 * Deletes old address and generates a fresh one immediately
 */
addressRouter.post('/change', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const existing = await storage.getAddress(sessionToken);

    if (existing) {
      sseManager.broadcastAddressExpired(existing.address);
      await storage.deleteAddress(sessionToken);
    }

    // Generate fresh
    const activeDomain = await fetchAvailableDomain();
    const localPart = generateRandomLocalPart();
    const email = `${localPart}@${activeDomain}`;
    const now = Date.now();

    const newRecord: AddressRecord = {
      id: sessionToken,
      address: email,
      localPart,
      createdAt: now,
      expiresAt: now + config.addressTtlSeconds * 1000,
      extensionsCount: 0
    };

    await storage.saveAddress(newRecord);
    createRealLiveMailAccount(email).catch(console.error);

    res.json({
      success: true,
      sessionToken,
      data: formatAddressResponse(newRecord)
    });
  } catch (error) {
    console.error('Error changing address:', error);
    res.status(500).json({ error: 'Failed to change address' });
  }
});

/**
 * POST /api/address/extend
 * Adds 10 minutes to expiration (max 2 times)
 */
addressRouter.post('/extend', async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = getOrCreateSessionToken(req, res);
    const record = await storage.extendAddress(sessionToken);

    if (!record) {
      res.status(400).json({
        success: false,
        error: 'Cannot extend: limit reached (maximum 2 extensions) or address expired'
      });
      return;
    }

    res.json({
      success: true,
      data: formatAddressResponse(record)
    });
  } catch (error) {
    console.error('Error extending address:', error);
    res.status(500).json({ error: 'Failed to extend address' });
  }
});
