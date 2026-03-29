import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useOfflineTransactionStore } from '../../store/offlineTransactionStore';
import { useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, Receipt, PlusCircle, AlertTriangle, CloudOff } from 'lucide-react';
import { transactionsApi } from '../../lib/api';
import { saveOfflineTransaction } from '../../lib/db';
import styles from './PaymentModal.module.css';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
}

type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';

interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export default function PaymentModal({ total, onClose }: PaymentModalProps) {
  const [finalTotal] = useState(total);

  const [payments, setPayments] = useState<PaymentSplit[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('CASH');

  const totalPaidSoFar = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, finalTotal - totalPaidSoFar);

  const [currentAmount, setCurrentAmount] = useState<number>(remaining);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptString, setReceiptString] = useState<string | null>(null);
  const [successChange, setSuccessChange] = useState<number>(0);

  const { clearCart, voucher, items, memberInfo } = useCartStore();
  const { addTransaction } = useOfflineTransactionStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentAmount(remaining);
  }, [remaining]);

  const quickAmounts = [remaining];
  if (remaining < 50000 && remaining > 0) quickAmounts.push(50000);
  if (remaining < 100000 && remaining > 0) quickAmounts.push(100000);

  const totalProvided = totalPaidSoFar + currentAmount;
  const change = totalProvided - finalTotal;
  const isCompleteDisabled = totalProvided < finalTotal || isProcessing;

  const handleAddSplit = () => {
    if (currentAmount <= 0 || currentAmount > remaining) {
      setErrorMessage('Split amount must be valid and not exceed remaining balance.');
      return;
    }
    setPayments([...payments, { method: currentMethod, amount: currentAmount }]);
    setCurrentMethod('QRIS');
    setErrorMessage(null);
  };

  const handleComplete = async () => {
    if (!navigator.onLine && voucher) {
      setErrorMessage('Offline mode active: Vouchers cannot be used. Please remove the voucher to proceed.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    let finalPayments = [...payments];
    if (currentAmount > 0 && remaining > 0) {
      finalPayments.push({ method: currentMethod, amount: currentAmount });
    }

    const isRealMember = memberInfo && memberInfo.id !== '00000000-0000-0000-0000-000000000000';

    const payload = {
      items: items.map(i => {
        const payloadItem: { variant_id: string; quantity: number; discount: number; price?: number } = {
          variant_id: i.variant_id,
          quantity: i.quantity,
          discount: i.discount,
        };
        if (i.has_open_price) payloadItem.price = i.price;
        return payloadItem;
      }),
      payments: finalPayments.map(p => ({ method: p.method, amount: p.amount })),
      ...(isRealMember ? { member_id: memberInfo!.id } : {}),
      ...(voucher ? { voucher_code: voucher.code } : {}),
      created_at: new Date().toISOString(),
    };

    try {
      const result = await transactionsApi.create(payload);
      setIsProcessing(false);
      setIsSuccess(true);
      setIsOfflineSaved(false);
      setPayments(finalPayments);
      setReceiptString(result.receipt_string);
      setSuccessChange(result.change);
      toast.success('Transaksi berhasil!');
      clearCart();

      // ── Invalidate caches so stock counts + transaction list refresh instantly ──
      // Without this the cashier would see stale stock numbers until the next
      // automatic refetch cycle (30 s).
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
      queryClient.invalidateQueries({ queryKey: ['reports-low-stock'] });

    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = axiosError.response?.data?.error || axiosError.message || 'Unknown error';
      const isNetworkError = !navigator.onLine || msg.includes('Network Error') || msg.includes('failed to fetch');

      if (isNetworkError) {
        const localId = await saveOfflineTransaction(payload);

        // ── Push into the in-memory store so Reports/UI updates immediately ──────
        // No page refresh needed — the offline summary in ReportsPage reads this store.
        addTransaction({
          id: localId,
          created_at: Date.now(),
          payload,
        });

        const totalAmountPaid = finalPayments.reduce((s, p) => s + p.amount, 0);
        setSuccessChange(Math.max(0, totalAmountPaid - finalTotal));
        setIsProcessing(false);
        setIsSuccess(true);
        setIsOfflineSaved(true);
        setPayments(finalPayments);
        toast.success('Disimpan offline. Akan disinkronkan saat online kembali.');
        clearCart();
      } else {
        setIsProcessing(false);
        setErrorMessage('Transaksi gagal: ' + msg);
      }
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.overlay}>
        <div className={styles.successModal}>
          <CheckCircle size={64} className={styles.successIcon} />
          <h2>Payment Successful!</h2>

          {isOfflineSaved && (
            <div className={styles.offlineBanner}>
              <CloudOff size={18} />
              <span>Saved Offline. Will sync when connection returns.</span>
            </div>
          )}

          <div className={styles.receiptDetails}>
            <div className={styles.receiptRow}>
              <span>Grand Total:</span>
              <span>Rp {finalTotal.toLocaleString('id-ID')}</span>
            </div>
            <div className={styles.receiptDivider}></div>
            {payments.map((p, i) => (
              <div key={i} className={styles.receiptRowSplit}>
                <span>{p.method}:</span>
                <span>Rp {p.amount.toLocaleString('id-ID')}</span>
              </div>
            ))}
            <div className={styles.receiptRowChange}>
              <span>Change:</span>
              <span>Rp {successChange > 0 ? successChange.toLocaleString('id-ID') : '0'}</span>
            </div>
          </div>

          <div className={styles.successActions}>
            {receiptString && (
              <button
                className={styles.printBtn}
                onClick={() => {
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(`<pre style="font-family:monospace;font-size:12px;white-space:pre">${receiptString}</pre>`);
                    win.print();
                  }
                }}
              >
                <Receipt size={18} />
                Print Receipt
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              New Transaction
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Complete Payment</h2>
          <button className={styles.closeIconBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {errorMessage && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className={styles.totalDisplay}>
            <span className={styles.totalLabel}>Total Due</span>
            <span className={styles.totalAmount}>Rp {finalTotal.toLocaleString('id-ID')}</span>
          </div>

          {payments.length > 0 && (
            <div className={styles.splitList}>
              <h4 className={styles.splitTitle}>Payments Applied:</h4>
              {payments.map((p, i) => (
                <div key={i} className={styles.splitItem}>
                  <span>{p.method}</span>
                  <span>Rp {p.amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
              <div className={styles.splitRemaining}>
                <span>Remaining:</span>
                <span>Rp {remaining.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {remaining > 0 ? (
            <>
              <div className={styles.section}>
                <h3>Payment Method</h3>
                <div className={styles.methodSelector}>
                  {(['CASH', 'QRIS', 'TRANSFER'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      className={`${styles.methodBtn} ${currentMethod === m ? styles.methodBtnActive : ''}`}
                      onClick={() => {
                        setCurrentMethod(m);
                        if (m !== 'CASH') setCurrentAmount(remaining);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.splitHeader}>
                  <h3>Amount Paid (Rp)</h3>
                  {remaining === finalTotal && (
                    <button className={styles.addSplitBtn} onClick={handleAddSplit}>
                      <PlusCircle size={14} />
                      Split Payment
                    </button>
                  )}
                </div>

                <input
                  type="number"
                  className={styles.amountInput}
                  value={currentAmount || ''}
                  onChange={(e) => setCurrentAmount(Number(e.target.value))}
                  min={currentMethod === 'CASH' ? 0 : remaining}
                  disabled={currentMethod !== 'CASH'}
                />

                {currentMethod === 'CASH' && (
                  <div className={styles.quickAmounts}>
                    {quickAmounts.map((amt, idx) => (
                      <button
                        key={idx}
                        className={styles.quickAmtBtn}
                        onClick={() => setCurrentAmount(amt)}
                      >
                        {amt.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                )}

                {change >= 0 && currentAmount > 0 && payments.length === 0 && (
                  <div className={styles.changeDisplay}>
                    <span>Change:</span>
                    <span className={styles.changeAmount}>Rp {change.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.fullyPaidBanner}>
              <CheckCircle size={24} />
              <span>Balance Fully Covered</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isProcessing}>
            Cancel
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleComplete}
            disabled={isCompleteDisabled}
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}