import { useCartStore } from '../../store/cartStore';
import { Trash2, Plus, Minus, CreditCard, XCircle, Tag, User } from 'lucide-react';
import styles from './CartBox.module.css';
import { useState, useEffect } from 'react';
import { membersApi, vouchersApi } from '../../lib/api';
import PaymentModal from './PaymentModal';
import toast from 'react-hot-toast';

export default function CartBox() {
  const {
    items, removeItem, updateQuantity, clearCart,
    getSubtotal, getGrandTotal, getVoucherDiscount,
    voucher, voucherError, removeVoucher,
    memberInfo, setMember
  } = useCartStore();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleApplyVoucher = async () => {
    if (!voucherInput || !isOnline) return;
    try {
      const voucherData = await vouchersApi.byCode(voucherInput.trim());
      if (new Date(voucherData.exp) < new Date()) {
        toast.error('Voucher sudah kadaluarsa');
        return;
      }
      if (voucherData.used_count >= voucherData.max_uses) {
        toast.error('Batas penggunaan voucher sudah habis');
        return;
      }
      useCartStore.getState().applyVoucherData({
        code: voucherData.code,
        type: voucherData.type,
        value: parseFloat(voucherData.value),
      });
      setVoucherInput('');
      toast.success(`Voucher ${voucherData.code} applied!`);
    } catch {
      toast.error('Kode voucher tidak valid');
    }
  };

  const handleApplyMember = async () => {
    if (!memberInput) return;

    // FIX: Don't set a fake offline member UUID.
    // Sending id '00000000-0000-...' to the server causes 400 "Member not found".
    // When offline, member lookup is simply not available.
    if (!isOnline) {
      toast.error('Member lookup tidak tersedia saat offline');
      return;
    }

    try {
      const member = await membersApi.byPhone(memberInput.trim());
      setMember({ id: member.id, phone: member.phone, name: member.name });
      setMemberInput('');
      toast.success(`Member: ${member.name} (${member.tier})`);
    } catch {
      toast.error('Nomor HP tidak terdaftar sebagai member');
    }
  };

  const subtotal = getSubtotal();
  const voucherDiscount = getVoucherDiscount();
  const grandTotal = getGrandTotal();

  const pkpEnabled = false;
  const tax = pkpEnabled ? grandTotal * 0.11 : 0;
  const finalTotalToPay = grandTotal + tax;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Current Order</h2>
        <span className={styles.itemCount}>{items.length} items</span>
      </div>

      <div className={styles.itemList}>
        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyIcon}>🛒</div>
            <p>Your cart is empty</p>
            <span>Scan a barcode or select from the grid to add items.</span>
          </div>
        ) : (
          items.map(item => (
            <div key={item.cart_item_id} className={styles.cartItem}>
              <div className={styles.itemDetails}>
                <h4 className={styles.itemName}>{item.name}</h4>
                <div className={styles.itemPriceRow}>
                  <span className={styles.itemPrice}>Rp {item.price.toLocaleString('id-ID')}</span>
                  {item.discount > 0 && (
                    <span className={styles.itemDiscount}>-Rp {item.discount.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className={styles.itemActions}>
                <div className={styles.quantityControl}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.cart_item_id, Math.max(1, item.quantity - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <span className={styles.qtyValue}>{item.quantity}</span>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className={styles.itemTotal}>
                  Rp {((item.price * item.quantity) - item.discount).toLocaleString('id-ID')}
                </div>

                <button
                  className={styles.deleteBtn}
                  onClick={() => removeItem(item.cart_item_id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inputs Section */}
      <div className={styles.inputSection}>
        {/* Member Input */}
        <div className={styles.inputGroup}>
          <div className={styles.inputWrapper}>
            <User size={16} className={styles.inputIcon} />
            {memberInfo ? (
              <div className={styles.activePill}>
                <span>{memberInfo.name} ({memberInfo.phone})</span>
                <button onClick={() => setMember(undefined)}>
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder={isOnline ? 'Member Phone...' : 'Member lookup offline'}
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyMember()}
                  disabled={!isOnline}
                />
                <button className={styles.applyBtn} onClick={handleApplyMember} disabled={!isOnline}>Add</button>
              </>
            )}
          </div>
        </div>

        {/* Voucher Input */}
        <div className={styles.inputGroup}>
          <div className={`${styles.inputWrapper} ${!isOnline ? styles.inputWrapperDisabled : ''}`}>
            <Tag size={16} className={styles.inputIcon} />
            {voucher ? (
              <div className={styles.activePill}>
                <span>Voucher: {voucher.code}</span>
                <button onClick={removeVoucher}>
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder={isOnline ? 'Voucher Code...' : 'Vouchers disabled offline'}
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && isOnline && handleApplyVoucher()}
                  disabled={!isOnline}
                />
                <button
                  className={styles.applyBtn}
                  onClick={handleApplyVoucher}
                  disabled={!isOnline}
                >
                  Apply
                </button>
              </>
            )}
          </div>
          {voucherError && <span className={styles.errorText}>{voucherError}</span>}
        </div>
      </div>

      {/* Summary Section */}
      <div className={styles.summaryBox}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>Rp {subtotal.toLocaleString('id-ID')}</span>
        </div>

        {voucherDiscount > 0 && (
          <div className={`${styles.summaryRow} ${styles.discountRow}`}>
            <span>Discount ({voucher?.code})</span>
            <span>-Rp {voucherDiscount.toLocaleString('id-ID')}</span>
          </div>
        )}

        {pkpEnabled && (
          <div className={styles.summaryRow}>
            <span>PPN (11%)</span>
            <span>Rp {tax.toLocaleString('id-ID')}</span>
          </div>
        )}

        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
          <span>Total</span>
          <span className={styles.grandTotal}>Rp {finalTotalToPay.toLocaleString('id-ID')}</span>
        </div>

        <div className={styles.actionButtons}>
          <button
            className={styles.clearBtn}
            onClick={clearCart}
            disabled={items.length === 0}
          >
            <XCircle size={18} />
            Cancel
          </button>
          <button
            className={styles.payBtn}
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={items.length === 0}
          >
            <CreditCard size={18} />
            Charge Rp {finalTotalToPay.toLocaleString('id-ID')}
          </button>
        </div>
      </div>

      {isPaymentModalOpen && (
        <PaymentModal
          total={finalTotalToPay}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}
    </div>
  );
}