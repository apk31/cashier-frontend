import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { shiftsApi } from '../lib/api';
import ProductGrid from '../components/cashier/ProductGrid';
import CartBox from '../components/cashier/CartBox';
import ShiftModal from '../components/cashier/ShiftModal';
import CloseShiftModal from '../components/cashier/CloseShiftModal';
import styles from './CashierPage.module.css';
import toast from 'react-hot-toast';

export default function CashierPage() {
  const user = useAuthStore(s => s.user);
  const [bypassed, setBypassed] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  
  const { data, isLoading } = useQuery({
    queryKey: ['current-shift'],
    queryFn: () => shiftsApi.current().then(res => res.shift),
  });

  const shift = data;
  const requireShift = !shift && !bypassed;

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading shift data...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {shift && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)' }}></div>
            <span style={{ fontWeight: 600 }}>Shift Active: {user?.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>| Start Cash: Rp {parseFloat(shift.starting_cash).toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={() => setIsClosingShift(true)}
            style={{ background: 'var(--bg-surface-hover)', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-danger)' }}
          >
            <LogOut size={16} /> Cashup & Close
          </button>
        </div>
      )}

      {bypassed && !shift && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef3c7', color: '#92400e', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }}>
           <span style={{ fontWeight: 600 }}>Audit Mode Active (No Shift)</span>
           <button onClick={() => setBypassed(false)} style={{ background: 'transparent', border: 'none', color: '#92400e', textDecoration: 'underline', cursor: 'pointer' }}>Resume Start Shift</button>
        </div>
      )}

      <div className={styles.container}>
        <div className={styles.gridSection}>
          <ProductGrid />
        </div>
        <div className={styles.cartSection}>
          <CartBox shiftId={shift?.id} isBypassed={bypassed} />
        </div>
      </div>

      {requireShift && (
        <ShiftModal 
          onSuccess={() => setBypassed(true)} // fallback bypass state; if query success it gets real shift
          isAdmin={user?.role === 'ADMIN'}
        />
      )}

      {isClosingShift && shift && (
        <CloseShiftModal 
          shiftId={shift.id}
          onClose={() => setIsClosingShift(false)}
          onSuccess={(res: any) => {
            setIsClosingShift(false);
            toast.success(`Shift closed! Expected: Rp ${res.reconciliation.expected_cash.toLocaleString('id-ID')} | Actual: Rp ${res.reconciliation.actual_cash.toLocaleString('id-ID')} | Diff: ${res.reconciliation.difference}`);
          }}
        />
      )}
    </div>
  );
}
