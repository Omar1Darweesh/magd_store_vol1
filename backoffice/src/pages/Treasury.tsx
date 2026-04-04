import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import {
    Plus, Wallet, Banknote, CreditCard,
    ArrowUpRight, ArrowDownLeft, Calendar, RefreshCw, X, Loader2,
    Receipt, SmartphoneNfc, ShoppingBag, Truck, FileText, Trash2,
    ChevronLeft, ChevronRight, DollarSign,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MethodBreakdown {
    method: string;
    income: number;
    expense: number;
    balance: number;
}

interface Summary {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    breakdown: MethodBreakdown[];
}

interface TxEntry {
    id: string;
    dbId?: number;
    sourceType: 'SALE' | 'SUPPLIER_PAYMENT' | 'EXPENSE' | 'MANUAL';
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    paymentMethod: string;
    purpose: string;
    notes?: string;
    date: string;
    user?: string;
    referenceNo?: string;
}

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

// ─── Constants ────────────────────────────────────────────────────────────────

const METHODS: Record<string, { label: string; color: string; bg: string; icon: any; textColor: string }> = {
    CASH: { label: 'كاش', color: '#16a34a', bg: '#dcfce7', textColor: '#14532d', icon: Banknote },
    WALLET: { label: 'محفظة', color: '#0891b2', bg: '#cffafe', textColor: '#164e63', icon: Wallet },
    INSTAPAY: { label: 'انستاباي', color: '#db2777', bg: '#fce7f3', textColor: '#831843', icon: SmartphoneNfc },
    TRANSFER: { label: 'تحويل', color: '#7c3aed', bg: '#ede9fe', textColor: '#4c1d95', icon: ArrowUpRight },
    CARD: { label: 'بطاقة', color: '#2563eb', bg: '#dbeafe', textColor: '#1e3a8a', icon: CreditCard },
    FAWRY: { label: 'فوري', color: '#ea580c', bg: '#ffedd5', textColor: '#7c2d12', icon: Receipt },
    MIXED: { label: 'مختلط', color: '#64748b', bg: '#f1f5f9', textColor: '#334155', icon: DollarSign },
};

const SOURCE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
    SALE: { label: 'مبيعات', color: '#16a34a', icon: ShoppingBag },
    SUPPLIER_PAYMENT: { label: 'دفع مورد', color: '#dc2626', icon: Truck },
    EXPENSE: { label: 'مصروف', color: '#b45309', icon: Receipt },
    MANUAL: { label: 'إدخال يدوي', color: '#6366f1', icon: FileText },
};

const PAYMENT_OPTIONS = [
    { value: 'CASH', label: 'كاش' },
    { value: 'WALLET', label: 'محفظة' },
    { value: 'INSTAPAY', label: 'انستاباي' },
    { value: 'TRANSFER', label: 'تحويل' },
    { value: 'CARD', label: 'بطاقة' },
    { value: 'FAWRY', label: 'فوري' },
];

const HIGHLIGHTED_METHODS = ['CASH', 'WALLET', 'INSTAPAY'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function presetDates(preset: DatePreset): { from: string; to: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt2 = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
        const t = today();
        return { from: t, to: t };
    }
    if (preset === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return { from: fmt2(d), to: fmt2(now) };
    }
    if (preset === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: fmt2(d), to: fmt2(now) };
    }
    if (preset === 'year') {
        return { from: `${now.getFullYear()}-01-01`, to: fmt2(now) };
    }
    return { from: '', to: '' };
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
    const cfg = METHODS[method] || METHODS.CASH;
    const Icon = cfg.icon;
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
            display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
        }}>
            <Icon size={12} />
            {cfg.label}
        </span>
    );
}

function SourceBadge({ source }: { source: string }) {
    const cfg = SOURCE_LABELS[source] || SOURCE_LABELS.MANUAL;
    const Icon = cfg.icon;
    return (
        <span style={{
            background: `${cfg.color}18`, color: cfg.color,
            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Treasury() {
    const [allTimeSummary, setAllTimeSummary] = useState<Summary | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [transactions, setTransactions] = useState<TxEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 50;

    const [preset, setPreset] = useState<DatePreset>('month');
    const [dateFrom, setDateFrom] = useState(() => presetDates('month').from);
    const [dateTo, setDateTo] = useState(() => presetDates('month').to);
    const [filterMethod, setFilterMethod] = useState('');
    const [filterType, setFilterType] = useState('');

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState({
        type: 'INCOME',
        amount: '',
        paymentMethod: 'CASH',
        purpose: '',
        notes: '',
        transactionDate: today(),
    });

    // ── Fetch ────────────────────────────────────────────

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const txParams = { ...params };
            if (filterMethod) txParams.paymentMethod = filterMethod;
            if (filterType) txParams.type = filterType;
            txParams.page = String(page);
            txParams.pageSize = String(PAGE_SIZE);

            const [allTimeRes, sumRes, txRes] = await Promise.all([
                apiClient.get('/treasury/summary'),                                    // all-time (no date filter)
                apiClient.get('/treasury/summary', { params }),                        // period
                apiClient.get('/treasury/transactions', { params: txParams }),
            ]);

            setAllTimeSummary(allTimeRes.data);
            setSummary(sumRes.data);
            setTransactions(txRes.data.data || []);
            setTotal(txRes.data.total || 0);
        } catch (e) {
            console.error('Treasury fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, filterMethod, filterType, page]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Preset change ────────────────────────────────────

    function handlePreset(p: DatePreset) {
        setPreset(p);
        if (p !== 'custom') {
            const { from, to } = presetDates(p);
            setDateFrom(from);
            setDateTo(to);
        }
        setPage(1);
    }

    // ── Save manual transaction ──────────────────────────

    async function handleSave() {
        if (!form.amount || !form.purpose.trim()) return;
        setSaving(true);
        try {
            await apiClient.post('/treasury/transactions', {
                ...form,
                amount: parseFloat(form.amount),
            });
            setShowModal(false);
            setForm({ type: 'INCOME', amount: '', paymentMethod: 'CASH', purpose: '', notes: '', transactionDate: today() });
            fetchAll();
        } catch (e) {
            console.error('Save error', e);
        } finally {
            setSaving(false);
        }
    }

    // ── Delete manual ────────────────────────────────────

    async function handleDelete(id: number) {
        try {
            await apiClient.delete(`/treasury/transactions/${id}`);
            setDeleteId(null);
            fetchAll();
        } catch (e) {
            console.error('Delete error', e);
        }
    }

    // ── Group transactions by day ─────────────────────────

    const grouped: Record<string, TxEntry[]> = {};
    for (const tx of transactions) {
        const day = tx.date.split('T')[0];
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(tx);
    }
    const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div style={{ direction: 'rtl', padding: '24px', fontFamily: 'inherit', maxWidth: '1400px', margin: '0 auto' }}>

            {/* ─── Header ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: 0 }}>الخزينة</h1>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>تتبع حركة أموال المتجر — دخل وخروج لكل وسيلة دفع</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={fetchAll} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                        <RefreshCw size={16} /> تحديث
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> إضافة حركة يدوية
                    </button>
                </div>
            </div>

            {/* ─── All-Time Balance Banner ─── */}
            {allTimeSummary && (() => {
                // Grand total = ALL methods combined
                const grandTotal = allTimeSummary.breakdown.reduce((s, b) => s + b.balance, 0);
                // All methods: HIGHLIGHTED first, then others (only if they have activity)
                const orderedMethods = [
                    ...HIGHLIGHTED_METHODS,
                    ...allTimeSummary.breakdown
                        .filter(b => !HIGHLIGHTED_METHODS.includes(b.method) && (b.income > 0 || b.expense > 0))
                        .map(b => b.method),
                ];
                return (
                    <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                        {/* Grand total */}
                        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 6px', letterSpacing: '0.5px' }}>إجمالي رصيد الخزينة</p>
                            <p style={{ color: grandTotal >= 0 ? '#4ade80' : '#f87171', fontSize: '42px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                                {fmt(grandTotal)} <span style={{ fontSize: '22px', fontWeight: '500' }}>ج</span>
                            </p>
                            <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0' }}>إجمالي جميع وسائل الدفع — الرصيد الكلي حتى الآن</p>
                        </div>

                        {/* All method cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                            {orderedMethods.map(m => {
                                const b = allTimeSummary.breakdown.find(x => x.method === m) || { income: 0, expense: 0, balance: 0, method: m };
                                const cfg = METHODS[m] || METHODS.MIXED;
                                const Icon = cfg.icon;
                                return (
                                    <div key={m} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Icon size={17} color={cfg.color} />
                                                </div>
                                                <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '14px' }}>{cfg.label}</span>
                                            </div>
                                            <span style={{ fontSize: '10px', color: '#475569', background: 'rgb(255, 255, 255)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>منذ البداية</span>
                                        </div>
                                        <p style={{ color: b.balance >= 0 ? '#4ade80' : '#f87171', fontSize: '22px', fontWeight: '800', margin: '0 0 8px' }}>
                                            {fmt(b.balance)} ج
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ color: '#86efac' }}>↑ {fmt(b.income)}</span>
                                            <span style={{ color: '#fca5a5' }}>↓ {fmt(b.expense)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ─── Period Filter + Period Summary ─── */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e4976 100%)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.5px' }}>ملخص الفترة</p>
                        {dateFrom && dateTo && (
                            <span style={{ fontSize: '12px', color: '#7dd3fc', fontWeight: '600' }}>
                                {new Date(dateFrom + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(dateTo + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                    {/* Date Presets */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {([
                            { key: 'today', label: 'اليوم' },
                            { key: 'week', label: 'الأسبوع' },
                            { key: 'month', label: 'الشهر' },
                            { key: 'year', label: 'السنة' },
                            { key: 'custom', label: 'مخصص' },
                        ] as { key: DatePreset; label: string }[]).map(p => (
                            <button key={p.key} onClick={() => handlePreset(p.key)}
                                style={{
                                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    border: preset === p.key ? '2px solid #38bdf8' : '1.5px solid rgba(255,255,255,0.15)',
                                    background: preset === p.key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
                                    color: preset === p.key ? '#38bdf8' : '#94a3b8',
                                    fontFamily: 'inherit',
                                }}>
                                {p.label}
                            </button>
                        ))}
                        {preset === 'custom' && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid rgba(255,255,255,0.2)', fontSize: '13px', color: '#e2e8f0', background: 'rgba(255,255,255,0.08)' }} />
                                <span style={{ color: '#475569' }}>—</span>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1.5px solid rgba(255,255,255,0.2)', fontSize: '13px', color: '#e2e8f0', background: 'rgba(255,255,255,0.08)' }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Period net total */}
                {summary && (
                    <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                        <p style={{ color: summary.netBalance >= 0 ? '#4ade80' : '#f87171', fontSize: '38px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                            {summary.netBalance >= 0 ? '+' : ''}{fmt(summary.netBalance)} <span style={{ fontSize: '20px', fontWeight: '500' }}>ج</span>
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px', fontSize: '13px' }}>
                            <span style={{ color: '#86efac' }}>↑ وارد: {fmt(summary.totalIncome)} ج</span>
                            <span style={{ color: '#fca5a5' }}>↓ صادر: {fmt(summary.totalExpense)} ج</span>
                        </div>
                    </div>
                )}

                {/* Per-method cards — same style as all-time banner */}
                {summary && summary.breakdown.filter(b => b.income > 0 || b.expense > 0).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        {summary.breakdown
                            .filter(b => b.income > 0 || b.expense > 0)
                            .map(b => {
                                const cfg = METHODS[b.method] || METHODS.MIXED;
                                const Icon = cfg.icon;
                                return (
                                    <div key={b.method} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Icon size={17} color={cfg.color} />
                                                </div>
                                                <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '14px' }}>{cfg.label}</span>
                                            </div>
                                            <span style={{ fontSize: '10px', color: '#475569', background: 'rgb(255, 255, 255)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>الفترة</span>
                                        </div>
                                        <p style={{ color: b.balance >= 0 ? '#4ade80' : '#f87171', fontSize: '22px', fontWeight: '800', margin: '0 0 8px' }}>
                                            {fmt(b.balance)} ج
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ color: '#86efac' }}>↑ {fmt(b.income)}</span>
                                            <span style={{ color: '#fca5a5' }}>↓ {fmt(b.expense)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>{/* end period panel */}

            {/* ─── Filters Row ─── */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', background: '#fff' }}>
                    <option value="">كل الحركات</option>
                    <option value="INCOME">وارد فقط</option>
                    <option value="EXPENSE">صادر فقط</option>
                </select>
                <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1); }}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', background: '#fff' }}>
                    <option value="">كل الوسائل</option>
                    {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <span style={{ marginRight: 'auto', fontSize: '13px', color: '#94a3b8', alignSelf: 'center' }}>
                    {total} حركة
                </span>
            </div>

            {/* ─── Transactions List ─── */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#94a3b8' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : days.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <Wallet size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <p style={{ fontSize: '16px' }}>لا توجد حركات في هذه الفترة</p>
                </div>
            ) : (
                days.map(day => {
                    const dayTxs = grouped[day];
                    const dayIncome = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
                    const dayExpense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

                    return (
                        <div key={day} style={{ marginBottom: '24px' }}>
                            {/* Day header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '0 4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={15} color="#6366f1" />
                                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{formatDate(day)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                                    <span style={{ color: '#16a34a', fontWeight: '600' }}>+ {fmt(dayIncome)} ج</span>
                                    <span style={{ color: '#dc2626', fontWeight: '600' }}>- {fmt(dayExpense)} ج</span>
                                    <span style={{ color: dayIncome - dayExpense >= 0 ? '#16a34a' : '#dc2626', fontWeight: '700', borderRight: '2px solid #e2e8f0', paddingRight: '16px' }}>
                                        صافي: {fmt(dayIncome - dayExpense)} ج
                                    </span>
                                </div>
                            </div>

                            {/* Transactions for this day */}
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                {dayTxs.map((tx, idx) => (
                                    <div key={tx.id} style={{
                                        display: 'flex', alignItems: 'center', padding: '14px 18px', gap: '14px',
                                        borderBottom: idx < dayTxs.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        background: '#fff',
                                        transition: 'background 0.15s',
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        {/* Icon */}
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                                            background: tx.type === 'INCOME' ? '#dcfce7' : '#fee2e2',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {tx.type === 'INCOME'
                                                ? <ArrowUpRight size={20} color="#16a34a" />
                                                : <ArrowDownLeft size={20} color="#dc2626" />
                                            }
                                        </div>

                                        {/* Details */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{tx.purpose}</span>
                                                <SourceBadge source={tx.sourceType} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatTime(tx.date)}</span>
                                                {tx.user && <span style={{ fontSize: '12px', color: '#94a3b8' }}>· {tx.user}</span>}
                                                {tx.referenceNo && <span style={{ fontSize: '12px', color: '#a5b4fc' }}>· #{tx.referenceNo}</span>}
                                                {tx.notes && <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>· {tx.notes}</span>}
                                            </div>
                                        </div>

                                        {/* Method + Amount */}
                                        <div style={{ textAlign: 'left', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span style={{
                                                fontSize: '18px', fontWeight: '800',
                                                color: tx.type === 'INCOME' ? '#16a34a' : '#dc2626',
                                            }}>
                                                {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)} ج
                                            </span>
                                            <MethodBadge method={tx.paymentMethod} />
                                        </div>

                                        {/* Delete (manual only) */}
                                        {tx.sourceType === 'MANUAL' && tx.dbId && (
                                            <button
                                                onClick={() => setDeleteId(tx.dbId!)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '4px', borderRadius: '6px', flexShrink: 0 }}
                                                title="حذف">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {/* ─── Pagination ─── */}
            {total > PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', marginTop: '24px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                        <ChevronRight size={16} />
                    </button>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>
                        صفحة {page} من {Math.ceil(total / PAGE_SIZE)}
                    </span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: page >= Math.ceil(total / PAGE_SIZE) ? 'default' : 'pointer', opacity: page >= Math.ceil(total / PAGE_SIZE) ? 0.5 : 1 }}>
                        <ChevronLeft size={16} />
                    </button>
                </div>
            )}

            {/* ─── Add Manual Transaction Modal ─── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>إضافة حركة يدوية</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Type toggle */}
                        <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            <button onClick={() => setForm(f => ({ ...f, type: 'INCOME' }))}
                                style={{ flex: 1, padding: '11px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', background: form.type === 'INCOME' ? '#dcfce7' : '#fff', color: form.type === 'INCOME' ? '#16a34a' : '#94a3b8', transition: 'all 0.2s' }}>
                                <ArrowUpRight size={16} style={{ display: 'inline', marginLeft: '6px' }} /> وارد (دخل)
                            </button>
                            <button onClick={() => setForm(f => ({ ...f, type: 'EXPENSE' }))}
                                style={{ flex: 1, padding: '11px', fontSize: '15px', fontWeight: '600', border: 'none', borderRight: '1.5px solid #e2e8f0', cursor: 'pointer', background: form.type === 'EXPENSE' ? '#fee2e2' : '#fff', color: form.type === 'EXPENSE' ? '#dc2626' : '#94a3b8', transition: 'all 0.2s' }}>
                                <ArrowDownLeft size={16} style={{ display: 'inline', marginLeft: '6px' }} /> صادر (خروج)
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Purpose */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>الغرض / الوصف *</label>
                                <input
                                    placeholder="مثال: إيجار المحل، تسوية نقدية، دفع فاتورة..."
                                    value={form.purpose}
                                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', boxSizing: 'border-box' }} />
                            </div>

                            {/* Amount + Method row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>المبلغ *</label>
                                    <input
                                        type="number" min="0.01" step="0.01" placeholder="0.00"
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>وسيلة الدفع</label>
                                    <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', background: '#fff', boxSizing: 'border-box' }}>
                                        {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>التاريخ</label>
                                <input type="date" value={form.transactionDate}
                                    onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', boxSizing: 'border-box' }} />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>ملاحظات (اختياري)</label>
                                <textarea
                                    placeholder="أي ملاحظات إضافية..."
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', resize: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
                                إلغاء
                            </button>
                            <button onClick={handleSave} disabled={saving || !form.amount || !form.purpose.trim()}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                    background: saving || !form.amount || !form.purpose.trim() ? '#c7d2fe' : '#6366f1',
                                    color: '#fff', fontWeight: '700', fontSize: '15px', cursor: saving || !form.amount || !form.purpose.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={18} />}
                                {saving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ─── */}
            {deleteId !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Trash2 size={24} color="#dc2626" />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>حذف الحركة</h3>
                        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>هل أنت متأكد من حذف هذه الحركة اليدوية؟</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setDeleteId(null)}
                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}>
                                إلغاء
                            </button>
                            <button onClick={() => handleDelete(deleteId)}
                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
