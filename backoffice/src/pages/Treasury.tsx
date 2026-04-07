import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/client';
import { useBusinessDay } from '../context/BusinessDayContext';
import type { BusinessDay } from '../api/businessDay';
import { businessDayApi } from '../api/businessDay';
import {
    Plus, Wallet, Banknote, CreditCard,
    ArrowUpRight, ArrowDownLeft, Calendar, RefreshCw, X, Loader2,
    Receipt, SmartphoneNfc, ShoppingBag, Truck, FileText, Trash2,
    ChevronDown, ChevronUp, DollarSign, History,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
    const cfg = METHODS[method] || METHODS.MIXED;
    const Icon = cfg.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
            background: cfg.bg, color: cfg.color,
        }}>
            <Icon size={11} /> {cfg.label}
        </span>
    );
}

function SourceBadge({ source }: { source: string }) {
    const cfg = SOURCE_LABELS[source] || SOURCE_LABELS.MANUAL;
    const Icon = cfg.icon;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '1px 7px', borderRadius: '99px', fontSize: '10px', fontWeight: '700',
            background: cfg.color + '18', color: cfg.color,
        }}>
            <Icon size={10} /> {cfg.label}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Treasury() {
    const { currentDay } = useBusinessDay();

    // ─── Data state ─────────────────────────────────────────────────────────
    const [allTimeSummary, setAllTimeSummary] = useState<Summary | null>(null);
    const [currentDaySummary, setCurrentDaySummary] = useState<Summary | null>(null);
    const [currentDayTxs, setCurrentDayTxs] = useState<TxEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // History
    const [businessDays, setBusinessDays] = useState<BusinessDay[]>([]);
    const [expandedDayId, setExpandedDayId] = useState<number | null>(null);
    const [dayCache, setDayCache] = useState<Record<number, { summary: Summary; txs: TxEntry[] }>>({});
    const [loadingDayId, setLoadingDayId] = useState<number | null>(null);
    const [historyVisible, setHistoryVisible] = useState(true);
    const [historyPage, setHistoryPage] = useState(8);

    // Manual modal
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState({
        type: 'INCOME', amount: '', paymentMethod: 'CASH',
        purpose: '', notes: '',
    });

    // ─── Fetch main data ─────────────────────────────────────────────────────
    const fetchMain = useCallback(async () => {
        setLoading(true);
        try {
            const allTimeRes = await apiClient.get('/treasury/summary');
            setAllTimeSummary(allTimeRes.data);

            if (currentDay) {
                // Use full ISO timestamps so same-date business days don't bleed into each other
                const from = currentDay.openedAt;
                const to = new Date().toISOString();
                const [sumRes, txRes] = await Promise.all([
                    apiClient.get('/treasury/summary', { params: { dateFrom: from, dateTo: to } }),
                    apiClient.get('/treasury/transactions', { params: { dateFrom: from, dateTo: to, page: '1', pageSize: '500' } }),
                ]);
                setCurrentDaySummary(sumRes.data);
                setCurrentDayTxs(txRes.data.data || []);
            } else {
                setCurrentDaySummary(null);
                setCurrentDayTxs([]);
            }
        } catch (e) { console.error('Treasury fetch error', e); }
        finally { setLoading(false); }
    }, [currentDay]);

    useEffect(() => { fetchMain(); }, [fetchMain]);

    useEffect(() => {
        businessDayApi.getHistory(0, 100).then(r =>
            setBusinessDays(r.data.filter(d => d.status === 'CLOSED'))
        );
    }, []);

    // ─── Load single closed day data on demand ────────────────────────────────
    const loadDayData = async (day: BusinessDay) => {
        if (expandedDayId === day.id) { setExpandedDayId(null); return; }
        setExpandedDayId(day.id);
        if (dayCache[day.id]) return;
        setLoadingDayId(day.id);
        try {
            // Use full ISO timestamps for precision
            const from = day.openedAt;
            const to = day.closedAt ?? new Date().toISOString();
            const [sumRes, txRes] = await Promise.all([
                apiClient.get('/treasury/summary', { params: { dateFrom: from, dateTo: to } }),
                apiClient.get('/treasury/transactions', { params: { dateFrom: from, dateTo: to, page: '1', pageSize: '500' } }),
            ]);
            setDayCache(prev => ({ ...prev, [day.id]: { summary: sumRes.data, txs: txRes.data.data || [] } }));
        } catch (e) { console.error(e); }
        finally { setLoadingDayId(null); }
    };

    // ─── Confirmed budget = allTime − currentDay ──────────────────────────────
    const confirmedSummary = useMemo<Summary | null>(() => {
        if (!allTimeSummary) return null;
        if (!currentDaySummary) return allTimeSummary;
        const allMethods = [...new Set([
            ...allTimeSummary.breakdown.map(b => b.method),
            ...currentDaySummary.breakdown.map(b => b.method),
        ])];
        const breakdown = allMethods.map(m => {
            const at = allTimeSummary.breakdown.find(b => b.method === m) || { method: m, income: 0, expense: 0, balance: 0 };
            const cd = currentDaySummary.breakdown.find(b => b.method === m) || { method: m, income: 0, expense: 0, balance: 0 };
            return { method: m, income: at.income - cd.income, expense: at.expense - cd.expense, balance: at.balance - cd.balance };
        }).filter(b => b.income > 0 || b.expense > 0 || Math.abs(b.balance) > 0.001);
        return {
            totalIncome: allTimeSummary.totalIncome - currentDaySummary.totalIncome,
            totalExpense: allTimeSummary.totalExpense - currentDaySummary.totalExpense,
            netBalance: allTimeSummary.netBalance - currentDaySummary.netBalance,
            breakdown,
        };
    }, [allTimeSummary, currentDaySummary]);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    async function handleSave() {
        if (!form.amount || !form.purpose.trim()) return;
        setSaving(true);
        try {
            await apiClient.post('/treasury/transactions', { ...form, amount: parseFloat(form.amount) });
            setShowModal(false);
            setForm({ type: 'INCOME', amount: '', paymentMethod: 'CASH', purpose: '', notes: '' });
            fetchMain();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: number) {
        try {
            await apiClient.delete(`/treasury/transactions/${id}`);
            setDeleteId(null);
            fetchMain();
        } catch (e) { console.error(e); }
    }

    // ─── TX list renderer ─────────────────────────────────────────────────────
    function renderTxList(txs: TxEntry[], canDelete = false) {
        if (txs.length === 0) return (
            <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                <Wallet size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>لا توجد حركات</p>
            </div>
        );
        const grouped: Record<string, TxEntry[]> = {};
        for (const tx of txs) {
            const d = tx.date.split('T')[0];
            if (!grouped[d]) grouped[d] = [];
            grouped[d].push(tx);
        }
        const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        return (
            <div>
                {days.map(day => {
                    const dayTxs = grouped[day];
                    const inc = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
                    const exp = dayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                    return (
                        <div key={day} style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Calendar size={12} color="#6366f1" /> {formatDate(day)}
                                </span>
                                <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                    <span style={{ color: '#16a34a' }}>+{fmt(inc)}</span>
                                    <span style={{ color: '#dc2626' }}>-{fmt(exp)}</span>
                                    <span style={{ fontWeight: '700', color: inc - exp >= 0 ? '#16a34a' : '#dc2626' }}>={fmt(inc - exp)} ج</span>
                                </div>
                            </div>
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                {dayTxs.map((tx, idx) => (
                                    <div key={tx.id}
                                        style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', borderBottom: idx < dayTxs.length - 1 ? '1px solid #f1f5f9' : 'none', background: '#fff', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                                    >
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, background: tx.type === 'INCOME' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {tx.type === 'INCOME' ? <ArrowUpRight size={18} color="#16a34a" /> : <ArrowDownLeft size={18} color="#dc2626" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{tx.purpose}</span>
                                                <SourceBadge source={tx.sourceType} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatTime(tx.date)}</span>
                                                {tx.user && <span style={{ fontSize: '12px', color: '#94a3b8' }}>· {tx.user}</span>}
                                                {tx.referenceNo && <span style={{ fontSize: '12px', color: '#a5b4fc' }}>· #{tx.referenceNo}</span>}
                                                {tx.notes && <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>· {tx.notes}</span>}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'left', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '800', color: tx.type === 'INCOME' ? '#16a34a' : '#dc2626' }}>
                                                {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)} ج
                                            </span>
                                            <MethodBadge method={tx.paymentMethod} />
                                        </div>
                                        {canDelete && tx.sourceType === 'MANUAL' && tx.dbId && (
                                            <button onClick={() => setDeleteId(tx.dbId!)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '4px', borderRadius: '6px', flexShrink: 0 }}>
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

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
                    <button onClick={fetchMain} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                        <RefreshCw size={16} /> تحديث
                    </button>
                    <button onClick={() => setShowModal(true)}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> إضافة حركة يدوية
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: '#94a3b8' }}>
                    <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (<>

                {/* ══════════ SECTION 1 — CONFIRMED BUDGET (CLOSED DAYS ONLY) ══════════ */}
                {confirmedSummary && (() => {
                    const grand = confirmedSummary.netBalance;
                    return (
                        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 2px', fontWeight: '700', letterSpacing: '0.5px' }}>إجمالي رصيد الخزينة</p>
                                    <p style={{ color: '#475569', fontSize: '11px', margin: 0 }}>يشمل الأيام المغلقة فقط — يوم العمل المفتوح منعزل أدناه</p>
                                </div>
                                <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '99px' }}>
                                    ✓ مؤكد
                                </span>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                                <p style={{ color: grand >= 0 ? '#4ade80' : '#f87171', fontSize: '44px', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                                    {fmt(grand)} <span style={{ fontSize: '22px', fontWeight: '500' }}>ج</span>
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px', fontSize: '13px' }}>
                                    <span style={{ color: '#86efac' }}>↑ وارد: {fmt(confirmedSummary.totalIncome)} ج</span>
                                    <span style={{ color: '#fca5a5' }}>↓ صادر: {fmt(confirmedSummary.totalExpense)} ج</span>
                                </div>
                                {currentDay && currentDaySummary && Math.abs(currentDaySummary.netBalance) > 0.001 && (
                                    <p style={{ color: '#fbbf24', fontSize: '12px', marginTop: '10px', background: 'rgba(251,191,36,0.1)', display: 'inline-block', padding: '5px 14px', borderRadius: '99px', border: '1px solid rgba(251,191,36,0.25)' }}>
                                        ⏳ يوم العمل الحالي يحتوي على {fmt(Math.abs(currentDaySummary.netBalance))} ج معلقة — غير محسوبة هنا
                                    </p>
                                )}
                            </div>

                            {/* Per-method cards */}
                            {confirmedSummary.breakdown.filter(b => b.income > 0 || b.expense > 0 || Math.abs(b.balance) > 0.001).length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '10px' }}>
                                    {[...HIGHLIGHTED_METHODS, ...confirmedSummary.breakdown.filter(b => !HIGHLIGHTED_METHODS.includes(b.method)).map(b => b.method)].map(m => {
                                        const b = confirmedSummary.breakdown.find(x => x.method === m) || { income: 0, expense: 0, balance: 0, method: m };
                                        if (b.income === 0 && b.expense === 0 && Math.abs(b.balance) < 0.001) return null;
                                        const cfg = METHODS[m] || METHODS.MIXED;
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={m} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Icon size={15} color={cfg.color} />
                                                    </div>
                                                    <span style={{ color: '#cbd5e1', fontWeight: '600', fontSize: '13px', flex: 1 }}>{cfg.label}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: '#1e293b', color: '#94a3b8' }}>مؤكد</span>
                                                </div>
                                                <p style={{ color: b.balance >= 0 ? '#4ade80' : '#f87171', fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>
                                                    {fmt(b.balance)} ج
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                    <span style={{ color: '#86efac' }}>↑ {fmt(b.income)}</span>
                                                    <span style={{ color: '#fca5a5' }}>↓ {fmt(b.expense)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ══════════ SECTION 2 — CURRENT BUSINESS DAY ══════════ */}
                {currentDay ? (
                    <div style={{ background: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)', borderRadius: '16px', padding: '24px', marginBottom: '16px', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>⏳ يوم العمل الحالي — #{currentDay.id}</span>
                                    <span style={{ background: '#fde047', color: '#78350f', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '99px' }}>مفتوح الآن</span>
                                </div>
                                <p style={{ color: '#fcd34d', fontSize: '12px', margin: '4px 0 0' }}>
                                    فُتح {new Date(currentDay.openedAt).toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · بواسطة {currentDay.opener.fullName}
                                </p>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
                            <p style={{ margin: 0, color: '#fde68a', fontSize: '13px', fontWeight: '600', lineHeight: 1.5 }}>
                                هذه الحركات <strong>معلقة</strong> ولم تُضَف بعد للخزينة المؤكدة — ستُحسَب تلقائياً عند إغلاق يوم العمل
                            </p>
                        </div>

                        {currentDaySummary && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
                                {[
                                    { label: 'إجمالي الوارد', value: currentDaySummary.totalIncome, prefix: '+', color: '#4ade80' },
                                    { label: 'إجمالي الصادر', value: currentDaySummary.totalExpense, prefix: '-', color: '#f87171' },
                                    { label: 'صافي اليوم', value: currentDaySummary.netBalance, prefix: currentDaySummary.netBalance >= 0 ? '+' : '', color: currentDaySummary.netBalance >= 0 ? '#4ade80' : '#f87171' },
                                ].map(item => (
                                    <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                                        <p style={{ color: '#fcd34d', fontSize: '11px', margin: '0 0 4px', fontWeight: '600' }}>{item.label}</p>
                                        <p style={{ color: item.color, fontSize: '20px', fontWeight: '800', margin: 0 }}>
                                            {item.prefix}{fmt(item.value)} ج
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentDaySummary && currentDaySummary.breakdown.filter(b => b.income > 0 || b.expense > 0).length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '8px', marginBottom: '18px' }}>
                                {currentDaySummary.breakdown.filter(b => b.income > 0 || b.expense > 0).map(b => {
                                    const cfg = METHODS[b.method] || METHODS.MIXED;
                                    const Icon = cfg.icon;
                                    return (
                                        <div key={b.method} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Icon size={13} color={cfg.color} />
                                                </div>
                                                <span style={{ color: '#fcd34d', fontWeight: '600', fontSize: '12px' }}>{cfg.label}</span>
                                            </div>
                                            <p style={{ color: b.balance >= 0 ? '#4ade80' : '#f87171', fontSize: '18px', fontWeight: '800', margin: '0 0 4px' }}>
                                                {fmt(b.balance)} ج
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                <span style={{ color: '#86efac' }}>↑ {fmt(b.income)}</span>
                                                <span style={{ color: '#fca5a5' }}>↓ {fmt(b.expense)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px' }}>
                            <p style={{ color: '#fcd34d', fontWeight: '700', fontSize: '13px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Receipt size={14} /> حركات يوم العمل ({currentDayTxs.length})
                            </p>
                            {renderTxList(currentDayTxs, true)}
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '16px' }}>
                        <Wallet size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                        <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0, fontWeight: '600' }}>لا يوجد يوم عمل مفتوح حالياً</p>
                        <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '4px 0 0' }}>ابدأ يوم عمل من صفحة "إدارة يوم العمل" لمتابعة الحركات الجارية</p>
                    </div>
                )}

                {/* ══════════ SECTION 3 — HISTORY ══════════ */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History size={18} color="#6366f1" />
                            سجل أيام العمل المغلقة
                            <span style={{ background: '#e0e7ff', color: '#6366f1', borderRadius: '99px', fontSize: '12px', fontWeight: '700', padding: '2px 10px' }}>
                                {businessDays.length} يوم
                            </span>
                        </h2>
                        <button onClick={() => setHistoryVisible(v => !v)}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {historyVisible ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            {historyVisible ? 'إخفاء' : 'عرض'}
                        </button>
                    </div>

                    {historyVisible && (
                        businessDays.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <History size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                                <p style={{ margin: 0 }}>لا توجد أيام عمل مغلقة بعد</p>
                            </div>
                        ) : (<>
                            {businessDays.slice(0, historyPage).map(day => {
                                const isExpanded = expandedDayId === day.id;
                                const isLoading = loadingDayId === day.id;
                                const cached = dayCache[day.id];
                                const openDate = new Date(day.openedAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                const durMs = new Date(day.closedAt!).getTime() - new Date(day.openedAt).getTime();
                                const durH = Math.floor(durMs / 3600000);
                                const durM = Math.floor((durMs % 3600000) / 60000);
                                return (
                                    <div key={day.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', gap: '14px' }}
                                            onClick={() => loadDayData(day)}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Calendar size={18} color="#6366f1" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#1e293b' }}>يوم #{day.id}</span>
                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{openDate}</span>
                                                    <span style={{ fontSize: '12px', color: '#9ca3af', background: '#f1f5f9', padding: '1px 8px', borderRadius: '4px' }}>
                                                        {durH}س {durM}د
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#6b7280', background: '#f1f5f9', padding: '1px 8px', borderRadius: '4px' }}>
                                                        فُتح: {day.opener.fullName}{day.closer ? ` · أُغلق: ${day.closer.fullName}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            {cached && (
                                                <div style={{ textAlign: 'left', flexShrink: 0, display: 'flex', gap: '14px', fontSize: '13px', alignItems: 'center' }}>
                                                    <span style={{ color: '#16a34a', fontWeight: '600' }}>↑ {fmt(cached.summary.totalIncome)}</span>
                                                    <span style={{ color: '#dc2626', fontWeight: '600' }}>↓ {fmt(cached.summary.totalExpense)}</span>
                                                    <span style={{ fontWeight: '800', fontSize: '15px', color: cached.summary.netBalance >= 0 ? '#16a34a' : '#dc2626' }}>
                                                        = {fmt(cached.summary.netBalance)} ج
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{ color: '#94a3b8', flexShrink: 0 }}>
                                                {isLoading
                                                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    : isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </div>

                                        {isExpanded && cached && (
                                            <div style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa', padding: '16px 18px' }}>
                                                {cached.summary.breakdown.filter(b => b.income > 0 || b.expense > 0).length > 0 && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                                                        {cached.summary.breakdown.filter(b => b.income > 0 || b.expense > 0).map(b => {
                                                            const cfg = METHODS[b.method] || METHODS.MIXED;
                                                            const Icon = cfg.icon;
                                                            return (
                                                                <div key={b.method} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                                                                        <Icon size={13} color={cfg.color} />
                                                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{cfg.label}</span>
                                                                    </div>
                                                                    <p style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 3px', color: b.balance >= 0 ? '#16a34a' : '#dc2626' }}>
                                                                        {fmt(b.balance)} ج
                                                                    </p>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                                                                        <span>↑{fmt(b.income)}</span>
                                                                        <span>↓{fmt(b.expense)}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {renderTxList(cached.txs, false)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {businessDays.length > historyPage && (
                                <div style={{ textAlign: 'center', marginTop: '14px' }}>
                                    <button onClick={() => setHistoryPage(p => p + 8)}
                                        style={{ padding: '10px 28px', borderRadius: '10px', border: '1.5px solid #c7d2fe', background: '#eef2ff', color: '#6366f1', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                                        عرض المزيد ({businessDays.length - historyPage} يوم متبقي)
                                    </button>
                                </div>
                            )}
                        </>)
                    )}
                </div>

            </>)}

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
                        <div style={{ display: 'flex', marginBottom: '20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            <button onClick={() => setForm(f => ({ ...f, type: 'INCOME' }))}
                                style={{ flex: 1, padding: '11px', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer', background: form.type === 'INCOME' ? '#dcfce7' : '#fff', color: form.type === 'INCOME' ? '#16a34a' : '#94a3b8' }}>
                                <ArrowUpRight size={16} style={{ display: 'inline', marginLeft: '6px' }} /> وارد (دخل)
                            </button>
                            <button onClick={() => setForm(f => ({ ...f, type: 'EXPENSE' }))}
                                style={{ flex: 1, padding: '11px', fontSize: '15px', fontWeight: '600', border: 'none', borderRight: '1.5px solid #e2e8f0', cursor: 'pointer', background: form.type === 'EXPENSE' ? '#fee2e2' : '#fff', color: form.type === 'EXPENSE' ? '#dc2626' : '#94a3b8' }}>
                                <ArrowDownLeft size={16} style={{ display: 'inline', marginLeft: '6px' }} /> صادر (خروج)
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>الغرض / الوصف *</label>
                                <input placeholder="مثال: إيجار المحل، تسوية نقدية..." value={form.purpose}
                                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#1e293b', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>المبلغ *</label>
                                    <input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount}
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
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>ملاحظات (اختياري)</label>
                                <textarea placeholder="أي ملاحظات إضافية..." value={form.notes}
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
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: saving || !form.amount || !form.purpose.trim() ? '#c7d2fe' : '#6366f1', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: saving || !form.amount || !form.purpose.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
