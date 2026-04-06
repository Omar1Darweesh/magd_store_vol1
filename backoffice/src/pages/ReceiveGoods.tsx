import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/client';
import { Plus, Trash2, Save, Search, X, Package, AlertCircle, CheckCircle2, History, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const PAYMENT_TERMS = [
    { value: 'CASH', label: 'كاش', subLabel: 'Cash', days: 0, color: '#16a34a', bg: '#dcfce7', border: '#16a34a' },
    { value: 'DAYS_15', label: 'آجل 15 يوم', subLabel: 'Net 15', days: 15, color: '#d97706', bg: '#fef3c7', border: '#d97706' },
    { value: 'DAYS_30', label: 'آجل 30 يوم', subLabel: 'Net 30', days: 30, color: '#ea580c', bg: '#ffedd5', border: '#ea580c' },
    { value: 'DAYS_60', label: 'آجل 60 يوم', subLabel: 'Net 60', days: 60, color: '#dc2626', bg: '#fee2e2', border: '#dc2626' },
];

function calcDueDate(days: number): string | null {
    if (days === 0) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface GRNLine {
    productId: number; productName: string; productCode: string;
    barcode: string; currentStock: number; qty: number; cost: number;
}

export default function ReceiveGoods() {
    // ── Tab state ──
    const [tab, setTab] = useState<'new' | 'history'>('new');

    // ── New GRN state ──
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [lines, setLines] = useState<GRNLine[]>([]);
    const [supplierId, setSupplierId] = useState('');
    const [paymentTerm, setPaymentTerm] = useState('CASH');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [taxRate, setTaxRate] = useState(15);
    const [notes, setNotes] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [successGrn, setSuccessGrn] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    // ── GRN History state ──
    const [grns, setGrns] = useState<any[]>([]);
    const [grnTotal, setGrnTotal] = useState(0);
    const [grnPage, setGrnPage] = useState(1);
    const [grnLoading, setGrnLoading] = useState(false);
    const [grnDetail, setGrnDetail] = useState<any | null>(null);
    const [grnDetailLoading, setGrnDetailLoading] = useState(false);
    const GRN_PAGE_SIZE = 20;

    const activeTerm = PAYMENT_TERMS.find(t => t.value === paymentTerm) || PAYMENT_TERMS[0];
    const dueDate = calcDueDate(activeTerm.days);
    const subtotal = lines.reduce((s, l) => s + l.qty * l.cost, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    const results = searchTerm.length >= 1 ? products.filter(p => {
        const q = searchTerm.toLowerCase();
        return p.nameAr?.includes(searchTerm) || p.nameEn?.toLowerCase().includes(q) || p.barcode?.includes(searchTerm) || p.code?.toLowerCase().includes(q);
    }).slice(0, 12) : [];

    const fetchGRNs = useCallback(async (page: number) => {
        setGrnLoading(true);
        try {
            const skip = (page - 1) * GRN_PAGE_SIZE;
            const { data } = await apiClient.get(`/purchasing/grn?skip=${skip}&take=${GRN_PAGE_SIZE}`);
            setGrns(data.data || []);
            setGrnTotal(data.total || 0);
        } catch { /* silent */ }
        finally { setGrnLoading(false); }
    }, [GRN_PAGE_SIZE]);

    useEffect(() => {
        if (tab === 'history') fetchGRNs(grnPage);
    }, [tab, grnPage, fetchGRNs]);

    const openGrnDetail = async (id: number) => {
        setGrnDetailLoading(true);
        setGrnDetail(null);
        try {
            const { data } = await apiClient.get(`/purchasing/grn/${id}`);
            setGrnDetail(data);
        } catch { /* silent */ }
        finally { setGrnDetailLoading(false); }
    };

    useEffect(() => {
        Promise.all([
            apiClient.get('/purchasing/suppliers?active=true'),
            apiClient.get('/products?active=true&take=2000'),
        ]).then(([s, p]) => { setSuppliers(s.data.data); setProducts(p.data.data); })
            .catch(console.error);
    }, []);

    const addProduct = (product: any) => {
        const idx = lines.findIndex(l => l.productId === product.id);
        if (idx >= 0) {
            const next = [...lines];
            next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
            setLines(next);
        } else {
            setLines([...lines, {
                productId: product.id, productName: product.nameAr || product.nameEn,
                productCode: product.code || '', barcode: product.barcode || '',
                currentStock: product.stock || 0, qty: 1,
                cost: Number(product.costAvg || product.cost || 0),
            }]);
        }
        setShowModal(false);
        setSearchTerm('');
    };

    const updateLine = (i: number, field: 'qty' | 'cost', val: string) => {
        const next = [...lines];
        next[i] = { ...next[i], [field]: parseFloat(val) || 0 };
        setLines(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) return alert('الرجاء اختيار المورد');
        if (lines.length === 0) return alert('الرجاء إضافة منتجات');
        setLoading(true);
        try {
            const payload = {
                branchId: 1, supplierId: parseInt(supplierId), paymentTerm, taxRate,
                notes,
                ...(paymentTerm === 'CASH' ? { paymentMethod } : {}),
                lines: lines.map(l => ({ productId: l.productId, qty: l.qty, cost: l.cost })),
            };
            const { data } = await apiClient.post('/purchasing/grn', payload);
            setSuccessGrn(data.grnNumber || 'تم');
            setLines([]); setSupplierId(''); setNotes(''); setPaymentMethod('CASH');
            // Refresh history cache so new GRN appears immediately if user switches tab
            fetchGRNs(1); setGrnPage(1);
            setTimeout(() => setSuccessGrn(null), 5000);
        } catch { alert('فشل الحفظ'); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ padding: '2rem' }}>
            {/* ── Tab Bar ── */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
                {([
                    { key: 'new', label: 'استلام جديد', icon: <Plus size={15} /> },
                    { key: 'history', label: 'سجل الاستلام', icon: <History size={15} /> },
                ] as { key: 'new' | 'history'; label: string; icon: React.ReactNode }[]).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '11px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                            border: 'none', background: 'none', fontFamily: 'inherit',
                            borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
                            color: tab === t.key ? '#6366f1' : '#64748b',
                            marginBottom: '-2px',
                            display: 'flex', alignItems: 'center', gap: '7px',
                        }}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {tab === 'new' && (<>
                {/* Success banner */}
                {successGrn && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px' }}>
                        <CheckCircle2 size={22} color="#16a34a" />
                        <div>
                            <div style={{ fontWeight: 700, color: '#166534' }}>تم حفظ إذن الاستلام بنجاح</div>
                            <div style={{ fontSize: '13px', color: '#16a34a' }}>رقم الإذن: <strong>{successGrn}</strong></div>
                        </div>
                        <button onClick={() => setSuccessGrn(null)} style={{ marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}><X size={18} /></button>
                    </div>
                )}

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ margin: 0 }}>استلام بضاعة</h1>
                </header>

                <form onSubmit={handleSubmit}>
                    {/* ── Section 1: details ── */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700, color: '#374151' }}>بيانات الإذن</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>المورد <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="input-field" value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                                    <option value="">اختر المورد...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.phone ? ` — ${s.phone}` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>نسبة الضريبة (%)</label>
                                <input className="input-field" type="number" value={taxRate} min={0} max={100} step={0.5} onChange={e => setTaxRate(Number(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>ملاحظات</label>
                                <input className="input-field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." />
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: Payment type ── */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#374151' }}>طريقة الدفع</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            {PAYMENT_TERMS.map(t => {
                                const active = paymentTerm === t.value;
                                return (
                                    <button key={t.value} type="button" onClick={() => setPaymentTerm(t.value)}
                                        style={{
                                            padding: '14px 10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                            border: active ? `2px solid ${t.border}` : '1px solid #e2e8f0',
                                            background: active ? t.bg : 'white', fontFamily: 'inherit',
                                            transition: 'all 0.15s',
                                        }}>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: active ? t.color : '#374151' }}>{t.label}</div>
                                        <div style={{ fontSize: '12px', color: active ? t.color : '#9ca3af', marginTop: '2px' }}>{t.subLabel}</div>
                                        {active && t.days === 0 && <div style={{ marginTop: '6px', fontSize: '11px', color: t.color, fontWeight: 700 }}>دفع فوري ✓</div>}
                                        {active && dueDate && <div style={{ marginTop: '6px', fontSize: '11px', color: t.color, fontWeight: 600 }}>استحقاق: {dueDate}</div>}
                                    </button>
                                );
                            })}
                        </div>
                        {paymentTerm === 'CASH' && (
                            <div style={{ marginTop: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>وسيلة الدفع</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { value: 'CASH', label: 'كاش', color: '#16a34a', bg: '#dcfce7' },
                                        { value: 'WALLET', label: 'محفظة', color: '#0891b2', bg: '#cffafe' },
                                        { value: 'INSTAPAY', label: 'انستاباي', color: '#db2777', bg: '#fce7f3' },
                                        { value: 'TRANSFER', label: 'تحويل', color: '#7c3aed', bg: '#ede9fe' },
                                        { value: 'CARD', label: 'بطاقة', color: '#2563eb', bg: '#dbeafe' },
                                        { value: 'FAWRY', label: 'فوري', color: '#ea580c', bg: '#ffedd5' },
                                    ].map(m => (
                                        <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                                            style={{
                                                padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                                                border: paymentMethod === m.value ? `2px solid ${m.color}` : '1.5px solid #e2e8f0',
                                                background: paymentMethod === m.value ? m.bg : '#fff',
                                                color: paymentMethod === m.value ? m.color : '#64748b',
                                                fontFamily: 'inherit',
                                            }}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {paymentTerm !== 'CASH' && (
                            <div style={{ marginTop: '12px', padding: '10px 14px', background: activeTerm.bg, borderRadius: '8px', fontSize: '13px', color: activeTerm.color, fontWeight: 600 }}>
                                ⚠️ فاتورة آجلة — تاريخ الاستحقاق: {dueDate}. تذكر تسجيل الدفع عند السداد.
                            </div>
                        )}
                    </div>

                    {/* ── Section 3: Products ── */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#374151' }}>الأصناف ({lines.length})</h3>
                            <button type="button" className="btn btn-primary" onClick={() => { setSearchTerm(''); setShowModal(true); }}>
                                <Plus size={16} /> إضافة صنف
                            </button>
                        </div>

                        {lines.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '10px', border: '2px dashed #e2e8f0' }}>
                                <Package size={40} color="#cbd5e1" style={{ display: 'block', margin: '0 auto 10px' }} />
                                <div style={{ color: '#94a3b8' }}>لم يتم إضافة أي أصناف — اضغط على "إضافة صنف"</div>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>الصنف</th>
                                            <th style={{ textAlign: 'center', width: '90px' }}>المخزون</th>
                                            <th style={{ width: '110px' }}>الكمية</th>
                                            <th style={{ width: '130px' }}>التكلفة / وحدة</th>
                                            <th style={{ textAlign: 'center', width: '120px' }}>الإجمالي</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{line.productName}</div>
                                                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{line.barcode} {line.productCode && `| ${line.productCode}`}</div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                                        background: line.currentStock > 10 ? '#dcfce7' : line.currentStock > 0 ? '#fef3c7' : '#fee2e2',
                                                        color: line.currentStock > 10 ? '#16a34a' : line.currentStock > 0 ? '#d97706' : '#dc2626',
                                                    }}>
                                                        {line.currentStock}
                                                    </span>
                                                </td>
                                                <td>
                                                    <input type="number" min="1" value={line.qty} onChange={e => updateLine(i, 'qty', e.target.value)}
                                                        style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit' }}
                                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                                                </td>
                                                <td>
                                                    <input type="number" min="0" step="0.01" value={line.cost} onChange={e => updateLine(i, 'cost', e.target.value)}
                                                        style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit' }}
                                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                                                    {(line.qty * line.cost).toFixed(2)} ر.س
                                                </td>
                                                <td>
                                                    <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: '6px' }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Section 4: Totals + Submit ── */}
                    {lines.length > 0 && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>عدد الأصناف</div>
                                        <div style={{ fontSize: '22px', fontWeight: 800 }}>{lines.length}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>إجمالي الكمية</div>
                                        <div style={{ fontSize: '22px', fontWeight: 800 }}>{lines.reduce((s, l) => s + l.qty, 0)}</div>
                                    </div>
                                </div>
                                <div style={{ minWidth: '300px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                        <span style={{ color: '#64748b' }}>المجموع الفرعي</span>
                                        <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} ر.س</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                                        <span style={{ color: '#64748b' }}>الضريبة ({taxRate}%)</span>
                                        <span style={{ fontWeight: 600 }}>{taxAmount.toFixed(2)} ر.س</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '12px', fontSize: '18px' }}>
                                        <span style={{ fontWeight: 700 }}>الإجمالي النهائي</span>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{total.toFixed(2)} ر.س</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn"
                                    style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}
                                    onClick={() => { if (confirm('إلغاء وحذف جميع البيانات؟')) { setLines([]); setSupplierId(''); setNotes(''); } }}>
                                    إلغاء
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    <Save size={16} /> {loading ? 'جاري الحفظ...' : 'حفظ إذن الاستلام'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {/* ── Search Modal ── */}
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                        onClick={() => setShowModal(false)}>
                        <div className="card" style={{ width: '660px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
                            onClick={e => e.stopPropagation()}>
                            {/* Modal header */}
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>إضافة صنف</h3>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                            </div>
                            {/* Search input */}
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    <input ref={searchRef} autoFocus type="text" className="input-field" style={{ paddingRight: '36px' }}
                                        placeholder="ابحث باسم المنتج أو الباركود أو الكود..."
                                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => e.key === 'Escape' && setShowModal(false)} />
                                </div>
                            </div>
                            {/* Results */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {results.length > 0 ? results.map(p => (
                                    <div key={p.id} onClick={() => addProduct(p)}
                                        style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.nameAr || p.nameEn}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                                                {p.barcode || 'لا يوجد باركود'} {p.code && `| ${p.code}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                                background: p.stock > 10 ? '#dcfce7' : p.stock > 0 ? '#fef3c7' : '#fee2e2',
                                                color: p.stock > 10 ? '#16a34a' : p.stock > 0 ? '#d97706' : '#dc2626',
                                            }}>مخزون: {p.stock || 0}</span>
                                            <span style={{ fontWeight: 700, color: '#374151', fontSize: '15px' }}>{Number(p.costAvg || p.cost || 0).toFixed(2)} ر.س</span>
                                            <span className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '13px' }}>إضافة</span>
                                        </div>
                                    </div>
                                )) : searchTerm.length >= 1 ? (
                                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                                        <AlertCircle size={36} color="#e2e8f0" style={{ display: 'block', margin: '0 auto 10px' }} />
                                        لا توجد نتائج لـ "{searchTerm}"
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>اكتب للبحث عن منتج...</div>
                                )}
                            </div>
                            <div style={{ padding: '10px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                <span>💡 يمكنك البحث بالباركود مباشرة</span>
                                <span>ESC للإغلاق</span>
                            </div>
                        </div>
                    </div>
                )}
            </>)}

            {/* ── GRN History Tab ── */}
            {tab === 'history' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h1 style={{ margin: 0 }}>سجل أذونات الاستلام</h1>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>{grnTotal} إذن</span>
                    </div>

                    {grnLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#94a3b8' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : grns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                            <Package size={48} color="#e2e8f0" style={{ display: 'block', margin: '0 auto 12px' }} />
                            <p style={{ fontSize: '16px' }}>لا توجد أذونات استلام بعد</p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>رقم الإذن</th>
                                            <th>المورد</th>
                                            <th>الفرع</th>
                                            <th>طريقة الدفع</th>
                                            <th style={{ textAlign: 'center' }}>الإجمالي</th>
                                            <th>التاريخ</th>
                                            <th style={{ width: '60px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grns.map(grn => {
                                            const termCfg = PAYMENT_TERMS.find(t => t.value === grn.paymentTerm) || PAYMENT_TERMS[0];
                                            return (
                                                <tr key={grn.id}
                                                    style={{ cursor: 'pointer' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                                    <td>
                                                        <span style={{ fontWeight: 700, color: '#6366f1', fontFamily: 'monospace' }}>{grn.grnNo}</span>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{grn.supplier?.name || '—'}</td>
                                                    <td style={{ color: '#64748b', fontSize: '13px' }}>{grn.branch?.name || '—'}</td>
                                                    <td>
                                                        <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: termCfg.bg, color: termCfg.color }}>
                                                            {termCfg.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                                                        {Number(grn.total).toFixed(2)} ج
                                                    </td>
                                                    <td style={{ color: '#64748b', fontSize: '13px' }}>
                                                        {new Date(grn.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </td>
                                                    <td>
                                                        <button onClick={() => openGrnDetail(grn.id)}
                                                            style={{ background: '#eef2ff', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                                                            <Eye size={14} /> عرض
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {grnTotal > GRN_PAGE_SIZE && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', marginTop: '20px' }}>
                            <button onClick={() => setGrnPage(p => Math.max(1, p - 1))} disabled={grnPage === 1}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: grnPage === 1 ? 'default' : 'pointer', opacity: grnPage === 1 ? 0.5 : 1 }}>
                                <ChevronRight size={16} />
                            </button>
                            <span style={{ fontSize: '14px', color: '#64748b' }}>
                                صفحة {grnPage} من {Math.ceil(grnTotal / GRN_PAGE_SIZE)}
                            </span>
                            <button onClick={() => setGrnPage(p => p + 1)} disabled={grnPage >= Math.ceil(grnTotal / GRN_PAGE_SIZE)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: grnPage >= Math.ceil(grnTotal / GRN_PAGE_SIZE) ? 'default' : 'pointer', opacity: grnPage >= Math.ceil(grnTotal / GRN_PAGE_SIZE) ? 0.5 : 1 }}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    )}

                    {/* GRN Detail Modal */}
                    {(grnDetail || grnDetailLoading) && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
                            onClick={() => setGrnDetail(null)}>
                            <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                                onClick={e => e.stopPropagation()}>
                                {/* Modal header */}
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                                            {grnDetail ? grnDetail.grnNo : 'جارٍ التحميل...'}
                                        </h3>
                                        {grnDetail && (
                                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                                                {grnDetail.supplier?.name} — {new Date(grnDetail.createdAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => setGrnDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                                </div>
                                {/* Modal body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                                    {grnDetailLoading ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#94a3b8' }}>
                                            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                                        </div>
                                    ) : grnDetail ? (
                                        <>
                                            {/* Summary row */}
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                                {[
                                                    { label: 'المجموع الفرعي', value: `${Number(grnDetail.subtotal).toFixed(2)} ج` },
                                                    { label: `ضريبة (${grnDetail.taxRate}%)`, value: `${Number(grnDetail.taxAmount).toFixed(2)} ج` },
                                                    { label: 'الإجمالي', value: `${Number(grnDetail.total).toFixed(2)} ج`, highlight: true },
                                                ].map(item => (
                                                    <div key={item.label} style={{ flex: '1 1 140px', background: item.highlight ? '#eef2ff' : '#f8fafc', border: `1px solid ${item.highlight ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: '8px', padding: '12px 16px' }}>
                                                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b' }}>{item.label}</p>
                                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: item.highlight ? '#6366f1' : '#1e293b' }}>{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {grnDetail.notes && (
                                                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#713f12' }}>
                                                    ملاحظات: {grnDetail.notes}
                                                </div>
                                            )}
                                            {/* Lines table */}
                                            <div className="table-container">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>المنتج</th>
                                                            <th style={{ textAlign: 'center', width: '80px' }}>الكمية</th>
                                                            <th style={{ textAlign: 'center', width: '110px' }}>التكلفة</th>
                                                            <th style={{ textAlign: 'center', width: '120px' }}>الإجمالي</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(grnDetail.lines || []).map((line: any) => (
                                                            <tr key={line.id}>
                                                                <td>
                                                                    <div style={{ fontWeight: 600 }}>{line.product?.nameAr || line.product?.nameEn || '—'}</div>
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{line.product?.barcode}</div>
                                                                </td>
                                                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{line.qty}</td>
                                                                <td style={{ textAlign: 'center' }}>{Number(line.cost).toFixed(2)} ج</td>
                                                                <td style={{ textAlign: 'center', fontWeight: 700 }}>{(line.qty * Number(line.cost)).toFixed(2)} ج</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
