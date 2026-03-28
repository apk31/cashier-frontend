import ProductGrid from '../components/cashier/ProductGrid';
import CartBox from '../components/cashier/CartBox';
import styles from './CashierPage.module.css';

export default function CashierPage() {
  return (
    <div className={styles.container}>
      <div className={styles.gridSection}>
        <ProductGrid />
      </div>
      <div className={styles.cartSection}>
        <CartBox />
      </div>
    </div>
  );
}
