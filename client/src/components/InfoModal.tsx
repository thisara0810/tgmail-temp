import React from 'react';
import { X, ShieldCheck, Lock, AlertCircle, Trash2 } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              TGMail Temp — Privacy & Policy
            </h3>
            <p className="text-xs text-slate-500">Service Terms & Abuse Prevention</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Trash2 className="w-3.5 h-3.5 text-indigo-500" />
              Automatic 30-Minute Destruction
            </h4>
            <p>
              Addresses and all incoming messages, attachments, and metadata are automatically and permanently purged from server memory after 30 minutes. We maintain zero message logs.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              Receive-Only Architecture
            </h4>
            <p>
              TGMail Temp is strictly an inbound receiver for test accounts, OTP verification, and app signups. Sending or relaying emails is disabled to prevent spam and abuse.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
            <h4 className="font-semibold flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Acceptable Use Policy
            </h4>
            <p>
              This service is provided strictly for legitimate testing, privacy protection, and evaluation purposes. Any use involving unlawful activities, harassment, or unauthorized access is strictly prohibited.
            </p>
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
