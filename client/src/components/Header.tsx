import React from 'react';
import { Mail, Shield, Bell, BellOff, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  notificationsEnabled,
  onToggleNotifications,
  isDark,
  onToggleDark,
  onOpenInfo
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                TGMail<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Temp</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Free 30-Minute Disposable Email
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Notification Button */}
          <button
            onClick={onToggleNotifications}
            aria-label="Toggle notifications"
            className={`p-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              notificationsEnabled
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={notificationsEnabled ? 'Notifications active' : 'Enable email chime & alerts'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <span className="text-xs font-medium hidden md:inline">
              {notificationsEnabled ? 'Alerts On' : 'Alerts Off'}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDark}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Privacy & Terms */}
          <button
            onClick={onOpenInfo}
            aria-label="Privacy & Terms"
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Privacy, Terms & Security"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
