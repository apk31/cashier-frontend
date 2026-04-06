import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Power, Wallet } from 'lucide-react';
import { shiftsApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface CloseShiftModalProps {
  shiftId: string;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function CloseShiftModal({ shiftId, onClose, onSuccess }: CloseShiftModalProps) {
  const [actualCash, setActualCash] = useState('');
  const queryClient = useQueryClient();

  const closeShiftMutation = useMutation({
    mutationFn: (amount: number) => shiftsApi.close(shiftId, { actual_cash: amount }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-history'] });
      onSuccess(data); // Pass data back to show reconciliation summary
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to close shift');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash) return;
    closeShiftMutation.mutate(Number(actualCash));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000
    }}>
      <div style={{
        background: 'var(--bg-app)', padding: '2rem', borderRadius: 'var(--radius-xl)',
        maxWidth: '440px', width: '90%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--color-danger)' }}>
          <Power size={28} />
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Close Cashier Shift</h2>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          Count the physical cash currently inside the cash drawer and enter the total below. 
          The system will verify this against the expected total (Starting Cash + Cash Sales).
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Actual Cash In Drawer
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-muted)' }}>Rp</span>
              <input
                type="number"
                min="0"
                required
                placeholder="0"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                style={{
                  width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', fontSize: '1.25rem', fontWeight: 700,
                  borderRadius: 'var(--radius-md)', border: '2px solid var(--border-color)', outline: 'none',
                  background: 'var(--bg-surface)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={closeShiftMutation.isPending}
              style={{
                background: 'var(--bg-surface-hover)', color: 'var(--text-main)', padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={closeShiftMutation.isPending || !actualCash}
              style={{
                background: 'var(--color-danger)', color: 'white', padding: '0.75rem 1.25rem', 
                borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <Wallet size={18} />
              Reconcile & Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
