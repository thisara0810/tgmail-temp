export interface AddressRecord {
  id: string; // token / session id
  address: string; // e.g. jaiswndklas342@tgmail.com
  localPart: string; // jaiswndklas342
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  extensionsCount: number; // max 2 extensions allowed
}

export interface AttachmentRecord {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentBase64?: string; // base64 encoded data for in-memory / sqlite
  filePath?: string; // path if saved to disk
}

export interface MessageRecord {
  id: string;
  address: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  sanitizedHtml: string;
  preview: string;
  headers: Record<string, string | string[]>;
  attachments: AttachmentRecord[];
  detectedCode?: string | null;
  detectedLinks: string[];
  createdAt: number;
}

export interface AddressResponse {
  address: string;
  localPart: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
  timeLeftSeconds: number;
  isExpired: boolean;
  extensionsCount: number;
  maxExtensions: number;
}
