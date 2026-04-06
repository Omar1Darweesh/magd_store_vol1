import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import {
    Search, AlertCircle, CheckCircle, Package, CreditCard, DollarSign,
    X, ChevronDown, ChevronUp, Printer, FileText, Users, Clock, Wallet, ArrowDownCircle, ArrowUpCircle, Filter
} from 'lucide-react';

/* ==========================================
   TYPES
========================================== */
interface Payment {
    id: number;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string;
    user: { fullName: string };
}

interface InvoiceLine {
    id: number;
    productId: number;
    productName: string;
    barcode: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    lineDiscount: number;
}

interface Invoice {
    id: number;
    invoiceNo: string;
    createdAt: string;
    total: number;
    paidAmount: number;
    remainingAmount: number;
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    shippingFee: number;
    totalRefunded: number;
    paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
    paymentMethod: string;
    delivered: boolean;
    deliveryDate?: string;
    channel?: string;
    notes?: string;
    branch: { name: string };
    user?: { fullName: string };
    payments: Payment[];
    lines: InvoiceLine[];
}

interface Customer {
    id: number;
    name: string;
    phone?: string;
    type?: string;
    address?: string;
    totalDebt: number;
    totalPurchases: number;
    invoiceCount: number;
    pendingCount: number;
}

interface StatementData {
    customer: { id: number; name: string; phone?: string; type?: string; address?: string };
    invoices: Invoice[];
    summary: {
        totalInvoices: number;
        totalPurchases: number;
        totalPaid: number;
        totalDebt: number;
        paidInvoices: number;
        partialInvoices: number;
        unpaidInvoices: number;
        undelivered: number;
    };
}

/* ==========================================
   PAYMENT METHODS - Consistent with system
========================================== */
const PAYMENT_METHODS = [
    { value: 'CASH', label: 'نقدي', labelEn: 'Cash', icon: '💵', color: '#16a34a' },
    { value: 'CARD', label: 'بطاقة', labelEn: 'Card', icon: '💳', color: '#2563eb' },
    { value: 'TRANSFER', label: 'تحويل', labelEn: 'Transfer', icon: '🏦', color: '#7c3aed' },
    { value: 'INSTAPAY', label: 'إنستاباي', labelEn: 'InstaPay', icon: '📱', color: '#ec4899' },
    { value: 'FAWRY', label: 'فوري', labelEn: 'Fawry', icon: '🏪', color: '#f59e0b' },
    { value: 'WALLET', label: 'محفظة', labelEn: 'Wallet', icon: '👛', color: '#14b8a6' },
];

const getPaymentMethodDisplay = (method: string) => {
    const pm = PAYMENT_METHODS.find(m => m.value === method);
    return pm ? `${pm.icon} ${pm.label}` : method;
};

/* ==========================================
   MAIN COMPONENT
========================================== */
export default function CustomerPayments() {
    // Data states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [statement, setStatement] = useState<StatementData | null>(null);
    const [loading, setLoading] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Expand states
    const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());

    // Tab
    const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'paid'>('pending');

    const printRef = useRef<HTMLDivElement>(null);

    // Derived: filter invoices based on active tab
    const allInvoices = statement?.invoices || [];
    const pendingInvoices = activeTab === 'paid'
        ? allInvoices.filter(inv => inv.paymentStatus === 'PAID')
        : activeTab === 'pending'
            ? allInvoices.filter(inv => inv.paymentStatus !== 'PAID')
            : allInvoices;

    /* ==========================================
       DATA FETCHING
    ========================================== */
    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (!customerSearch.trim()) {
            setFilteredCustomers(customers);
        } else {
            const q = customerSearch.toLowerCase();
            setFilteredCustomers(customers.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.phone && c.phone.includes(q))
            ));
        }
    }, [customerSearch, customers]);

    const fetchCustomers = async () => {
        try {
            const res = await apiClient.get('/pos/customers');
            setCustomers(res.data || []);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        }
    };

    const fetchStatement = async (customerId: number) => {
        setLoading(true);
        try {
            const params: any = {};
            if (dateFrom) params.startDate = dateFrom;
            if (dateTo) params.endDate = dateTo;

            const res = await apiClient.get(`/pos/customers/${customerId}/statement`, { params });
            setStatement(res.data);
        } catch {
            // Fallback to pending-payments endpoint
            try {
                const res = await apiClient.get(`/pos/customers/${customerId}/pending-payments`);
                const invoices = res.data || [];
                const totalPurchases = invoices.reduce((s: number, i: Invoice) => s + i.total, 0);
                const totalPaid = invoices.reduce((s: number, i: Invoice) => s + i.paidAmount, 0);
                const totalDebt = invoices.reduce((s: number, i: Invoice) => s + i.remainingAmount, 0);
                setStatement({
                    customer: selectedCustomer ? { id: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone, type: selectedCustomer.type } : { id: customerId, name: '' },
                    invoices,
                    summary: {
                        totalInvoices: invoices.length,
                        totalPurchases,
                        totalPaid,
                        totalDebt,
                        paidInvoices: invoices.filter((i: Invoice) => i.paymentStatus === 'PAID').length,
                        partialInvoices: invoices.filter((i: Invoice) => i.paymentStatus === 'PARTIAL').length,
                        unpaidInvoices: invoices.filter((i: Invoice) => i.paymentStatus === 'UNPAID').length,
                        undelivered: invoices.filter((i: Invoice) => !i.delivered).length,
                    },
                });
            } catch {
                alert('فشل تحميل بيانات الحساب');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerSelect = (cust: Customer) => {
        setSelectedCustomer(cust);
        setExpandedInvoices(new Set());
        fetchStatement(cust.id);
    };

    const refreshData = () => {
        if (selectedCustomer) {
            fetchStatement(selectedCustomer.id);
            fetchCustomers(); // refresh debt totals
        }
    };

    /* ==========================================
       PAYMENT ACTIONS
    ========================================== */
    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('يرجى إدخال مبلغ صحيح');
            return;
        }
        if (amount > selectedInvoice.remainingAmount + 0.01) {
            alert('المبلغ المدخل أكبر من المبلغ المتبقي');
            return;
        }

        try {
            await apiClient.post('/pos/payments', {
                salesInvoiceId: selectedInvoice.id,
                amount,
                paymentMethod,
                notes: paymentNotes,
            });

            alert('تم تسجيل الدفعة بنجاح');
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentNotes('');

            // Refresh data
            refreshData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشل تسجيل الدفعة');
        }
    };

    const handleDeliverProducts = async () => {
        if (!selectedInvoice) return;

        if (selectedInvoice.paymentStatus !== 'PAID') {
            alert('لا يمكن التسليم - الفاتورة غير مدفوعة بالكامل');
            return;
        }

        try {
            await apiClient.post(`/pos/sales/${selectedInvoice.id}/deliver`);
            alert('تم تسليم المنتجات بنجاح');
            setShowDeliveryModal(false);

            // Refresh data
            refreshData();
        } catch (error: any) {
            alert(error.response?.data?.message || 'فشل تسليم المنتجات');
        }
    };

    const openPaymentModal = (invoice: Invoice) => {
        console.log('💳 Opening payment modal for invoice:', invoice.invoiceNo);
        setSelectedInvoice(invoice);
        setPaymentAmount(invoice.remainingAmount.toFixed(2));
        setShowPaymentModal(true);
    };

    const openDeliveryModal = (invoice: Invoice) => {
        console.log('📦 Opening delivery modal for invoice:', invoice.invoiceNo);
        setSelectedInvoice(invoice);
        setShowDeliveryModal(true);
    };

    const toggleInvoiceExpand = (invoiceId: number) => {
        console.log('🔍 Toggling expansion for invoice:', invoiceId);
        setExpandedInvoices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(invoiceId)) {
                newSet.delete(invoiceId);
            } else {
                newSet.add(invoiceId);
            }
            return newSet;
        });
    };

    const getTotalDebt = () => {
        return pendingInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    };

    const getPaymentStatusBadge = (status: string) => {
        const badges = {
            PAID: { label: 'مدفوع', color: '#16a34a', bg: '#dcfce7' },
            PARTIAL: { label: 'مدفوع جزئياً', color: '#ea580c', bg: '#fed7aa' },
            UNPAID: { label: 'غير مدفوع', color: '#dc2626', bg: '#fee2e2' },
        };
        const badge = badges[status as keyof typeof badges];
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: badge.bg,
                color: badge.color
            }}>
                {badge.label}
            </span>
        );
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <DollarSign size={32} color="#2563eb" />
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>حسابات العملاء والدفعات</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
                {/* Customer List */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>قائمة العملاء</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {customers.map(customer => (
                            <button
                                key={customer.id}
                                onClick={() => handleCustomerSelect(customer)}
                                style={{
                                    padding: '12px',
                                    textAlign: 'right',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    background: selectedCustomer?.id === customer.id ? '#eff6ff' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    borderColor: selectedCustomer?.id === customer.id ? '#2563eb' : '#e5e7eb'
                                }}
                            >
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{customer.name}</div>
                                {customer.phone && (
                                    <div style={{ fontSize: '13px', color: '#6b7280', direction: 'ltr', textAlign: 'left' }}>
                                        {customer.phone}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Invoices & Payments */}
                <div>
                    {!selectedCustomer ? (
                        <div style={{
                            background: 'white',
                            padding: '60px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <Search size={48} color="#9ca3af" style={{ marginBottom: '16px' }} />
                            <p style={{ fontSize: '18px', color: '#6b7280' }}>اختر عميل لعرض حسابه</p>
                        </div>
                    ) : loading ? (
                        <div style={{ textAlign: 'center', padding: '60px' }}>جاري التحميل...</div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                <div style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>إجمالي الديون</div>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>
                                        {getTotalDebt().toFixed(2)} ج.م
                                    </div>
                                </div>

                                <div style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>عدد الفواتير المعلقة</div>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c' }}>
                                        {pendingInvoices.length}
                                    </div>
                                </div>

                                <div style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>منتجات لم تسلم</div>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>
                                        {pendingInvoices.filter(inv => !inv.delivered).length}
                                    </div>
                                </div>
                            </div>

                            {/* Invoices Table */}
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <tr>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>رقم الفاتورة</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>التاريخ</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>الإجمالي</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>المدفوع</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>المتبقي</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>الحالة</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>التسليم</th>
                                            <th style={{ padding: '12px', textAlign: 'right' }}>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingInvoices.map(invoice => (
                                            <React.Fragment key={invoice.id}>
                                                <tr style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => toggleInvoiceExpand(invoice.id)}>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '18px' }}>{expandedInvoices.has(invoice.id) ? '▼' : '▶'}</span>
                                                            {invoice.invoiceNo}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {new Date(invoice.createdAt).toLocaleDateString('ar-EG')}
                                                    </td>
                                                    <td style={{ padding: '12px', fontWeight: '600' }}>
                                                        {invoice.total.toFixed(2)} ج.م
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#16a34a' }}>
                                                        {invoice.paidAmount.toFixed(2)} ج.م
                                                    </td>
                                                    <td style={{ padding: '12px', color: '#dc2626', fontWeight: '600' }}>
                                                        {invoice.remainingAmount.toFixed(2)} ج.م
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {getPaymentStatusBadge(invoice.paymentStatus)}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        {invoice.delivered ? (
                                                            <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <CheckCircle size={16} /> تم التسليم
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#ea580c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <AlertCircle size={16} /> لم يتم
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {invoice.remainingAmount > 0 && (
                                                                <button
                                                                    onClick={() => openPaymentModal(invoice)}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: '#16a34a',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <CreditCard size={14} /> دفع
                                                                </button>
                                                            )}

                                                            {!invoice.delivered && invoice.paymentStatus === 'PAID' && (
                                                                <button
                                                                    onClick={() => openDeliveryModal(invoice)}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        background: '#2563eb',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <Package size={14} /> تسليم
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Details Row (Expandable) */}
                                                {expandedInvoices.has(invoice.id) && (
                                                    <tr style={{ background: '#f9fafb' }}>
                                                        <td colSpan={8} style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                                                            {/* Sales Lines */}
                                                            {invoice.lines && invoice.lines.length > 0 && (
                                                                <div style={{ marginBottom: '24px' }}>
                                                                    <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <Package size={18} /> تفاصيل المنتجات
                                                                    </div>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                                        <thead>
                                                                            <tr style={{ background: '#f1f5f9' }}>
                                                                                <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>المنتج</th>
                                                                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>الكمية</th>
                                                                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>السعر</th>
                                                                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>الإجمالي</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {invoice.lines.map((line) => (
                                                                                <tr key={line.id}>
                                                                                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{line.productName}</td>
                                                                                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>{line.qty}</td>
                                                                                    <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>{line.unitPrice.toFixed(2)} ج.م</td>
                                                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #f1f5f9' }}>{line.lineTotal.toFixed(2)} ج.م</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}

                                                            {/* Payment History */}
                                                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <CreditCard size={18} /> سجل الدفعات
                                                                </div>
                                                                {invoice.payments.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {invoice.payments.map((payment) => (
                                                                            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '6px', fontSize: '13px', border: '1px solid #f1f5f9' }}>
                                                                                <span>
                                                                                    <strong>{new Date(payment.paymentDate).toLocaleString('ar-EG')}</strong> -
                                                                                    <span style={{ color: '#16a34a', fontWeight: '600' }}> {payment.amount.toFixed(2)} ج.م </span>
                                                                                    ({payment.paymentMethod})
                                                                                </span>
                                                                                <span style={{ color: '#64748b' }}>
                                                                                    بواسطة: {payment.user.fullName}
                                                                                    {payment.notes && ` - ${payment.notes}`}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>لا توجد دفعات مسجلة بعد لهذه الفاتورة</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>

                                {pendingInvoices.length === 0 && (
                                    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                                        <CheckCircle size={48} color="#16a34a" style={{ marginBottom: '16px' }} />
                                        <p style={{ fontSize: '18px' }}>لا توجد فواتير معلقة - الحساب مسدد بالكامل! ✅</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '500px',
                        maxWidth: '90%'
                    }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>
                            تسجيل دفعة - {selectedInvoice.invoiceNo}
                        </h3>

                        <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>إجمالي الفاتورة:</strong> {selectedInvoice.total.toFixed(2)} ج.م
                            </div>
                            <div style={{ marginBottom: '8px', color: '#16a34a' }}>
                                <strong>المدفوع:</strong> {selectedInvoice.paidAmount.toFixed(2)} ج.م
                            </div>
                            <div style={{ color: '#dc2626', fontSize: '18px', fontWeight: 'bold' }}>
                                <strong>المتبقي:</strong> {selectedInvoice.remainingAmount.toFixed(2)} ج.م
                            </div>
                        </div>

                        <form onSubmit={handleAddPayment}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    المبلغ المدفوع
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '16px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    طريقة الدفع
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '16px'
                                    }}
                                >
                                    <option value="CASH">نقدي (Cash)</option>
                                    <option value="CARD">بطاقة (Card)</option>
                                    <option value="TRANSFER">تحويل (Transfer)</option>
                                    <option value="INSTAPAY">إنستاباي</option>
                                    <option value="FAWRY">فوري</option>
                                    <option value="WALLET">محفظة (Wallet)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                    ملاحظات (اختياري)
                                </label>
                                <textarea
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '16px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    تسجيل الدفعة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#e5e7eb',
                                        color: '#374151',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delivery Modal */}
            {showDeliveryModal && selectedInvoice && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        width: '450px',
                        maxWidth: '90%'
                    }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>
                            تسليم المنتجات - {selectedInvoice.invoiceNo}
                        </h3>

                        <div style={{ marginBottom: '20px', padding: '16px', background: '#dcfce7', borderRadius: '8px', border: '1px solid #16a34a' }}>
                            <CheckCircle size={24} color="#16a34a" style={{ marginBottom: '8px' }} />
                            <p style={{ color: '#166534', marginBottom: '8px' }}>
                                الفاتورة مدفوعة بالكامل ({selectedInvoice.total.toFixed(2)} ج.م)
                            </p>
                            <p style={{ fontSize: '14px', color: '#166534' }}>
                                سيتم خصم المنتجات من المخزون عند التأكيد
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleDeliverProducts}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                تأكيد التسليم
                            </button>
                            <button
                                onClick={() => setShowDeliveryModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#e5e7eb',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
