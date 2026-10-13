import React, { useState } from 'react';
import {
  ArrowLeft,
  Trash2,
  Paperclip,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Eye,
  Download,
  KeyRound
} from 'lucide-react';
import { MessageDetail } from '../types/index.js';

interface MessageViewerProps {
  message: MessageDetail;
  onBack: () => void;
  onDelete: (id: string) => void;
  onCopyText: (text: string) => void;
}

export const MessageViewer: React.FC<MessageViewerProps> = ({
  message,
  onBack,
  onDelete,
  onCopyText
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'headers'>('html');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRemoteImages, setShowRemoteImages] = useState(false);

  const handleCopyCode = (code: string) => {
    onCopyText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Process HTML for sandboxed iframe
  const renderedHtml = React.useMemo(() => {
    let content = message.sanitizedHtml || message.html || '';
    if (showRemoteImages) {
      // Unblock original images
      content = content.replace(/data-original-src="([^"]+)"/g, 'src="$1"');
    }
    return content;
  }, [message, showRemoteImages]);

  const formattedDate = new Date(message.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Top action bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(message.id)}
            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete this message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verification Code / Link Alert Banners */}
      {(message.detectedCode || (message.detectedLinks && message.detectedLinks.length > 0)) && (
        <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 space-y-2">
          {message.detectedCode && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                    Detected Verification Code / OTP
                  </span>
                  <span className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-widest">
                    {message.detectedCode}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleCopyCode(message.detectedCode!)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          )}

          {message.detectedLinks && message.detectedLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                Action Links:
              </span>
              {message.detectedLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white dark:bg-slate-900 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 transition-colors truncate max-w-xs"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Open Verification Link</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Meta Information */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
          {message.subject || '(No Subject)'}
        </h2>
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">From: </span>
            <span className="font-mono">{message.from}</span>
          </div>
          <div>{formattedDate}</div>
        </div>
      </div>

      {/* Attachments Section if present */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mr-2">
            <Paperclip className="w-3.5 h-3.5" />
            Attachments ({message.attachments.length}):
          </div>
          {message.attachments.map((att) => (
            <a
              key={att.id}
              href={`/api/messages/${message.id}/attachments/${att.id}`}
              download={att.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>{att.filename}</span>
              <span className="text-[10px] text-slate-400">
                ({(att.size / 1024).toFixed(0)} KB)
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Format Selector Tabs */}
      <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('html')}
            className={`pb-2.5 px-1 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'html'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            HTML Preview
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`pb-2.5 px-1 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Plain Text
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`pb-2.5 px-1 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'headers'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Headers
          </button>
        </div>

        {activeTab === 'html' && (
          <div className="pb-2">
            {!showRemoteImages ? (
              <button
                onClick={() => setShowRemoteImages(true)}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                title="Remote images are blocked to protect privacy against tracking pixels"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Load remote images</span>
              </button>
            ) : (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Images loaded
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 min-h-[360px]">
        {activeTab === 'html' && (
          <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
            <iframe
              title="Email HTML Preview"
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:system-ui,-apple-system,sans-serif;margin:16px;color:#0f172a;line-height:1.5;}img{max-width:100%;height:auto;}</style></head><body>${renderedHtml}</body></html>`}
              sandbox="allow-same-origin allow-popups"
              className="w-full h-[500px] border-none"
            />
          </div>
        )}

        {activeTab === 'text' && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[500px]">
            {message.text || 'No plain text content.'}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed">
            {Object.entries(message.headers || {}).map(([key, val]) => (
              <div key={key} className="py-0.5 border-b border-slate-800/80">
                <span className="text-indigo-400 font-semibold">{key}: </span>
                <span className="text-slate-300 break-all">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
