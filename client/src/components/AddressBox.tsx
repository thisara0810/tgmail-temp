import React, { useState } from 'react';
import { Copy, RefreshCw, Trash2, Clock, Check, Plus, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AddressData } from '../types/index.js';

interface AddressBoxProps {
  addressData: AddressData | null;
  loading: boolean;
  timeLeft: number; // in seconds
  onCopy: () => void;
  onChange: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onExtend: () => void;
  onGenerateNew: () => void;
}

export const AddressBox: React.FC<AddressBoxProps> = ({
  addressData,
  loading,
  timeLeft,
  onCopy,
  onChange,
  onDelete,
  onRefresh,
  onExtend,
  onGenerateNew
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleCopy = () => {
    if (!addressData?.address) return;
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = 1800; // 30 minutes base
  const percentage = Math.min(100, Math.max(0, (timeLeft / totalSeconds) * 100));

  const isExpired = addressData ? addressData.isExpired || timeLeft <= 0 : false;
  const canExtend = addressData && addressData.extensionsCount < addressData.maxExtensions && !isExpired;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 relative overflow-hidden transition-all">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Expired State Overlay / View */}
      {isExpired ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">This Address Has Expired</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Your 30-minute temporary session has ended. All messages and attachments have been permanently erased from the server.
            </p>
          </div>
          <button
            onClick={onGenerateNew}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Generate New Email
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Top Row: Address input box & Copy button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Your Temporary Email Address
              </label>

              {/* Live Countdown Badge */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold transition-colors ${
                    timeLeft < 300
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse'
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formattedTime}</span>
                </div>

                {canExtend && (
                  <button
                    onClick={onExtend}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title={`Extend by 10 minutes (${addressData.maxExtensions - addressData.extensionsCount} extensions remaining)`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>+10m</span>
                  </button>
                )}
              </div>
            </div>

            {/* Address Display Box */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={addressData?.address || (loading ? 'Generating fresh address...' : '')}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-mono text-base font-medium select-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Primary Copy Button */}
              <button
                onClick={handleCopy}
                disabled={!addressData}
                className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress countdown bar */}
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft < 300 ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Action Toolbar: Refresh, Change, Delete */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              {/* Refresh button */}
              <button
                onClick={onRefresh}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {/* Change email button */}
              <button
                onClick={onChange}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>
            </div>

            {/* Permanent Delete Button with Confirmation State */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-3 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium text-xs flex items-center gap-1.5 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Email</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 ml-auto bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Permanently delete?</span>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    onDelete();
                  }}
                  className="px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
