import axios from 'axios';
import type {
  LoginResponse, AuthUser, Settings, Product, Variant, BulkProductRow,
  Paginated, Transaction, CreateTransactionPayload, CreateTransactionResponse,
  Member, Voucher, ReportSummary, MonthlyReport, LowStockResponse, User,
  Category, OfflineQueueItem, EStatementReport, CashShift, ShiftCloseResult,
  Expense, ExpenseSummary,
} from '../types';

// ─── Axios instance ───────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLoginReq = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginReq) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiFetch = (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then(async (res) => {
    const data = res.headers.get('content-type')?.includes('application/json')
      ? await res.json() : null;
    if (!res.ok) throw new Error(data?.error || 'API Request Failed');
    return data;
  });
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (body: { email?: string; password?: string; username?: string; pin?: string }) =>
    api.post<LoginResponse>('/auth/login', body).then(r => r.data),
  me: () => api.get<AuthUser>('/auth/me').then(r => r.data),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => api.get<Settings>('/settings').then(r => r.data),
  update: (body: Partial<Settings>) => api.patch<Settings>('/settings', body).then(r => r.data),
};

// ─── Products ────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: { q?: string; category_id?: string; page?: number; limit?: number }) =>
    api.get<Paginated<Product>>('/products', { params }).then(r => r.data),

  byBarcode: (code: string) =>
    api.get<Variant & { product: Product }>(`/products/barcode/${code}`).then(r => r.data),

  create: (body: { name: string; category_id: string; variants: unknown[] }) =>
    api.post<Product>('/products', body).then(r => r.data),

  update: (id: string, body: { name?: string; category_id?: string }) =>
    api.patch<Product>(`/products/${id}`, body).then(r => r.data),

  updatePrice: (variantId: string, price: number) =>
    api.patch<Variant>(`/products/variants/${variantId}/price`, { price }).then(r => r.data),

  updateStock: (variantId: string, body: { quantity: number; base_price?: number; reason?: string; note?: string }) =>
    api.patch<Variant>(`/products/variants/${variantId}/stock`, body).then(r => r.data),

  updateVariantMeta: (variantId: string, body: { name?: string | null; has_open_price?: boolean }) =>
    api.patch<Variant>(`/products/variants/${variantId}`, body).then(r => r.data),

  delete: (id: string) => api.delete(`/products/${id}`),

  bulkExport: () =>
    api.get<{ data: BulkProductRow[] }>('/products/bulk/export').then(r => r.data),

  bulkApply: (rows: BulkProductRow[]) =>
    api.post<{ success: boolean; processed: number; created: number; updated: number }>(
      '/products/bulk/apply', rows
    ).then(r => r.data),
};

// ─── Categories ──────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then(r => r.data),
  create: (body: { name: string; parent_id?: string }) =>
    api.post<Category>('/categories', body).then(r => r.data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transactionsApi = {
  create: (body: CreateTransactionPayload) =>
    api.post<CreateTransactionResponse>('/transactions', body).then(r => r.data),
  list: (params?: { page?: number; limit?: number; from?: string; to?: string; status?: string; shift_id?: string; }) =>
    api.get<Paginated<Transaction>>('/transactions', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`).then(r => r.data),
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const membersApi = {
  list: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get<Paginated<Member>>('/members', { params }).then(r => r.data),
  byPhone: (phone: string) =>
    api.get<Member>(`/members/${phone}`).then(r => r.data),
  create: (body: { name: string; phone: string }) =>
    api.post<Member>('/members', body).then(r => r.data),
  update: (id: string, body: { name?: string; phone?: string }) =>
    api.patch<Member>(`/members/${id}`, body).then(r => r.data),
};

// ─── Vouchers ────────────────────────────────────────────────────────────────

export const vouchersApi = {
  list: () => api.get<Voucher[]>('/vouchers').then(r => r.data),
  byCode: (code: string) =>
    api.get<Voucher>(`/vouchers/${code}`).then(r => r.data),
  create: (body: { code: string; type: string; value: number; max_uses?: number; exp_days?: number }) =>
    api.post<Voucher>('/vouchers', body).then(r => r.data),
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportsApi = {
  summary: (params: { from: string; to: string }) =>
    api.get<ReportSummary>('/reports/summary', { params }).then(r => r.data),
  monthly: (params: { year: number; month?: number }) =>
    api.get<MonthlyReport>('/reports/monthly', { params }).then(r => r.data),
  lowStock: (threshold = 10) =>
    api.get<LowStockResponse>('/reports/low-stock', { params: { threshold } }).then(r => r.data),
  priceLogs: (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/reports/price-logs', { params }).then(r => r.data),
  eStatement: (params: { from: string; to: string }) =>
    api.get<EStatementReport>('/reports/e-statement', { params }).then(r => r.data),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  stockHistory: (params?: {
    from?: string; to?: string; variant_id?: string;
    reason?: string; page?: number; limit?: number;
  }) => api.get('/inventory/stock-history', { params }).then(r => r.data),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => api.get<User[]>('/users').then(r => r.data),
  create: (body: Partial<User> & { password?: string; pin?: string }) =>
    api.post<User>('/users', body).then(r => r.data),
  update: (id: string, body: Partial<User> & { password?: string; pin?: string }) =>
    api.patch<User>(`/users/${id}`, body).then(r => r.data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ─── Offline Queue ───────────────────────────────────────────────────────────

export const offlineApi = {
  sync: (transactions: CreateTransactionPayload[]) =>
    api.post('/offline/sync', { transactions }).then(r => r.data),
  queue: () => api.get<OfflineQueueItem[]>('/offline/queue').then(r => r.data),
  retry: (id: string) => api.post(`/offline/queue/${id}/retry`).then(r => r.data),
  discard: (id: string) => api.delete(`/offline/queue/${id}`),
};

// ─── Shifts ──────────────────────────────────────────────────────────────────

export const shiftsApi = {
  open: (body: { starting_cash: number }) =>
    api.post<CashShift>('/shifts/open', body).then(r => r.data),
  close: (id: string, body: { actual_cash: number }) =>
    api.post<ShiftCloseResult>(`/shifts/${id}/close`, body).then(r => r.data),
  current: () =>
    api.get<{ shift: CashShift | null }>('/shifts/current').then(r => r.data),
  list: (params?: { from?: string; to?: string; status?: string; page?: number; limit?: number }) =>
    api.get<Paginated<CashShift>>('/shifts', { params }).then(r => r.data),
};

// ─── Expenses ────────────────────────────────────────────────────────────────

export const expensesApi = {
  create: (body: { amount: number; category: string; description?: string; receipt_url?: string }) =>
    api.post<Expense>('/expenses', body).then(r => r.data),
  list: (params?: { from?: string; to?: string; category?: string; page?: number; limit?: number }) =>
    api.get<Paginated<Expense>>('/expenses', { params }).then(r => r.data),
  summary: (params?: { from?: string; to?: string }) =>
    api.get<ExpenseSummary>('/expenses/summary', { params }).then(r => r.data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};