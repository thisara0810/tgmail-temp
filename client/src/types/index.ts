export interface AddressData {
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

export interface MessageSummary {
  id: string;
  address: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  detectedCode?: string | null;
  hasAttachments: boolean;
  attachmentsCount: number;
  createdAt: number;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface MessageDetail {
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
  attachments: Attachment[];
  detectedCode?: string | null;
  detectedLinks: string[];
  createdAt: number;
}
