import React from 'react';
import { Mail, Clock, Paperclip, ChevronRight, KeyRound } from 'lucide-react';
import { MessageSummary } from '../types/index.js';

interface MessageListProps {
  messages: MessageSummary[];
  loading: boolean;
  onSelectMessage: (id: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  onSelectMessage
}) => {
  if (loading && messages.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse flex items-center justify-between"
          >
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2"></div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/60">
            <Mail className="w-8 h-8 animate-bounce" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">
          Waiting for incoming emails...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
          Send a verification message or OTP to your temporary email. Incoming mail appears here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Inbox ({messages.length})
        </span>
        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Stream Active
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
        {messages.map((msg) => {
          const time = new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={msg.id}
              onClick={() => onSelectMessage(msg.id)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {msg.from}
                  </span>
                  {msg.hasAttachments && (
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      <Paperclip className="w-3 h-3" />
                      {msg.attachmentsCount}
                    </span>
                  )}
                  {msg.detectedCode && (
                    <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                      <KeyRound className="w-3 h-3" />
                      OTP: {msg.detectedCode}
                    </span>
                  )}
                </div>

                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate mb-1">
                  {msg.subject || '(No Subject)'}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {msg.preview}
                </div>
              </div>

              <div className="flex items-center gap-2 text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{time}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
