// ─── Core API Types ──────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';
export type MemberTier = 'BASIC' | 'SILVER' | 'GOLD';
export type VoucherType = 'PERCENTAGE' | 'FIXED';
export type StockReason = 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'DAMAGE' | 'RETURN';
export type OrderStatus = 'OPEN' | 'PAID' | 'VOIDED' | 'QUOTATION' | 'INVOICE';
export type TaxStatus = 'FREE' | 'PPH_FINAL' | 'PKP';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  email?: string | null;
  username?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  logo_url: string | null;
  footer: string;
}

export interface TaxConfig {
  tax_status: TaxStatus;
  pph_rate: number;
  ppn_rate: number;
  pb1_rate: number;
  service_charge_rate: number;
  apply_ppn_to_sales: boolean;
  apply_pb1_to_sales: boolean;
  npwp?: string | null;
}

export interface PrinterConfig {
  connection: 'USB' | 'BT' | 'IP';
  paper_width: 58 | 80;
  ip_address: string | null;
  bt_device_id: string | null;
  show_qr?: boolean;
}

export interface Settings {
  id: string;
  store_info: StoreInfo;
  tax_config: TaxConfig;
  printer_config: PrinterConfig;
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  subcategories?: Category[];
}

export interface Variant {
  id: string;
  product_id: string;
  name: string | null;
  sku: string;
  barcode: string | null;
  /** Comes as string from Prisma Decimal — always parseFloat() before math */
  price: string;
  stock: number;
  has_open_price: boolean;

  stock_batches?: StockBatch[];
}

export interface StockBatch {
  id: string;
  variant_id: string;
  initial_qty: number;
  remaining_qty: number;
  base_price: string | number; // Decimal comes from Prisma as a string
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  category: Category;
  variants: Variant[];
}

export interface BulkProductRow {
  category_name: string;
  product_name: string;
  variant_name: string;
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  base_price: number;
  has_open_price: boolean;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface CartItem {
  variant_id: string;
  quantity: number;
  discount: number;
  price?: number; // Only for open-price variants
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  ref_no?: string;
}

export interface CreateTransactionPayload {
  items: CartItem[];
  payments: PaymentInput[];
  member_id?: string;
  voucher_code?: string;
  status?: OrderStatus;
  table_id?: string;
  shift_id?: string;
  created_at?: string; // ISO8601, for offline backdating
}

export interface TransactionItem {
  id: string;
  variant_id: string;
  qty: number;
  price: string;
  discount: string;
  variant: Variant & { product: Pick<Product, 'id' | 'name'> };
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: string;
  ref_no: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  member_id: string | null;
  voucher_id: string | null;
  shift_id: string | null;
  status: OrderStatus;
  table_id: string | null;
  subtotal: string;
  discount_total: string;
  tax_amount: string;
  service_charge_amount: string;
  total: string;
  created_at: string;
  user: { name: string; role?: Role };
  member: { name: string; phone: string } | null;
  voucher: { code: string; type: VoucherType; value: string } | null;
  items: TransactionItem[];
  payments: Payment[];
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  receipt_string: string;
  change: number;
}

// ─── Members ─────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  phone: string;
  name: string;
  points: number;
  tier: MemberTier;
  created_at: string;
}

// ─── Vouchers ────────────────────────────────────────────────────────────────

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: string;
  max_uses: number;
  used_count: number;
  exp: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface ReportSummary {
  period: { from: string; to: string };
  summary: {
    revenue: number;
    subtotal: number;
    discount_total: number;
    tax_collected: number;
    service_charge_collected: number;
    transaction_count: number;
    cogs_total: number;
    gross_profit: number;
  };
  payment_breakdown: Array<{ method: string; _sum: { amount: string }; _count: { id: number } }>;
  top_items: Array<{ variant_id: string; sku?: string; product_name?: string; variant_name?: string | null; qty_sold: number; transactions: number }>;
  hourly_breakdown: Array<{ hour: number; count: number; revenue: number }>;
}

export interface MonthlyReport {
  period: { year: number; month: number; from: string; to: string };
  store: StoreInfo;
  tax: {
    config: TaxConfig;
    ytd_revenue: number;
    ytd_remaining_exemption: number;
    ytd_progress_pct: number;
    monthly_tax_liability: number;
    tax_explanation: string;
    ppn_collected: number;
  };
  summary: {
    revenue: number;
    subtotal: number;
    discount_total: number;
    tax_collected: number;
    service_charge_collected: number;
    transaction_count: number;
    cogs_total: number;
    gross_profit: number;
    expenses_total: number;
    net_profit: number;
  };
  daily_breakdown: Array<{ day: string; revenue: number; count: number }>;
  payment_breakdown: Array<{ method: string; _sum: { amount: string }; _count: { id: number } }>;
  inventory_valuation: Array<{
    sku: string;
    product_name: string;
    qty: number;
    base_price: number;
    valuation: number;
  }>;
  transaction_history: Array<{
    date: string;
    product_name: string;
    type: 'B' | 'S';
    qty: number;
    price: number;
    buy_value: number;
    sell_value: number;
    tax: number;
  }>;
}

// ─── Low Stock ────────────────────────────────────────────────────────────────

export interface LowStockItem {
  variant_id: string;
  product_name: string;
  category: string;
  sku: string;
  variant_name: string | null;
  current_stock: number;
  price: string;
}

export interface LowStockResponse {
  alert_threshold: number;
  total_alerts: number;
  items: LowStockItem[];
}

export interface EStatementEntry {
  date: string;
  type: 'SALE' | 'RESTOCK' | 'EXPENSE';
  ref_id: string;
  description: string;
  debit: number;
  credit: number;
  profit: number | null;
}

export interface EStatementReport {
  period: { from: string; to: string };
  ledger: EStatementEntry[];
  summary: {
    total_sales_revenue: number;
    total_cogs: number;
    gross_profit: number;
    total_purchases_spent: number;
    total_expenses: number;
    total_tax_collected: number;
    net_income: number;
    current_inventory_valuation: number;
  };
}

// ─── Shifts ──────────────────────────────────────────────────────────────────

export interface CashShift {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  starting_cash: string;
  expected_cash: string;
  actual_cash: string;
  difference: string;
  status: 'OPEN' | 'CLOSED';
  user?: { name: string; role?: string };
  _count?: { transactions: number };
}

export interface ShiftCloseResult extends CashShift {
  cash_from_sales: number;
  reconciliation: {
    starting_cash: number;
    cash_from_sales: number;
    expected_cash: number;
    actual_cash: number;
    difference: number;
    status: 'BALANCED' | 'OVERAGE' | 'SHORTAGE';
  };
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  store_id: string;
  user_id: string;
  amount: string;
  category: string;
  description: string | null;
  receipt_url: string | null;
  created_at: string;
  user?: { name: string };
}

export interface ExpenseSummary {
  period: { from: string; to: string };
  total: number;
  count: number;
  by_category: Array<{ category: string; total: number; count: number }>;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

// ─── Pagination wrapper ──────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Offline Queue ───────────────────────────────────────────────────────────

export interface OfflineQueueItem {
  id: string;
  payload: CreateTransactionPayload;
  synced_at: string | null;
  error: string | null;
  created_at: string;
}