import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import {
    X, DollarSign, FileText, TrendingDown, Clock,
    Plus, Trash2, ChevronDown, ChevronUp, Package, CheckCircle, AlertCircle, AlertTriangle
} from 'lucide-react';

interface Product { id: number; nameAr: string; nameEn: string; barcode: string; code?: string; size?: string; color?: string; priceRetail: number; stock: number; active: boolean; }
interface GRNLine { id: number; qty: number; cost: string; product: Product; }
interface GRNPayment { id: number; amount: string; paymentDate: string; method?: string; notes?: string; }
interface GRN {
    id: number; grnNo: string; paymentTerm: string; creditDays?: number | null; createdAt: string;
    subtotalNum: number; taxAmountNum: number; totalNum: number;
    paidAmount: number; remaining: number;
    notes?: string;
    lines: GRNLine[];
    payments: GRNPayment[];
    user: { fullName: string; username: string };
}
interface Payment {
    id: number; amount: string; paymentDate: string;
    method?: string; notes?: string;
    grn?: { id: number; grnNo: string };
    user: { fullName: string; username: string };
}
interface Summary { totalInvoiced: number; totalPaid: number; balance: number; grnCount: number; }
interface Financials { summary: Summary; grns: GRN[]; payments: Payment[]; }

const PAYMENT_TERM_LABELS: Record<string, string> = {
    CASH: 'نقدي', DAYS_15: 'آجل 15 يوم', DAYS_30: 'آجل 30 يوم', DAYS_60: 'آجل 60 يوم', DAYS_CUSTOM: 'آجل مخصص',
};

function getTermDays(paymentTerm: string, creditDays?: number | null): number {
    if (paymentTerm === 'DAYS_15') return 15;
    if (paymentTerm === 'DAYS_30') return 30;
    if (paymentTerm === 'DAYS_60') return 60;
    if (paymentTerm === 'DAYS_CUSTOM') return creditDays || 0;
    return 0;
}

function getTermLabel(paymentTerm: string, creditDays?: number | null): string {
    if (paymentTerm === 'DAYS_CUSTOM') return `آجل ${creditDays || '?'} يوم`;
    return PAYMENT_TERM_LABELS[paymentTerm] || paymentTerm;
}

function computeDueDate(createdAt: string, paymentTerm: string, creditDays?: number | null): Date | null {
    const days = getTermDays(paymentTerm, creditDays);
    if (days === 0) return null;
    const d = new Date(createdAt);
    d.setDate(d.getDate() + days);
    return d;
}
const PAYMENT_METHODS = [
    { value: 'CASH', label: 'كاش' },
    { value: 'TRANSFER', label: 'تحويل بنكي' },
    { value: 'CARD', label: 'بطاقة' },
    { value: 'WALLET', label: 'محفظة' },
    { value: 'INSTAPAY', label: 'انستاباي' },
    { value: 'FAWRY', label: 'فوري' },
];

type Tab = 'grns' | 'payments' | 'products';

export default function SupplierDetails({ supplier, onClose }: { supplier: any; onClose: () => void }) {
    const [data, setData] = useState<Financials | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('grns');
    const [expandedGrn, setExpandedGrn] = useState<number | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);

    // Add payment modal state
    const [showPayModal, setShowPayModal] = useState(false);
    const [payForm, setPayForm] = useState(() => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return { amount: '', grnId: '', method: 'CASH', notes: '', paymentDate: today };
    });
    const [paying, setPaying] = useState(false);
    const [deletingPayment, setDeletingPayment] = useState<number | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        apiClient.get(`/purchasing/suppliers/${supplier.id}/financials`)
            .then(({ data }) => setData(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [supplier.id]);

    const loadProducts = useCallback(() => {
        setProductsLoading(true);
        apiClient.get(`/products?supplierId=${supplier.id}&take=500&active=true`)
            .then(({ data }) => setProducts(data?.data || []))
            .catch(console.error)
            .finally(() => setProductsLoading(false));
    }, [supplier.id]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (activeTab === 'products') loadProducts(); }, [activeTab, loadProducts]);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payForm.amount || Number(payForm.amount) <= 0) return;
        setPaying(true);
        try {
            await apiClient.post(`/purchasing/suppliers/${supplier.id}/payments`, {
                amount: Number(payForm.amount),
                grnId: payForm.grnId ? Number(payForm.grnId) : undefined,
                method: payForm.method,
                notes: payForm.notes || undefined,
                paymentDate: payForm.paymentDate,
            });
            setShowPayModal(false);
            setPayForm({ amount: '', grnId: '', method: 'CASH', notes: '', paymentDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; })() });
            load();
        } catch { alert('فشل تسجيل الدفعة'); }
        finally { setPaying(false); }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) return;
        setDeletingPayment(paymentId);
        try {
            await apiClient.delete(`/purchasing/payments/${paymentId}`);
            load();
        } catch { alert('فشل حذف الدفعة'); }
        finally { setDeletingPayment(null); }
    };

    const fmt = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const paymentStatusColor = (grn: GRN) => {
        if (grn.remaining <= 0) return { bg: '#f0fdf4', color: '#16a34a', icon: <CheckCircle size={14} />, label: 'مدفوع بالكامل' };
        if (grn.paidAmount > 0) return { bg: '#fffbeb', color: '#d97706', icon: <AlertTriangle size={14} />, label: 'مدفوع جزئياً' };
        if (grn.paymentTerm === 'CASH') return { bg: '#fef2f2', color: '#dc2626', icon: <AlertCircle size={14} />, label: 'غير مدفوع' };
        const dueDate = computeDueDate(grn.createdAt, grn.paymentTerm, grn.creditDays);
        if (dueDate) {
            const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
            if (diffDays < 0) return { bg: '#fef2f2', color: '#dc2626', icon: <AlertCircle size={14} />, label: `متأخر ${Math.abs(diffDays)} يوم` };
            if (diffDays <= 7) return { bg: '#fffbeb', color: '#d97706', icon: <AlertTriangle size={14} />, label: `يستحق خلال ${diffDays} يوم` };
        }
        return { bg: '#eef2ff', color: '#6366f1', icon: <Clock size={14} />, label: getTermLabel(grn.paymentTerm, grn.creditDays) };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '780px', maxWidth: '100vw', height: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 32px rgba(0,0,0,0.18)' }}>

                {/* ── Header ── */}
                <div style={{ background: 'white', padding: '20px 28px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>{supplier.name}</div>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                                {supplier.phone && <span style={{ fontSize: '13px', color: '#6b7280' }}>📞 {supplier.phone}</span>}
                                {supplier.contact && <span style={{ fontSize: '13px', color: '#6b7280' }}>👤 {supplier.contact}</span>}
                                {supplier.email && <span style={{ fontSize: '13px', color: '#6b7280' }}>✉️ {supplier.email}</span>}
                                {supplier.address && <span style={{ fontSize: '13px', color: '#6b7280' }}>📍 {supplier.address}</span>}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}><X size={22} /></button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>جاري التحميل...</div>
                ) : data && (
                    <>
                        {/* ── Summary Cards ── */}
                        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', flexShrink: 0 }}>
                            <SummaryCard icon={<FileText size={22} color="#6366f1" />} label="إجمالي الفواتير" value={fmt(data.summary.totalInvoiced) + ' ر.س'} sub={`${data.summary.grnCount} فاتورة استلام`} bg="#eef2ff" />
                            <SummaryCard icon={<DollarSign size={22} color="#16a34a" />} label="إجمالي المدفوع" value={fmt(data.summary.totalPaid) + ' ر.س'} sub="مجموع الدفعات المسجلة" bg="#f0fdf4" />
                            <SummaryCard
                                icon={<TrendingDown size={22} color={data.summary.balance > 0 ? '#dc2626' : '#16a34a'} />}
                                label="الرصيد المتبقي"
                                value={fmt(data.summary.balance) + ' ر.س'}
                                sub={data.summary.balance <= 0 ? 'لا توجد مستحقات' : 'مستحق للمورد'}
                                bg={data.summary.balance > 0 ? '#fef2f2' : '#f0fdf4'}
                                valueColor={data.summary.balance > 0 ? '#dc2626' : '#16a34a'}
                            />
                        </div>

                        {/* ── Tabs + Add Payment ── */}
                        <div style={{ padding: '0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', gap: '4px', background: '#e5e7eb', borderRadius: '8px', padding: '4px' }}>
                                {(['grns', 'payments', 'products'] as Tab[]).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                        padding: '7px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                                        background: activeTab === tab ? 'white' : 'transparent',
                                        color: activeTab === tab ? '#111827' : '#6b7280',
                                        boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    }}>
                                        {tab === 'grns' ? `فواتير الاستلام (${data.grns.length})` : tab === 'payments' ? `الدفعات (${data.payments.length})` : 'المنتجات'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowPayModal(true)} style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px',
                                background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                            }}>
                                <Plus size={16} /> تسجيل دفعة
                            </button>
                        </div>

                        {/* ── Tab Content ── */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 28px' }}>

                            {/* GRNs Tab */}
                            {activeTab === 'grns' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {data.grns.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>لا توجد فواتير استلام</div>
                                    ) : data.grns.map(grn => {
                                        const status = paymentStatusColor(grn);
                                        const isOpen = expandedGrn === grn.id;
                                        return (
                                            <div key={grn.id} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                                {/* GRN Header Row */}
                                                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setExpandedGrn(isOpen ? null : grn.id)}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#6366f1', fontFamily: 'monospace' }}>{grn.grnNo}</span>
                                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(grn.createdAt).toLocaleDateString('ar-SA')}</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 10px', background: status.bg, color: status.color, borderRadius: '9999px' }}>
                                                                {status.icon} {status.label}
                                                            </span>
                                                            {grn.paymentTerm !== 'CASH' && grn.remaining > 0 && (() => {
                                                                const due = computeDueDate(grn.createdAt, grn.paymentTerm, grn.creditDays);
                                                                if (!due) return null;
                                                                return (
                                                                    <span style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                        📅 {due.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                            {grn.lines.length} صنف · {grn.user?.fullName}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{fmt(grn.totalNum)} ر.س</div>
                                                        <div style={{ fontSize: '12px', marginTop: '2px' }}>
                                                            <span style={{ color: '#16a34a' }}>مدفوع: {fmt(grn.paidAmount)}</span>
                                                            {grn.remaining > 0 && <span style={{ color: '#dc2626', marginRight: '8px' }}>متبقي: {fmt(grn.remaining)}</span>}
                                                        </div>
                                                    </div>
                                                    {isOpen ? <ChevronUp size={18} color="#9ca3af" /> : <ChevronDown size={18} color="#9ca3af" />}
                                                </div>

                                                {/* Expanded GRN Details */}
                                                {isOpen && (
                                                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 18px', background: '#fafafa' }}>
                                                        {/* GRN totals breakdown */}
                                                        {(() => {
                                                            const due = computeDueDate(grn.createdAt, grn.paymentTerm, grn.creditDays);
                                                            const dueFmt = due ? due.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
                                                            const diffDays = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
                                                            const isOverdue = diffDays !== null && diffDays < 0;
                                                            const isDueSoon = diffDays !== null && diffDays >= 0 && diffDays <= 7;
                                                            return (
                                                                <>
                                                                    <div style={{ display: 'flex', gap: '24px', marginBottom: dueFmt ? '10px' : '16px', flexWrap: 'wrap' }}>
                                                                        <InfoPair label="المجموع الفرعي" value={fmt(grn.subtotalNum) + ' ر.س'} />
                                                                        <InfoPair label="الضريبة" value={fmt(grn.taxAmountNum) + ' ر.س'} />
                                                                        <InfoPair label="الإجمالي" value={fmt(grn.totalNum) + ' ر.س'} bold />
                                                                        <InfoPair label="شرط الدفع" value={getTermLabel(grn.paymentTerm, grn.creditDays)} />
                                                                        {grn.notes && <InfoPair label="ملاحظات" value={grn.notes} />}
                                                                    </div>
                                                                    {dueFmt && (
                                                                        <div style={{
                                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                                            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                                                                            background: isOverdue ? '#fef2f2' : isDueSoon ? '#fffbeb' : '#eef2ff',
                                                                            border: `1px solid ${isOverdue ? '#fecaca' : isDueSoon ? '#fde68a' : '#c7d2fe'}`,
                                                                        }}>
                                                                            <span style={{ fontSize: '16px' }}>{isOverdue ? '⚠️' : isDueSoon ? '⏰' : '📅'}</span>
                                                                            <div>
                                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: isOverdue ? '#dc2626' : isDueSoon ? '#d97706' : '#4f46e5' }}>
                                                                                    {isOverdue
                                                                                        ? `متأخر ${Math.abs(diffDays!)} يوم!`
                                                                                        : isDueSoon
                                                                                            ? `يستحق خلال ${diffDays} يوم`
                                                                                            : `تاريخ الاستحقاق`}
                                                                                </span>
                                                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginRight: '8px' }}>{dueFmt}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}

                                                        {/* Products table */}
                                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Package size={14} /> الأصناف المستلمة
                                                        </div>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
                                                            <thead>
                                                                <tr style={{ background: '#f3f4f6' }}>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>الصنف</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>الكمية</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>التكلفة</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>الإجمالي</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {grn.lines.map(line => (
                                                                    <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                        <td style={{ padding: '8px 12px' }}>
                                                                            <div style={{ fontWeight: 600 }}>{line.product.nameAr || line.product.nameEn}</div>
                                                                            <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{line.product.barcode}</div>
                                                                        </td>
                                                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{line.qty}</td>
                                                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{fmt(Number(line.cost))}</td>
                                                                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{fmt(line.qty * Number(line.cost))}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>

                                                        {/* Pay this GRN button */}
                                                        {grn.remaining > 0 && (
                                                            <button onClick={() => {
                                                                setPayForm(f => ({ ...f, amount: grn.remaining.toFixed(2), grnId: String(grn.id) }));
                                                                setShowPayModal(true);
                                                            }} style={{
                                                                padding: '7px 16px', background: '#16a34a', color: 'white', border: 'none',
                                                                borderRadius: '7px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                                                            }}>
                                                                <DollarSign size={14} /> دفع المتبقي ({fmt(grn.remaining)} ر.س)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Payments Tab */}
                            {activeTab === 'payments' && (
                                <div>
                                    {data.payments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>لا توجد دفعات مسجلة</div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                            <thead>
                                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#374151' }}>التاريخ</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#374151' }}>المبلغ</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#374151' }}>طريقة الدفع</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#374151' }}>الفاتورة</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#374151' }}>بواسطة</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: '#374151' }}>ملاحظات</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#374151' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.payments.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{new Date(p.paymentDate).toLocaleDateString('ar-SA')}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>{fmt(Number(p.amount))} ر.س</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{p.method || '-'}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6366f1', fontFamily: 'monospace' }}>{p.grn?.grnNo || '-'}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{p.user?.fullName || p.user?.username}</td>
                                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>{p.notes || '-'}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <button onClick={() => handleDeletePayment(p.id)} disabled={deletingPayment === p.id}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: deletingPayment === p.id ? 0.5 : 1 }}>
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Products Tab */}
                            {activeTab === 'products' && (
                                <div>
                                    {productsLoading ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>جاري التحميل...</div>
                                    ) : products.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                            <Package size={40} style={{ marginBottom: '12px', opacity: 0.4 }} /><br />
                                            لا توجد منتجات مرتبطة بهذا المورد
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7280' }}>{products.length} منتج مرتبط</div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                                                <thead>
                                                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#374151' }}>الكود</th>
                                                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#374151' }}>الاسم</th>
                                                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: '#374151' }}>الباركود</th>
                                                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#374151' }}>سعر البيع</th>
                                                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#374151' }}>المخزون</th>
                                                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: '#374151' }}>الحالة</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {products.map(p => (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>{p.code || '—'}</td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{p.nameAr || p.nameEn}</div>
                                                                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                    {p.size && <span style={{ fontSize: '10px', background: '#1e293b', color: 'white', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace' }}>{p.size}</span>}
                                                                    {p.color && <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#374151', borderRadius: '3px', padding: '1px 5px', border: '1px solid #e2e8f0' }}>{p.color}</span>}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' }}>{p.barcode}</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: '13px', color: '#059669' }}>{fmt(Number(p.priceRetail))} ر.س</td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                                                                    background: p.stock <= 0 ? '#fee2e2' : '#dcfce7',
                                                                    color: p.stock <= 0 ? '#dc2626' : '#16a34a',
                                                                }}>
                                                                    {p.stock}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                                                    background: p.active ? '#dcfce7' : '#f1f5f9',
                                                                    color: p.active ? '#16a34a' : '#94a3b8',
                                                                }}>
                                                                    {p.active ? 'نشط' : 'غير نشط'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Add Payment Modal ── */}
            {showPayModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>تسجيل دفعة</h3>
                            <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddPayment}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>المبلغ (ر.س) *</label>
                                <input type="number" min="0.01" step="0.01" required value={payForm.amount}
                                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px', fontWeight: 700, boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>ربط بفاتورة استلام (اختياري)</label>
                                <select value={payForm.grnId} onChange={e => setPayForm(f => ({ ...f, grnId: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white', boxSizing: 'border-box' }}>
                                    <option value="">-- بدون ربط --</option>
                                    {data?.grns.filter(g => g.remaining > 0).map(g => (
                                        <option key={g.id} value={g.id}>{g.grnNo} (متبقي: {fmt(g.remaining)} ر.س)</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>طريقة الدفع</label>
                                <select value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white', boxSizing: 'border-box' }}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>تاريخ الدفع</label>
                                <input type="date" value={payForm.paymentDate}
                                    onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>ملاحظات (اختياري)</label>
                                <textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" disabled={paying} style={{
                                    flex: 1, padding: '11px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px',
                                    cursor: paying ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '15px', opacity: paying ? 0.7 : 1,
                                }}>
                                    {paying ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
                                </button>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{
                                    flex: 1, padding: '11px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '15px',
                                }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ icon, label, value, sub, bg, valueColor }: { icon: React.ReactNode; label: string; value: string; sub: string; bg: string; valueColor?: string }) {
    return (
        <div style={{ background: bg, borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {icon}
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: valueColor || '#111827' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{sub}</div>
        </div>
    );
}

function InfoPair({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13px', color: '#111827', fontWeight: bold ? 700 : 500 }}>{value}</div>
        </div>
    );
}
