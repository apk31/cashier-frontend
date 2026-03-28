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
  logo: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: 0,
    letterSpacing: '-0.025em',
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
  label: { display: 'block', fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500 },
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
  pinDisplay: {
    textAlign: 'center' as const,
    fontSize: '2.5rem',
    letterSpacing: '0.5rem',
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
};

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'pin' | 'email';

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
    setLoading(true);
    try {
      const body = tab === 'pin'
        ? { username, pin: loginPin ?? pin }
        : { email, password };

      const result = await authApi.login(body);
      setAuth(result.token, result.user);
      toast.success(`Selamat datang, ${result.user.name}!`);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal';
      toast.error(msg);
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
    const next = pin + key;
    setPin(next);
    // Auto-submit after 4+ digits
    if (next.length >= 4) {
      handleLogin(next);
    }
  };

  const numKeys = ['1','2','3','4','5','6','7','8','9','⌫','0','↵'];

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <h1 style={S.title}>🏪 POS Kasir</h1>
          <p style={S.subtitle}>Masuk untuk melanjutkan</p>
        </div>

        <div style={S.tabs}>
          <button style={S.tab(tab === 'pin')} onClick={() => setTab('pin')}>
            🔢 Kasir (PIN)
          </button>
          <button style={S.tab(tab === 'email')} onClick={() => setTab('email')}>
            📧 Admin
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
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
              />
            </div>

            <div style={S.pinDisplay}>
              {pin.length > 0 ? '●'.repeat(pin.length) : <span style={{ color: '#475569', fontSize: '1rem' }}>Masukkan PIN</span>}
            </div>

            <div style={S.grid}>
              {numKeys.map((key) => (
                <button
                  key={key}
                  style={S.numKey(key === '⌫' || key === '↵')}
                  onClick={() => key === '↵' ? handleLogin() : handleNumKey(key)}
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
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
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
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
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
