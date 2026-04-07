import apiClient from './client';

export interface BusinessDay {
  id: number;
  openedAt: string;
  closedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
  opener: { id: number; fullName: string };
  closer: { id: number; fullName: string } | null;
}

export interface ZReportInvoice {
  id: number;
  invoiceNo: string;
  total: number;
  subtotal: number;
  totalDiscount: number;
  discountAmount: number;
  totalTax: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAmount: number;
  costOfGoods: number | null;
  grossProfit: number | null;
  channel: string | null;
  createdAt: string;
  customer: { name: string } | null;
}

export interface ZReportReturn {
  id: number;
  returnNo: string;
  totalRefund: number;
  createdAt: string;
  salesInvoice: { invoiceNo: string };
}

export interface ZReportExpense {
  id: number;
  expenseNo: string;
  amount: number;
  description: string | null;
  paymentMethod: string;
  expenseDate: string;
  category: { name: string; nameAr: string | null };
}

export interface ZReport {
  day: BusinessDay;
  sales: {
    count: number;
    subtotal: number;
    discounts: number;
    tax: number;
    total: number;
    paid: number;
    costOfGoods: number;
    grossProfit: number;
    paymentBreakdown: Record<string, number>;
    invoices: ZReportInvoice[];
  };
  returns: { count: number; total: number; items: ZReportReturn[] };
  expenses: {
    count: number;
    total: number;
    byCategory: Record<string, number>;
    items: ZReportExpense[];
  };
  summary: {
    totalIncome: number;
    totalReturns: number;
    totalExpenses: number;
    netCash: number;
  };
}

export const businessDayApi = {
  getCurrent: () =>
    apiClient.get<BusinessDay | null>('/business-day/current').then((r) => r.data),

  open: (notes?: string) =>
    apiClient.post<BusinessDay>('/business-day/open', { notes }).then((r) => r.data),

  close: (notes?: string) =>
    apiClient.post<BusinessDay>('/business-day/close', { notes }).then((r) => r.data),

  getHistory: (skip = 0, take = 20) =>
    apiClient
      .get<{ data: BusinessDay[]; total: number }>('/business-day/history', {
        params: { skip, take },
      })
      .then((r) => r.data),

  getZReport: (id: number) =>
    apiClient.get<ZReport>(`/business-day/${id}/z-report`).then((r) => r.data),
};
