import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useBusinessDay } from '../context/BusinessDayContext';
import type { BusinessDay } from '../api/businessDay';
import { businessDayApi } from '../api/businessDay';
import {
    ArrowUpRight, ArrowDownLeft, CalendarDays, RefreshCw,
    ShoppingBag, Truck, Receipt, FileText, Wallet,
    Banknote, CreditCard, SmartphoneNfc, DollarSign,
    Plus, X, Check, Tag,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface Summary {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
}

interface ExpenseCategory {
    id: number;
    name: string;
    nameAr: string | null;
    color: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    SALE: { label: 'مبيعات', color: '#16a34a', icon: ShoppingBag },
    SUPPLIER_PAYMENT: { label: 'دفع مورد', color: '#dc2626', icon: Truck },
    EXPENSE: { label: 'مصروف', color: '#b45309', icon: Receipt },
    MANUAL: { label: 'يدوي', color: '#6366f1', icon: FileText },
};

const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    CASH: { label: 'كاش', color: '#16a34a', bg: '#dcfce7', icon: Banknote },
    WALLET: { label: 'محفظة', color: '#0891b2', bg: '#cffafe', icon: Wallet },
    INSTAPAY: { label: 'انستاباي', color: '#db2777', bg: '#fce7f3', icon: SmartphoneNfc },
    TRANSFER: { label: 'تحويل', color: '#7c3aed', bg: '#ede9fe', icon: ArrowUpRight },
    CARD: { label: 'بطاقة', color: '#2563eb', bg: '#dbeafe', icon: CreditCard },
    FAWRY: { label: 'فوري', color: '#ea580c', bg: '#ffedd5', icon: Receipt },
    MIXED: { label: 'مختلط', color: '#64748b', bg: '#f1f5f9', icon: DollarSign },
};

const PAYMENT_OPTIONS = [
    { value: 'CASH', label: 'كاش' },
    { value: 'WALLET', label: 'محفظة' },
    { value: 'INSTAPAY', label: 'انستاباي' },
    { value: 'TRANSFER', label: 'تحويل' },
    { value: 'CARD', label: 'بطاقة' },
    { value: 'FAWRY', label: 'فوري' },
];

const EMPTY_FORM = {
    entryType: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    paymentMethod: 'CASH',
    categoryId: '',
    description: '',
    notes: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function calcDuration(openedAt: string, closedAt: string | null) {
    const end = closedAt ? new Date(closedAt) : new Date();
    const diff = Math.floor((end.getTime() - new Date(openedAt).getTime()) / 60000);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return `${h} س ${m} د`;
    return `${m} د`;
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
    const cfg = METHOD_CONFIG[method] || METHOD_CONFIG.CASH;
    const Icon = cfg.icon;
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
            display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
        }}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

function SourceBadge({ source }: { source: string }) {
    const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.MANUAL;
    const Icon = cfg.icon;
    return (
        <span style={{
            background: `${cfg.color}18`, color: cfg.color,
            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500',
            display: 'inline-flex', alignItems: 'center', gap: '3px',
        }}>
            <Icon size={11} />
            {cfg.label}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DayCashSheet() {
    const { currentDay } = useBusinessDay();

    // Current logged-in user (from localStorage set by Layout)
    const currentUser: any = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = (currentUser?.roles as string[] | undefined)?.some(r => r.toUpperCase() === 'ADMIN') ?? false;

    const [businessDayId, setBusinessDayId] = useState<string>('ALL');
    const [businessDays, setBusinessDays] = useState<BusinessDay[]>([]);
    const [selectedDay, setSelectedDay] = useState<BusinessDay | null>(null);

    const [transactions, setTransactions] = useState<TxEntry[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState<'' | 'INCOME' | 'EXPENSE'>('');

    // ── Entry form state ──
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // ── Categories ──
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [showNewCat, setShowNewCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatAr, setNewCatAr] = useState('');
    const [savingCat, setSavingCat] = useState(false);

    // Load business days history
    useEffect(() => {
        businessDayApi.getHistory(0, 50).then(r => setBusinessDays(r.data));
    }, []);

    // Load expense categories once
    useEffect(() => {
        apiClient.get('/expenses/categories?active=true').then(r => {
            setCategories(r.data || []);
        }).catch(() => { });
    }, []);

    // Default to currentDay when it loads
    useEffect(() => {
        if (currentDay && businessDayId === 'ALL') {
            setBusinessDayId(currentDay.id.toString());
            setSelectedDay(currentDay);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDay]);

    // Fetch treasury data when selected day changes
    const fetchDayData = useCallback(async () => {
        if (!selectedDay) return;
        setLoading(true);
        try {
            // Use full ISO timestamps so two business days on the same calendar date
            // don't bleed into each other
            const from = selectedDay.openedAt;
            const to = selectedDay.closedAt ?? new Date().toISOString();

            const [txRes, sumRes] = await Promise.all([
                apiClient.get('/treasury/transactions', {
                    params: { dateFrom: from, dateTo: to, pageSize: '500' },
                }),
                apiClient.get('/treasury/summary', {
                    params: { dateFrom: from, dateTo: to },
                }),
            ]);

            setTransactions(txRes.data.data || []);
            setSummary(sumRes.data);
        } catch (e) {
            console.error('DayCashSheet fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [selectedDay]);

    useEffect(() => {
        if (selectedDay) fetchDayData();
    }, [fetchDayData]);

    function handleDayChange(id: string) {
        setBusinessDayId(id);
        if (id === 'ALL') {
            setSelectedDay(null);
            setTransactions([]);
            setSummary(null);
            return;
        }
        if (currentDay && id === currentDay.id.toString()) {
            setSelectedDay(currentDay);
            return;
        }
        const day = businessDays.find(d => d.id.toString() === id);
        setSelectedDay(day || null);
    }

    // ── Save new category ──
    async function handleSaveCat() {
        if (!newCatName.trim()) return;
        setSavingCat(true);
        try {
            const res = await apiClient.post('/expenses/categories', {
                name: newCatName.trim(),
                nameAr: newCatAr.trim() || newCatName.trim(),
                color: '#6366f1',
                icon: 'Wallet',
            });
            const created: ExpenseCategory = res.data;
            setCategories(prev => [...prev, created]);
            setForm(f => ({ ...f, categoryId: String(created.id) }));
            setShowNewCat(false);
            setNewCatName('');
            setNewCatAr('');
        } catch (e: any) {
            alert(e?.response?.data?.message || 'فشل في إنشاء التصنيف');
        } finally {
            setSavingCat(false);
        }
    }

    // ── Save transaction ──
    async function handleSave() {
        if (!form.amount || parseFloat(form.amount) <= 0) {
            setSaveError('أدخل مبلغاً صحيحاً');
            return;
        }
        if (form.entryType === 'EXPENSE' && !form.categoryId) {
            setSaveError('اختر تصنيف المصروف');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            if (form.entryType === 'EXPENSE') {
                await apiClient.post('/expenses', {
                    categoryId: parseInt(form.categoryId),
                    amount: parseFloat(form.amount),
                    description: form.description || 'إدخال من يومية الصندوق',
                    expenseDate: new Date().toISOString(), // exact timestamp — never midnight
                    paymentMethod: form.paymentMethod,
                    notes: form.notes,
                    isRecurring: false,
                });
            } else {
                await apiClient.post('/treasury/transactions', {
                    type: 'INCOME',
                    amount: parseFloat(form.amount),
                    paymentMethod: form.paymentMethod,
                    purpose: form.description || 'وارد — يومية الصندوق',
                    notes: form.notes,
                    // No transactionDate sent — backend always uses new Date() so the
                    // transaction is correctly placed inside the current business day
                });
            }
            setForm({ ...EMPTY_FORM });
            setShowForm(false);
            fetchDayData();
        } catch (e: any) {
            setSaveError(e?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    }

    const filtered = typeFilter
        ? transactions.filter(t => t.type === typeFilter)
        : transactions;
    const sorted = [...filtered].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return (
        <div style={{ direction: 'rtl', padding: '24px', fontFamily: 'inherit', maxWidth: '1200px', margin: '0 auto' }}>

            {/* ─── Header ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarDays size={26} color="#6366f1" />
                        يومية الصندوق
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
                        عرض الوارد والصادر المرتبط بالخزينة لكل يوم عمل
                    </p>
                    {!isAdmin && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            marginTop: '6px', background: '#eff6ff', color: '#2563eb',
                            border: '1px solid #bfdbfe', borderRadius: '20px',
                            padding: '3px 12px', fontSize: '12px', fontWeight: '600',
                        }}>
                            👤 تعرض حركاتك أنت فقط — {currentUser?.fullName || currentUser?.username}
                        </span>
                    )}
                </div>

                {/* Day selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                        value={businessDayId}
                        onChange={e => handleDayChange(e.target.value)}
                        style={{
                            padding: '10px 16px', borderRadius: '10px', fontFamily: 'inherit',
                            border: businessDayId !== 'ALL' ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                            fontSize: '14px', color: '#1e293b', background: '#fff',
                            minWidth: '280px',
                        }}
                    >
                        <option value="ALL">— اختر يوم عمل —</option>
                        {currentDay && (
                            <option value={currentDay.id.toString()}>
                                🟢 يوم #{currentDay.id} — {new Date(currentDay.openedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} (جارٍ الآن)
                            </option>
                        )}
                        {businessDays.filter(d => d.status === 'CLOSED').map(d => (
                            <option key={d.id} value={d.id.toString()}>
                                يوم #{d.id} — {new Date(d.openedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                    {selectedDay && (
                        <button
                            onClick={fetchDayData}
                            style={{ padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            title="تحديث"
                        >
                            <RefreshCw size={16} color="#64748b" />
                        </button>
                    )}
                    {selectedDay && (
                        <button
                            onClick={() => { setShowForm(true); setSaveError(''); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontFamily: 'inherit', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                        >
                            <Plus size={16} /> تسجيل حركة
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Empty state ─── */}
            {!selectedDay && (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                    <CalendarDays size={56} style={{ opacity: 0.25, margin: '0 auto 16px', display: 'block' }} />
                    <p style={{ fontSize: '16px', fontWeight: '500' }}>اختر يوم عمل لعرض يومية الصندوق</p>
                    <p style={{ fontSize: '13px', marginTop: '6px' }}>ستظهر جميع حركات الوارد والصادر المرتبطة بالخزينة</p>
                </div>
            )}

            {selectedDay && (
                <>
                    {/* ─── Day Info Bar ─── */}
                    <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                        padding: '14px 20px', marginBottom: '20px',
                        display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', fontSize: '13px', color: '#475569',
                    }}>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>📅 {formatDate(selectedDay.openedAt)}</span>
                        <span>⏰ فتح: {formatTime(selectedDay.openedAt)}</span>
                        {selectedDay.closedAt && <span>⏹ إغلاق: {formatTime(selectedDay.closedAt)}</span>}
                        <span>⏱ المدة: {calcDuration(selectedDay.openedAt, selectedDay.closedAt)}</span>
                        {selectedDay.opener && <span>👤 {selectedDay.opener.fullName}</span>}
                        <span style={{
                            marginRight: 'auto',
                            fontWeight: '700', padding: '4px 12px', borderRadius: '20px',
                            background: selectedDay.status === 'OPEN' ? '#dcfce7' : '#f1f5f9',
                            color: selectedDay.status === 'OPEN' ? '#16a34a' : '#64748b',
                        }}>
                            {selectedDay.status === 'OPEN' ? '🟢 يوم مفتوح' : '⬛ يوم مغلق'}
                        </span>
                    </div>

                    {/* ─── Entry Form ─── */}
                    {showForm && (
                        <div style={{ background: 'white', border: '2px solid #6366f1', borderRadius: '14px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(99,102,241,0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>تسجيل حركة جديدة</h3>
                                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                            </div>

                            {/* Type toggle */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                {(['EXPENSE', 'INCOME'] as const).map(t => (
                                    <button key={t} onClick={() => setForm(f => ({ ...f, entryType: t, categoryId: '' }))} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', fontFamily: 'inherit', fontWeight: '700', fontSize: '15px', cursor: 'pointer', background: form.entryType === t ? (t === 'INCOME' ? '#16a34a' : '#dc2626') : '#f1f5f9', color: form.entryType === t ? 'white' : '#64748b', transition: 'all 0.15s' }}>
                                        {t === 'INCOME' ? '↑ وارد (دخل)' : '↓ صادر (مصروف)'}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {/* Amount */}
                                <div>
                                    <label style={LBL}>المبلغ (ج)</label>
                                    <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={INP} />
                                </div>
                                {/* Payment method */}
                                <div>
                                    <label style={LBL}>وسيلة الدفع</label>
                                    <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} style={INP}>
                                        {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                {/* Category (EXPENSE only) */}
                                {form.entryType === 'EXPENSE' && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={LBL}>تصنيف المصروف</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} style={{ ...INP, flex: 1 }}>
                                                <option value="">— اختر تصنيف —</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>)}
                                            </select>
                                            <button onClick={() => setShowNewCat(v => !v)} title="إضافة تصنيف جديد" style={{ padding: '0 14px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontFamily: 'inherit', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                <Tag size={14} /> تصنيف جديد
                                            </button>
                                        </div>
                                        {/* Inline new category */}
                                        {showNewCat && (
                                            <div style={{ marginTop: '10px', background: '#f8fafc', border: '1.5px dashed #c7d2fe', borderRadius: '10px', padding: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                                <div style={{ flex: '0 0 180px' }}>
                                                    <label style={{ ...LBL, fontSize: '11px' }}>اسم التصنيف (عربي)</label>
                                                    <input value={newCatAr} onChange={e => setNewCatAr(e.target.value)} placeholder="مثال: تلاجة" style={{ ...INP, padding: '7px 10px', fontSize: '13px' }} />
                                                </div>
                                                <div style={{ flex: '0 0 180px' }}>
                                                    <label style={{ ...LBL, fontSize: '11px' }}>اسم التصنيف (English)</label>
                                                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Fridge" style={{ ...INP, padding: '7px 10px', fontSize: '13px' }} />
                                                </div>
                                                <button onClick={handleSaveCat} disabled={savingCat || !newCatName.trim()} style={{ padding: '9px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', opacity: savingCat || !newCatName.trim() ? 0.6 : 1 }}>
                                                    <Check size={14} /> حفظ
                                                </button>
                                                <button onClick={() => setShowNewCat(false)} style={{ padding: '9px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Description */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={LBL}>{form.entryType === 'EXPENSE' ? 'الوصف' : 'غرض الإيداع'}</label>
                                    <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={form.entryType === 'EXPENSE' ? 'مثال: شراء مستلزمات مكتبية' : 'مثال: إيداع نقدي من المبيعات'} style={INP} />
                                </div>
                                {/* Notes */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={LBL}>ملاحظات (اختياري)</label>
                                    <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={INP} />
                                </div>
                            </div>

                            {saveError && (
                                <div style={{ marginTop: '12px', background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                                    {saveError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button onClick={handleSave} disabled={saving} style={{ padding: '11px 28px', background: form.entryType === 'INCOME' ? '#16a34a' : '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontFamily: 'inherit', fontWeight: '700', fontSize: '14px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Check size={16} />
                                    {saving ? 'جارٍ الحفظ...' : (form.entryType === 'INCOME' ? 'تسجيل وارد' : 'تسجيل مصروف')}
                                </button>
                                <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setSaveError(''); }} style={{ padding: '11px 20px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontFamily: 'inherit', color: '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Summary Cards ─── */}
                    {summary && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            {/* Total IN */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                border: '1.5px solid #86efac', borderRadius: '14px', padding: '22px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', background: '#16a34a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowUpRight size={20} color="white" />
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>إجمالي الوارد</span>
                                </div>
                                <p style={{ fontSize: '30px', fontWeight: '900', color: '#15803d', margin: 0 }}>
                                    {fmt(summary.totalIncome)}
                                    <span style={{ fontSize: '16px', fontWeight: '500', marginRight: '4px' }}>ج</span>
                                </p>
                            </div>

                            {/* Total OUT */}
                            <div style={{
                                background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                border: '1.5px solid #fca5a5', borderRadius: '14px', padding: '22px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', background: '#dc2626', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowDownLeft size={20} color="white" />
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>إجمالي الصادر</span>
                                </div>
                                <p style={{ fontSize: '30px', fontWeight: '900', color: '#dc2626', margin: 0 }}>
                                    {fmt(summary.totalExpense)}
                                    <span style={{ fontSize: '16px', fontWeight: '500', marginRight: '4px' }}>ج</span>
                                </p>
                            </div>

                            {/* Net Balance */}
                            <div style={{
                                background: summary.netBalance >= 0
                                    ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                                    : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                border: `1.5px solid ${summary.netBalance >= 0 ? '#93c5fd' : '#fca5a5'}`,
                                borderRadius: '14px', padding: '22px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: summary.netBalance >= 0 ? '#2563eb' : '#dc2626',
                                    }}>
                                        <DollarSign size={20} color="white" />
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: summary.netBalance >= 0 ? '#1e40af' : '#991b1b' }}>
                                        صافي اليوم
                                    </span>
                                </div>
                                <p style={{ fontSize: '30px', fontWeight: '900', color: summary.netBalance >= 0 ? '#1d4ed8' : '#dc2626', margin: 0 }}>
                                    {summary.netBalance >= 0 ? '+' : ''}{fmt(summary.netBalance)}
                                    <span style={{ fontSize: '16px', fontWeight: '500', marginRight: '4px' }}>ج</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── Type Filter Bar ─── */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {(['', 'INCOME', 'EXPENSE'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                style={{
                                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                                    fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                                    background: typeFilter === t
                                        ? (t === 'INCOME' ? '#16a34a' : t === 'EXPENSE' ? '#dc2626' : '#6366f1')
                                        : '#f1f5f9',
                                    color: typeFilter === t ? 'white' : '#475569',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {t === '' && 'الكل'}
                                {t === 'INCOME' && '↑ الوارد'}
                                {t === 'EXPENSE' && '↓ الصادر'}
                                {t !== '' && summary && (
                                    <span style={{ marginRight: '6px', opacity: 0.85, fontSize: '12px' }}>
                                        ({fmt(t === 'INCOME' ? summary.totalIncome : summary.totalExpense)} ج)
                                    </span>
                                )}
                            </button>
                        ))}
                        <span style={{ marginRight: 'auto', fontSize: '13px', color: '#94a3b8' }}>
                            {sorted.length} حركة
                        </span>
                    </div>

                    {/* ─── Transactions Table ─── */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
                            جارٍ التحميل...
                        </div>
                    ) : sorted.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', color: '#94a3b8' }}>
                            <Receipt size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                            <p>لا توجد حركات في هذا اليوم</p>
                        </div>
                    ) : (
                        <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <th style={TH}>الوقت</th>
                                        <th style={TH}>البيان / الغرض</th>
                                        <th style={TH}>المصدر</th>
                                        <th style={TH}>وسيلة الدفع</th>
                                        <th style={TH}>الاتجاه</th>
                                        <th style={{ ...TH, textAlign: 'left' }}>المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((tx, i) => (
                                        <tr
                                            key={tx.id}
                                            style={{
                                                background: i % 2 === 0 ? 'white' : '#fafafa',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}
                                        >
                                            <td style={TD}>
                                                <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                    {formatTime(tx.date)}
                                                </span>
                                            </td>
                                            <td style={TD}>
                                                <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px' }}>
                                                    {tx.purpose}
                                                </div>
                                                {tx.notes && (
                                                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                                        {tx.notes}
                                                    </div>
                                                )}
                                                {tx.user && (
                                                    <div style={{ fontSize: '11px', color: '#a5b4fc', marginTop: '1px' }}>
                                                        {tx.user}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={TD}>
                                                <SourceBadge source={tx.sourceType} />
                                            </td>
                                            <td style={TD}>
                                                <MethodBadge method={tx.paymentMethod} />
                                            </td>
                                            <td style={TD}>
                                                {tx.type === 'INCOME' ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        padding: '5px 12px', borderRadius: '8px',
                                                        background: '#f0fdf4', color: '#16a34a',
                                                        fontSize: '12px', fontWeight: '700',
                                                    }}>
                                                        <ArrowUpRight size={13} /> وارد
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        padding: '5px 12px', borderRadius: '8px',
                                                        background: '#fef2f2', color: '#dc2626',
                                                        fontSize: '12px', fontWeight: '700',
                                                    }}>
                                                        <ArrowDownLeft size={13} /> صادر
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ ...TD, textAlign: 'left' }}>
                                                <span style={{
                                                    fontSize: '16px', fontWeight: '800',
                                                    color: tx.type === 'INCOME' ? '#16a34a' : '#dc2626',
                                                }}>
                                                    {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)} ج
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* ─── Footer totals ─── */}
                                <tfoot>
                                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                        <td colSpan={5} style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '700', color: '#374151', textAlign: 'right' }}>
                                            {typeFilter === '' && 'صافي اليوم'}
                                            {typeFilter === 'INCOME' && 'إجمالي الوارد'}
                                            {typeFilter === 'EXPENSE' && 'إجمالي الصادر'}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                                            {typeFilter === '' && summary ? (
                                                <span style={{
                                                    fontSize: '18px', fontWeight: '900',
                                                    color: summary.netBalance >= 0 ? '#1d4ed8' : '#dc2626',
                                                }}>
                                                    {summary.netBalance >= 0 ? '+' : ''}{fmt(summary.netBalance)} ج
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: '18px', fontWeight: '900',
                                                    color: typeFilter === 'INCOME' ? '#16a34a' : '#dc2626',
                                                }}>
                                                    {typeFilter === 'INCOME' ? '+' : '-'}
                                                    {fmt(sorted.reduce((s, t) => s + t.amount, 0))} ج
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Style constants ──────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'right',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
    padding: '13px 16px',
    textAlign: 'right',
    verticalAlign: 'middle',
};

const LBL: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
};

const INP: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#1e293b',
    background: 'white',
    boxSizing: 'border-box',
};
