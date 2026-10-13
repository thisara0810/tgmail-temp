import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header.js';
import { AddressBox } from './components/AddressBox.js';
import { MessageList } from './components/MessageList.js';
import { MessageViewer } from './components/MessageViewer.js';
import { InfoModal } from './components/InfoModal.js';
import { AddressData, MessageSummary, MessageDetail } from './types/index.js';
import { apiRequest, playNotificationSound } from './hooks/useApi.js';

export const App: React.FC = () => {
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Theme setup
  useEffect(() => {
    const isSavedDark = localStorage.getItem('theme') === 'dark';
    setIsDark(isSavedDark);
    if (isSavedDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDark = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Fetch or create address
  const fetchOrCreateAddress = useCallback(async () => {
    setLoading(true);
    try {
      // First try to fetch existing address
      let res = await apiRequest<{ success: boolean; data: AddressData }>('/api/address').catch(() => null);

      if (!res || !res.success || !res.data) {
        // Create new address
        res = await apiRequest<{ success: boolean; data: AddressData }>('/api/address', { method: 'POST' });
      }

      if (res && res.data) {
        setAddressData(res.data);
        setTimeLeft(res.data.timeLeftSeconds);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize address');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!addressData?.address) return;
    try {
      const res = await apiRequest<{ success: boolean; data: MessageSummary[] }>('/api/messages');
      if (res.success && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch {
      // ignore
    }
  }, [addressData?.address]);

  // Initial load
  useEffect(() => {
    fetchOrCreateAddress();
  }, [fetchOrCreateAddress]);

  // Real-time updates via Server-Sent Events with fallback polling
  useEffect(() => {
    if (!addressData?.address) return;

    // Load initial messages
    fetchMessages();

    // 1. Establish SSE Connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sse = new EventSource('/api/stream');
    eventSourceRef.current = sse;

    sse.addEventListener('new_message', (e) => {
      try {
        const newMsg: MessageDetail = JSON.parse(e.data);
        setMessages((prev) => [newMsg, ...prev.filter((m) => m.id !== newMsg.id)]);

        // Notify user
        if (notificationsEnabled) {
          playNotificationSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New Email from ${newMsg.from}`, {
              body: newMsg.subject || 'New message arrived',
              icon: '/logo.svg'
            });
          }
        }
        showToast(`New email received: ${newMsg.subject || 'No subject'}`);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    sse.addEventListener('address_expired', () => {
      setTimeLeft(0);
      setAddressData((prev) => (prev ? { ...prev, isExpired: true, timeLeftSeconds: 0 } : null));
      setMessages([]);
      setSelectedMessage(null);
      showToast('Address has expired and was removed');
    });

    // 2. Polling Fallback every 5 seconds (safety net)
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      sse.close();
      clearInterval(pollInterval);
    };
  }, [addressData?.address, notificationsEnabled, fetchMessages]);

  // Live countdown timer (tick every 1s)
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAddressData((old) => (old ? { ...old, isExpired: true, timeLeftSeconds: 0 } : null));
          setMessages([]);
          setSelectedMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Handlers
  const handleCopy = () => {
    if (!addressData?.address) return;
    navigator.clipboard.writeText(addressData.address);
    showToast('Copied address to clipboard!');
  };

  const handleChangeEmail = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: AddressData }>('/api/address/change', {
        method: 'POST'
      });
      if (res.success) {
        setAddressData(res.data);
        setTimeLeft(res.data.timeLeftSeconds);
        setMessages([]);
        setSelectedMessage(null);
        showToast('Generated fresh email address');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to change address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async () => {
    setLoading(true);
    try {
      await apiRequest('/api/address', { method: 'DELETE' });
      // Generate immediately new address per requirement
      const res = await apiRequest<{ success: boolean; data: AddressData }>('/api/address', { method: 'POST' });
      if (res.success) {
        setAddressData(res.data);
        setTimeLeft(res.data.timeLeftSeconds);
        setMessages([]);
        setSelectedMessage(null);
        showToast('Old address purged. Fresh address ready.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete address');
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: AddressData }>('/api/address/extend', {
        method: 'POST'
      });
      if (res.success) {
        setAddressData(res.data);
        setTimeLeft(res.data.timeLeftSeconds);
        showToast('Extended session by +10 minutes!');
      }
    } catch (err: any) {
      showToast(err.message || 'Cannot extend session');
    }
  };

  const handleSelectMessage = async (id: string) => {
    try {
      const res = await apiRequest<{ success: boolean; data: MessageDetail }>(`/api/messages/${id}`);
      if (res.success) {
        setSelectedMessage(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to open message');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await apiRequest(`/api/messages/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      showToast('Message deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete message');
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationsEnabled(true);
          playNotificationSound();
          showToast('Sound & alerts enabled');
        } else {
          showToast('Browser notification permission denied');
        }
      } else {
        setNotificationsEnabled(true);
        playNotificationSound();
        showToast('Sound chime enabled');
      }
    } else {
      setNotificationsEnabled(false);
      showToast('Notifications muted');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Header
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotifications}
        isDark={isDark}
        onToggleDark={toggleDark}
        onOpenInfo={() => setShowInfoModal(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Main Address Card */}
        <AddressBox
          addressData={addressData}
          loading={loading}
          timeLeft={timeLeft}
          onCopy={handleCopy}
          onChange={handleChangeEmail}
          onDelete={handleDeleteEmail}
          onRefresh={fetchMessages}
          onExtend={handleExtend}
          onGenerateNew={handleChangeEmail}
        />

        {/* Inbox Content Area: List or Viewer */}
        {selectedMessage ? (
          <MessageViewer
            message={selectedMessage}
            onBack={() => setSelectedMessage(null)}
            onDelete={handleDeleteMessage}
            onCopyText={(text) => {
              navigator.clipboard.writeText(text);
              showToast('Code copied to clipboard!');
            }}
          />
        ) : (
          <MessageList
            messages={messages}
            loading={loading}
            onSelectMessage={handleSelectMessage}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 TGMail Temp. Receive-only temporary mailbox for @tgmail.com.</p>
        <button
          onClick={() => setShowInfoModal(true)}
          className="mt-1 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Terms of Service & Abuse Policy
        </button>
      </footer>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Information Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  );
};

export default App;
