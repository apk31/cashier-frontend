import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, LockKeyhole, Play, LogOut } from 'lucide-react';
import { shiftsApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface ShiftModalProps {
  onSuccess: () => void;
  isAdmin: boolean;
}

export default function ShiftModal({ onSuccess, isAdmin }: ShiftModalProps) {
  const [startingCash, setStartingCash] = useState('');
  const queryClient = useQueryClient();
  const logout = useAuthStore(state => state.clearAuth);

  const openShiftMutation = useMutation({
    mutationFn: (amount: number) => shiftsApi.open({ starting_cash: amount }),
    onSuccess: () => {
      toast.success('Shift started successfully');
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start shift');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startingCash) return;
    openShiftMutation.mutate(Number(startingCash));
  };

  const handleBypass = () => {
    toast('Audit Mode Active (Bypassed Cashup)', { icon: '🛡️' });
    onSuccess();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-app)', padding: '2.5rem', borderRadius: 'var(--radius-xl)',
        maxWidth: '440px', width: '90%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary-light)',
          color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <LockKeyhole size={32} />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: 'var(--text-main)' }}>Open Register (Cashup)</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          Enter the physical cash amount currently in the drawer to begin processing transactions.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)' }}>Rp</span>
            <input
              type="number"
              min="0"
              required
              placeholder="0"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              style={{
                width: '100%', padding: '1rem 1rem 1rem 3rem', fontSize: '1.25rem', fontWeight: 700,
                borderRadius: 'var(--radius-md)', border: '2px solid var(--border-color)', outline: 'none',
                background: 'var(--bg-surface)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={openShiftMutation.isPending || !startingCash}
            style={{
              background: 'var(--color-primary)', color: 'white', padding: '1rem', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: '1.125rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Play size={20} />
            Start Shift
          </button>
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={logout}
            style={{
              background: 'transparent', color: 'var(--color-danger)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%',
              padding: '0.5rem', fontWeight: 600
            }}
          >
            <LogOut size={16} /> Logout System
          </button>
        </div>

        {isAdmin && (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              <AlertCircle size={14} /> Only visible to Admins
            </div>
            <button
              onClick={handleBypass}
              style={{
                background: 'transparent', color: 'var(--text-muted)', textDecoration: 'underline', border: 'none', cursor: 'pointer'
              }}
            >
              Bypass Cashup (Audit Mode)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
