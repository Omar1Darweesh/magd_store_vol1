import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Plus, Edit2, Trash2, Search, Clock, Eye } from 'lucide-react';
import SupplierAuditHistory from './SupplierAuditHistory';
import SupplierDetails from './SupplierDetails';

const PAYMENT_TERMS: Record<string, { label: string; color: string; bg: string }> = {
    CASH:    { label: 'كاش',        color: '#16a34a', bg: '#dcfce7' },
    DAYS_15: { label: 'آجل 15 يوم', color: '#d97706', bg: '#fef3c7' },
    DAYS_30: { label: 'آجل 30 يوم', color: '#ea580c', bg: '#ffedd5' },
    DAYS_60: { label: 'آجل 60 يوم', color: '#dc2626', bg: '#fee2e2' },
};

const TERM_OPTIONS = [
    { value: 'CASH',    label: 'كاش' },
    { value: 'DAYS_15', label: 'آجل 15 يوم' },
    { value: 'DAYS_30', label: 'آجل 30 يوم' },
    { value: 'DAYS_60', label: 'آجل 60 يوم' },
];

const empty = { name: '', contact: '', phone: '', email: '', address: '', paymentTerms: 'CASH' };

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const [historySupplier, setHistorySupplier] = useState<any>(null);
    const [detailsSupplier, setDetailsSupplier] = useState<any>(null);

    useEffect(() => { load(); }, [search]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/purchasing/suppliers?search=${search}`);
            setSuppliers(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true); };
    const openEdit = (s: any) => {
        setEditing(s);
        setForm({ name: s.name || '', contact: s.contact || '', phone: s.phone || '', email: s.email || '', address: s.address || '', paymentTerms: s.paymentTerms || 'CASH' });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) await apiClient.patch(`/purchasing/suppliers/${editing.id}`, form);
            else await apiClient.post('/purchasing/suppliers', form);
            setShowModal(false);
            load();
        } catch { alert('فشل حفظ المورد'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
        try { await apiClient.delete(`/purchasing/suppliers/${id}`); load(); }
        catch { alert('فشل حذف المورد'); }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>الموردون</h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input type="text" placeholder="بحث..." className="input-field" style={{ paddingRight: '36px', width: '220px' }}
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={18} /> إضافة مورد
                    </button>
                </div>
            </header>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>المورد</th>
                                <th>رقم الهاتف</th>
                                <th>العنوان</th>
                                <th style={{ textAlign: 'center' }}>شروط الدفع</th>
                                <th style={{ textAlign: 'center' }}>الحالة</th>
                                <th style={{ textAlign: 'center' }}>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>جاري التحميل...</td></tr>
                            ) : suppliers.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>لا يوجد موردون</td></tr>
                            ) : suppliers.map(s => {
                                const term = PAYMENT_TERMS[s.paymentTerms] || PAYMENT_TERMS.CASH;
                                return (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                                            {s.contact && <div style={{ fontSize: '12px', color: '#64748b' }}>{s.contact}</div>}
                                        </td>
                                        <td style={{ color: '#334155' }} dir="ltr">{s.phone || '—'}</td>
                                        <td style={{ color: '#64748b', fontSize: '13px' }}>{s.address || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: term.bg, color: term.color }}>
                                                {term.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                                background: s.active !== false ? '#dcfce7' : '#f1f5f9',
                                                color: s.active !== false ? '#16a34a' : '#94a3b8' }}>
                                                {s.active !== false ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button title="تفاصيل ومدفوعات" onClick={() => setDetailsSupplier(s)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '6px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Eye size={16} />
                                                </button>
                                                <button title="سجل النشاط" onClick={() => setHistorySupplier(s)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: '6px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Clock size={16} />
                                                </button>
                                                <button title="تعديل" onClick={() => openEdit(s)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button title="حذف" onClick={() => handleDelete(s.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
                        <h2 style={{ margin: '0 0 20px' }}>{editing ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>اسم المورد / الشركة *</label>
                                <input className="input-field" value={form.name} required placeholder="اسم الشركة أو المورد"
                                    onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>الشخص المسؤول</label>
                                    <input className="input-field" value={form.contact} placeholder="اسم المندوب"
                                        onChange={e => setForm({ ...form, contact: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>رقم الهاتف</label>
                                    <input className="input-field" value={form.phone} dir="ltr" placeholder="05xxxxxxxx"
                                        onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>البريد الإلكتروني</label>
                                <input className="input-field" value={form.email} dir="ltr" type="email" placeholder="email@example.com"
                                    onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>العنوان</label>
                                <input className="input-field" value={form.address} placeholder="المدينة، الحي..."
                                    onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '14px' }}>شروط الدفع الافتراضية</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {TERM_OPTIONS.map(opt => {
                                        const cfg = PAYMENT_TERMS[opt.value];
                                        const active = form.paymentTerms === opt.value;
                                        return (
                                            <button key={opt.value} type="button" onClick={() => setForm({ ...form, paymentTerms: opt.value })}
                                                style={{
                                                    padding: '10px 6px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                                    border: active ? `2px solid ${cfg.color}` : '1px solid #e2e8f0',
                                                    background: active ? cfg.bg : 'white',
                                                    fontWeight: active ? 700 : 500, fontSize: '13px',
                                                    color: active ? cfg.color : '#374151',
                                                    fontFamily: 'inherit',
                                                }}>
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}>
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {detailsSupplier && (
                <SupplierDetails supplier={detailsSupplier} onClose={() => setDetailsSupplier(null)} />
            )}

            {historySupplier && (
                <SupplierAuditHistory supplierId={historySupplier.id} supplierName={historySupplier.name} onClose={() => setHistorySupplier(null)} />
            )}
        </div>
    );
}
