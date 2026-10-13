// Get session token from localStorage if present
export function getStoredSessionToken(): string | null {
  return localStorage.getItem('tgmail_session_token');
}

export function setStoredSessionToken(token: string): void {
  localStorage.setItem('tgmail_session_token', token);
}

export function clearStoredSessionToken(): void {
  localStorage.removeItem('tgmail_session_token');
}

/**
 * Universal fetch wrapper that attaches x-session-token header
 * and sends credentials (cookies).
 */
export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredSessionToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('x-session-token', token);
  }
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await response.json().catch(() => ({}));

  if (data.sessionToken) {
    setStoredSessionToken(data.sessionToken);
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
}

export function playNotificationSound(): void {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch {
    // AudioContext blocked by browser policy
  }
}
