import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// ─── Styles (inline — no extra CSS file needed) ───────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    padding: '1rem',
  } as React.CSSProperties,
  card: {
    background: 'rgba(30, 27, 75, 0.6)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '1.5rem',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  } as React.CSSProperties,
  logo: { textAlign: 'center' as const, marginBottom: '2rem' },
  title: {
    fontSize: '1.5rem', fontWeight: 700, color: '#e2e8f0',
    margin: 0, letterSpacing: '-0.025em',
  },
  subtitle: { fontSize: '0.875rem', color: '#94a3b8', margin: '0.25rem 0 0' },
  tabs: {
    display: 'flex',
    background: 'rgba(15,23,42,0.5)',
    borderRadius: '0.75rem',
    padding: '4px',
    marginBottom: '1.75rem',
    gap: '4px',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    flex: 1,
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    transition: 'all 0.2s',
    background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
    color: active ? '#fff' : '#94a3b8',
  } as React.CSSProperties),
  field: { marginBottom: '1rem' },
  label: {
    display: 'block', fontSize: '0.8125rem', color: '#94a3b8',
    marginBottom: '0.5rem', fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '0.625rem',
    color: '#e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  // PIN display — shows dots for entered digits, hint for remaining
  pinDisplay: {
    textAlign: 'center' as const,
    fontSize: '2rem',
    letterSpacing: '0.6rem',
    color: '#a5b4fc',
    minHeight: '3rem',
    marginBottom: '1.5rem',
    fontFamily: 'monospace',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.625rem',
    marginBottom: '1.25rem',
  } as React.CSSProperties,
  numKey: (special?: boolean) => ({
    padding: '1.1rem',
    borderRadius: '0.75rem',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    background: special ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15,23,42,0.6)',
    color: special ? '#a5b4fc' : '#e2e8f0',
    fontSize: '1.25rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties),
  btn: (loading?: boolean) => ({
    width: '100%',
    padding: '0.875rem',
    background: loading ? 'rgba(99, 102, 241, 0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: '0.75rem',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    marginTop: '0.5rem',
  } as React.CSSProperties),
  // Small progress indicator below pin display
  pinProgress: (_filled: number) => ({
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '1rem',
  } as React.CSSProperties),
};

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'pin' | 'email';

// FIX: PIN_LENGTH = 6 to match the database (bcrypt hashed 6-digit PIN)
const PIN_LENGTH = 6;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [tab, setTab] = useState<Tab>('pin');
  const [loading, setLoading] = useState(false);

  // PIN mode state
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  // Email mode state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = useCallback(async (loginPin?: string) => {
    const finalPin = loginPin ?? pin;

    // Validate before sending
    if (tab === 'pin') {
      if (!username.trim()) { toast.error('Masukkan username'); return; }
      if (finalPin.length < 4) { toast.error('PIN minimal 4 digit'); return; }
    }

    setLoading(true);
    try {
      const body = tab === 'pin'
        ? { username: username.trim(), pin: finalPin }
        : { email: email.trim(), password };

      const result = await authApi.login(body);
      setAuth(result.token, result.user);
      toast.success(`Selamat datang, ${result.user.name}!`);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal';
      // Extract axios error message if available
      const axiosMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      toast.error(axiosMsg || msg);
      if (tab === 'pin') setPin('');
    } finally {
      setLoading(false);
    }
  }, [tab, username, pin, email, password, setAuth, navigate]);

  const handleNumKey = (key: string) => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (key === '↵') {
      // Manual submit — allow submitting any length >= 4
      handleLogin();
      return;
    }
    if (pin.length >= PIN_LENGTH) return; // already full
    const next = pin + key;
    setPin(next);

    // FIX: Auto-submit only when PIN reaches exactly PIN_LENGTH (6) digits
    // Previous code submitted at 4, matching "min(4)" in old schema but not the actual 6-digit DB pin
    if (next.length === PIN_LENGTH) {
      handleLogin(next);
    }
  };

  const numKeys = ['1','2','3','4','5','6','7','8','9','⌫','0','↵'];

  // Render filled/empty dot indicators for PIN progress
  const renderPinDots = () => (
    <div style={S.pinProgress(pin.length)}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: i < pin.length ? '#a5b4fc' : 'rgba(165,180,252,0.2)',
            border: '1px solid rgba(165,180,252,0.4)',
            transition: 'background 0.15s',
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <h1 style={S.title}>🏪 POS Kasir</h1>
          <p style={S.subtitle}>Masuk untuk melanjutkan</p>
        </div>

        <div style={S.tabs}>
          <button style={S.tab(tab === 'pin')} onClick={() => { setTab('pin'); setPin(''); }}>
            🔢 Kasir (PIN)
          </button>
          <button style={S.tab(tab === 'email')} onClick={() => setTab('email')}>
            📧 Admin / Manager
          </button>
        </div>

        {tab === 'pin' && (
          <>
            <div style={S.field}>
              <label style={S.label}>Username Kasir</label>
              <input
                style={S.input}
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)')}
              />
            </div>

            {/* PIN dot progress — shows 6 slots to hint at correct length */}
            {renderPinDots()}

            <div style={S.pinDisplay}>
              {pin.length > 0
                ? '●'.repeat(pin.length)
                : <span style={{ color: '#475569', fontSize: '0.9rem' }}>Masukkan PIN 6 digit</span>}
            </div>

            <div style={S.grid}>
              {numKeys.map((key) => (
                <button
                  key={key}
                  style={S.numKey(key === '⌫' || key === '↵')}
                  onClick={() => handleNumKey(key)}
                  disabled={loading}
                >
                  {key}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'email' && (
          <>
            <div style={S.field}>
              <label style={S.label}>Email</label>
              <input
                style={S.input}
                type="email"
                placeholder="admin@toko.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)')}
              />
            </div>
            <div style={S.field}>
              <label style={S.label}>Password</label>
              <input
                style={S.input}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)')}
              />
            </div>
            <button style={S.btn(loading)} onClick={() => handleLogin()} disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}