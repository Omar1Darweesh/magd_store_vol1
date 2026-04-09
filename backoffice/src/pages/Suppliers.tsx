import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';
import {
    Plus, Edit2, Trash2, Search, Clock, Eye, Download, Filter,
    Users, UserCheck, UserX, Wallet, TrendingUp, ChevronLeft, ChevronRight,
    ToggleLeft, ToggleRight, RefreshCw, ArrowUpDown, X
} from 'lucide-react';
import SupplierAuditHistory from './SupplierAuditHistory';
import SupplierDetails from './SupplierDetails';

// Types
interface SupplierStats {
    totalSuppliers: number;
    activeSuppliers: number;
    inactiveSuppliers: number;
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    suppliersWithBalance: number;
}

interface SupplierWithBalance {
    id: number;
    name: string;
    contact: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    paymentTerms: string;
    active: boolean;
    createdAt: string;
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
    grnCount: number;
}

interface Filters {
    search: string;
    paymentTerms: string;
    active: string;
    balanceStatus: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

// Constants
const PAYMENT_TERMS: Record<string, { label: string; color: string; bg: string }> = {
    CASH: { label: 'كاش', color: '#16a34a', bg: '#dcfce7' },
    DAYS_15: { label: 'آجل 15 يوم', color: '#d97706', bg: '#fef3c7' },
    DAYS_30: { label: 'آجل 30 يوم', color: '#ea580c', bg: '#ffedd5' },
    DAYS_60: { label: 'آجل 60 يوم', color: '#dc2626', bg: '#fee2e2' },
    DAYS_CUSTOM: { label: 'آجل مخصص', color: '#7c3aed', bg: '#ede9fe' },
};

const TERM_OPTIONS = [
    { value: '', label: 'الكل' },
    { value: 'CASH', label: 'كاش' },
    { value: 'DAYS_15', label: 'آجل 15 يوم' },
    { value: 'DAYS_30', label: 'آجل 30 يوم' },
    { value: 'DAYS_60', label: 'آجل 60 يوم' },
    { value: 'DAYS_CUSTOM', label: 'آجل مخصص' },
];

const TERM_OPTIONS_MODAL = [
    { value: 'CASH', label: 'كاش' },
    { value: 'DAYS_15', label: 'آجل 15 يوم' },
    { value: 'DAYS_30', label: 'آجل 30 يوم' },
    { value: 'DAYS_60', label: 'آجل 60 يوم' },
    { value: 'DAYS_CUSTOM', label: 'آجل مخصص' },
];

const ACTIVE_OPTIONS = [
    { value: '', label: 'الكل' },
    { value: 'true', label: 'نشط' },
    { value: 'false', label: 'غير نشط' },
];

const BALANCE_OPTIONS = [
    { value: '', label: 'الكل' },
    { value: 'hasBalance', label: 'عليه رصيد' },
    { value: 'noBalance', label: 'بدون رصيد' },
];

const SORT_OPTIONS = [
    { value: 'createdAt', label: 'تاريخ الإضافة' },
    { value: 'name', label: 'الاسم' },
    { value: 'balance', label: 'الرصيد' },
];

const PAGE_SIZE = 20;
const emptyForm = { name: '', contact: '', phone: '', email: '', address: '', paymentTerms: 'CASH' };

// Helper functions
const fmt = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Stats Card Component
function StatCard({ icon, label, value, subValue, bg, iconColor, valueColor }: {
    icon: React.ReactNode; label: string; value: string | number; subValue?: string;
    bg: string; iconColor: string; valueColor?: string;
}) {
    return (
        <div style={{
            background: 'white', borderRadius: '12px', padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', gap: '16px',
        }}>
            <div style={{
                width: '52px', height: '52px', borderRadius: '12px', background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor,
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: valueColor || '#111827' }}>{value}</div>
                {subValue && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{subValue}</div>}
            </div>
        </div>
    );
}

export default function Suppliers() {
    // State
    const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
    const [stats, setStats] = useState<SupplierStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<Filters>({
        search: '', paymentTerms: '', active: '', balanceStatus: '', sortBy: 'createdAt', sortOrder: 'desc',
    });
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<SupplierWithBalance | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [historySupplier, setHistorySupplier] = useState<SupplierWithBalance | null>(null);
    const [detailsSupplier, setDetailsSupplier] = useState<SupplierWithBalance | null>(null);
    const [exporting, setExporting] = useState(false);

    // Load stats
    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const { data } = await apiClient.get('/purchasing/suppliers/stats');
            setStats(data);
        } catch (e) { console.error('Failed to load stats', e); }
        finally { setStatsLoading(false); }
    }, []);

    // Load suppliers with balance
    const loadSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('skip', String(page * PAGE_SIZE));
            params.append('take', String(PAGE_SIZE));
            if (filters.search) params.append('search', filters.search);
            if (filters.paymentTerms) params.append('paymentTerms', filters.paymentTerms);
            if (filters.active) params.append('active', filters.active);
            if (filters.balanceStatus) params.append('balanceStatus', filters.balanceStatus);
            if (filters.sortBy) params.append('sortBy', filters.sortBy);
            if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

            const { data } = await apiClient.get(`/purchasing/suppliers/with-balance?${params.toString()}`);
            setSuppliers(data.data || []);
            setTotal(data.total || 0);
        } catch (e) { console.error('Failed to load suppliers', e); }
        finally { setLoading(false); }
    }, [page, filters]);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

    // Handlers
    const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (s: SupplierWithBalance) => {
        setEditing(s);
        setForm({
            name: s.name || '', contact: s.contact || '', phone: s.phone || '',
            email: s.email || '', address: s.address || '', paymentTerms: s.paymentTerms || 'CASH',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) await apiClient.patch(`/purchasing/suppliers/${editing.id}`, form);
            else await apiClient.post('/purchasing/suppliers', form);
            setShowModal(false);
            loadSuppliers();
            loadStats();
        } catch { alert('فشل حفظ المورد'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
        try {
            await apiClient.delete(`/purchasing/suppliers/${id}`);
            loadSuppliers();
            loadStats();
        } catch { alert('فشل حذف المورد'); }
    };

    const handleToggleActive = async (s: SupplierWithBalance) => {
        setTogglingId(s.id);
        try {
            await apiClient.patch(`/purchasing/suppliers/${s.id}/toggle-active`);
            loadSuppliers();
            loadStats();
        } catch { alert('فشل تغيير حالة المورد'); }
        finally { setTogglingId(null); }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Load all suppliers for export
            const params = new URLSearchParams();
            params.append('take', '10000');
            if (filters.search) params.append('search', filters.search);
            if (filters.paymentTerms) params.append('paymentTerms', filters.paymentTerms);
            if (filters.active) params.append('active', filters.active);
            if (filters.balanceStatus) params.append('balanceStatus', filters.balanceStatus);

            const { data } = await apiClient.get(`/purchasing/suppliers/with-balance?${params.toString()}`);
            const allSuppliers: SupplierWithBalance[] = data.data || [];

            // Prepare Excel data
            const exportData = allSuppliers.map((s, i) => ({
                '#': i + 1,
                'اسم المورد': s.name,
                'الشخص المسؤول': s.contact || '',
                'رقم الهاتف': s.phone || '',
                'البريد الإلكتروني': s.email || '',
                'العنوان': s.address || '',
                'شروط الدفع': PAYMENT_TERMS[s.paymentTerms]?.label || s.paymentTerms,
                'الحالة': s.active ? 'نشط' : 'غير نشط',
                'إجمالي المشتريات': s.totalInvoiced,
                'إجمالي المدفوع': s.totalPaid,
                'الرصيد المستحق': s.balance,
                'عدد الفواتير': s.grnCount,
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'الموردون');

            // Auto-width columns
            const colWidths = Object.keys(exportData[0] || {}).map(key => ({
                wch: Math.max(key.length + 2, 15),
            }));
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `موردون_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e) {
            console.error('Export failed:', e);
            alert('فشل التصدير');
        } finally {
            setExporting(false);
        }
    };

    const resetFilters = () => {
        setFilters({ search: '', paymentTerms: '', active: '', balanceStatus: '', sortBy: 'createdAt', sortOrder: 'desc' });
        setPage(0);
    };

    const hasActiveFilters = filters.paymentTerms || filters.active || filters.balanceStatus;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#111827' }}>إدارة الموردين</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => { loadSuppliers(); loadStats(); }} className="btn"
                            style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={16} /> تحديث
                        </button>
                        <button onClick={handleExport} disabled={exporting} className="btn"
                            style={{ background: '#059669', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Download size={16} /> {exporting ? 'جاري التصدير...' : 'تصدير Excel'}
                        </button>
                        <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={18} /> إضافة مورد
                        </button>
                    </div>
                </div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                    إدارة بيانات الموردين ومتابعة الأرصدة والمدفوعات
                </p>
            </header>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {statsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', height: '92px', animation: 'pulse 1.5s infinite' }} />
                    ))
                ) : stats && (
                    <>
                        <StatCard icon={<Users size={24} />} label="إجمالي الموردين" value={stats.totalSuppliers}
                            subValue={`${stats.suppliersWithBalance} عليهم رصيد`} bg="#eef2ff" iconColor="#6366f1" />
                        <StatCard icon={<UserCheck size={24} />} label="موردون نشطون" value={stats.activeSuppliers}
                            bg="#f0fdf4" iconColor="#16a34a" />
                        <StatCard icon={<UserX size={24} />} label="موردون غير نشطين" value={stats.inactiveSuppliers}
                            bg="#fef2f2" iconColor="#dc2626" />
                        <StatCard icon={<TrendingUp size={24} />} label="إجمالي المشتريات" value={fmt(stats.totalInvoiced) + ' ر.س'}
                            bg="#fef3c7" iconColor="#d97706" />
                        <StatCard icon={<Wallet size={24} />} label="إجمالي المستحقات"
                            value={fmt(stats.totalBalance) + ' ر.س'}
                            subValue={`مدفوع: ${fmt(stats.totalPaid)} ر.س`}
                            bg={stats.totalBalance > 0 ? '#fef2f2' : '#f0fdf4'}
                            iconColor={stats.totalBalance > 0 ? '#dc2626' : '#16a34a'}
                            valueColor={stats.totalBalance > 0 ? '#dc2626' : '#16a34a'} />
                    </>
                )}
            </div>

            {/* Filters Bar */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '360px' }}>
                        <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input type="text" placeholder="بحث بالاسم، الهاتف، البريد..." className="input-field"
                            style={{ paddingRight: '38px', width: '100%' }}
                            value={filters.search}
                            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(0); }} />
                    </div>

                    {/* Toggle Filters */}
                    <button onClick={() => setShowFilters(!showFilters)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                            background: hasActiveFilters ? '#eef2ff' : 'white', color: hasActiveFilters ? '#4f46e5' : '#374151',
                            border: hasActiveFilters ? '1px solid #c7d2fe' : '1px solid #e5e7eb',
                            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                        }}>
                        <Filter size={16} /> فلترة {hasActiveFilters && <span style={{ background: '#4f46e5', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
                    </button>

                    {/* Sort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowUpDown size={16} style={{ color: '#6b7280' }} />
                        <select className="input-field" style={{ width: 'auto', padding: '10px 12px' }}
                            value={filters.sortBy}
                            onChange={e => { setFilters(f => ({ ...f, sortBy: e.target.value })); setPage(0); }}>
                            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <button onClick={() => setFilters(f => ({ ...f, sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                            style={{
                                padding: '10px 12px', background: 'white', border: '1px solid #e5e7eb',
                                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#374151',
                            }}>
                            {filters.sortOrder === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
                        </button>
                    </div>

                    {/* Results Count */}
                    <div style={{ marginRight: 'auto', color: '#6b7280', fontSize: '14px' }}>
                        {total} مورد
                    </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>شروط الدفع</label>
                            <select className="input-field" style={{ width: '150px' }} value={filters.paymentTerms}
                                onChange={e => { setFilters(f => ({ ...f, paymentTerms: e.target.value })); setPage(0); }}>
                                {TERM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>الحالة</label>
                            <select className="input-field" style={{ width: '130px' }} value={filters.active}
                                onChange={e => { setFilters(f => ({ ...f, active: e.target.value })); setPage(0); }}>
                                {ACTIVE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>الرصيد</label>
                            <select className="input-field" style={{ width: '150px' }} value={filters.balanceStatus}
                                onChange={e => { setFilters(f => ({ ...f, balanceStatus: e.target.value })); setPage(0); }}>
                                {BALANCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        {hasActiveFilters && (
                            <button onClick={resetFilters}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 14px',
                                    background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                }}>
                                <X size={14} /> مسح الفلاتر
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Suppliers Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>المورد</th>
                                <th>رقم الهاتف</th>
                                <th style={{ textAlign: 'center' }}>شروط الدفع</th>
                                <th style={{ textAlign: 'center' }}>الفواتير</th>
                                <th style={{ textAlign: 'left' }}>إجمالي المشتريات</th>
                                <th style={{ textAlign: 'left' }}>الرصيد المستحق</th>
                                <th style={{ textAlign: 'center' }}>الحالة</th>
                                <th style={{ textAlign: 'center', width: '180px' }}>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} /><br />
                                    جاري التحميل...
                                </td></tr>
                            ) : suppliers.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                                    <Users size={40} style={{ marginBottom: '12px', opacity: 0.5 }} /><br />
                                    لا يوجد موردون {hasActiveFilters && '— جرب تغيير الفلاتر'}
                                </td></tr>
                            ) : suppliers.map((s, idx) => {
                                const term = PAYMENT_TERMS[s.paymentTerms] || PAYMENT_TERMS.CASH;
                                const hasBalance = s.balance > 0;
                                return (
                                    <tr key={s.id} style={{ background: !s.active ? '#fafafa' : undefined }}>
                                        <td style={{ color: '#9ca3af', fontSize: '13px' }}>{page * PAGE_SIZE + idx + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: s.active ? '#0f172a' : '#9ca3af' }}>{s.name}</div>
                                            {s.contact && <div style={{ fontSize: '12px', color: '#64748b' }}>{s.contact}</div>}
                                            {s.email && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.email}</div>}
                                        </td>
                                        <td style={{ color: '#334155' }} dir="ltr">{s.phone || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
                                                fontSize: '12px', fontWeight: 600, background: term.bg, color: term.color,
                                            }}>
                                                {term.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#6366f1' }}>{s.grnCount}</td>
                                        <td style={{ textAlign: 'left', fontWeight: 500, color: '#374151' }} dir="ltr">
                                            {fmt(s.totalInvoiced)} <span style={{ color: '#9ca3af', fontSize: '12px' }}>ر.س</span>
                                        </td>
                                        <td style={{ textAlign: 'left' }} dir="ltr">
                                            <span style={{
                                                display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                                                fontWeight: 700, fontSize: '13px',
                                                background: hasBalance ? '#fef2f2' : '#f0fdf4',
                                                color: hasBalance ? '#dc2626' : '#16a34a',
                                            }}>
                                                {fmt(s.balance)} <span style={{ fontWeight: 500, fontSize: '11px' }}>ر.س</span>
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                                                fontSize: '12px', fontWeight: 600,
                                                background: s.active ? '#dcfce7' : '#f1f5f9',
                                                color: s.active ? '#16a34a' : '#94a3b8',
                                            }}>
                                                {s.active ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                                <button title="تفاصيل ومدفوعات" onClick={() => setDetailsSupplier(s)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '8px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Eye size={16} />
                                                </button>
                                                <button title="سجل النشاط" onClick={() => setHistorySupplier(s)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: '8px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Clock size={16} />
                                                </button>
                                                <button title={s.active ? 'إيقاف' : 'تفعيل'} onClick={() => handleToggleActive(s)}
                                                    disabled={togglingId === s.id}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.active ? '#16a34a' : '#94a3b8', padding: '8px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = s.active ? '#f0fdf4' : '#f8fafc')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    {togglingId === s.id ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> :
                                                        s.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                </button>
                                                <button title="تعديل" onClick={() => openEdit(s)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '6px' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button title="حذف" onClick={() => handleDelete(s.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '8px', borderRadius: '6px' }}
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '16px 20px', borderTop: '1px solid #e5e7eb', background: '#fafafa',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ color: '#6b7280', fontSize: '14px' }}>
                            عرض {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} من {total}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px',
                                    background: page === 0 ? '#f3f4f6' : 'white', color: page === 0 ? '#9ca3af' : '#374151',
                                    border: '1px solid #e5e7eb', borderRadius: '8px', cursor: page === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 600, fontSize: '13px',
                                }}>
                                <ChevronRight size={16} /> السابق
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', color: '#374151', fontWeight: 600 }}>
                                {page + 1} / {totalPages}
                            </div>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px',
                                    background: page >= totalPages - 1 ? '#f3f4f6' : 'white',
                                    color: page >= totalPages - 1 ? '#9ca3af' : '#374151',
                                    border: '1px solid #e5e7eb', borderRadius: '8px',
                                    cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px',
                                }}>
                                التالي <ChevronLeft size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{editing ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>اسم المورد / الشركة <span style={{ color: '#dc2626' }}>*</span></label>
                                <input className="input-field" value={form.name} required placeholder="اسم الشركة أو المورد"
                                    onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>البريد الإلكتروني</label>
                                <input className="input-field" value={form.email} dir="ltr" type="email" placeholder="email@example.com"
                                    onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>العنوان</label>
                                <input className="input-field" value={form.address} placeholder="المدينة، الحي..."
                                    onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '28px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '14px' }}>شروط الدفع الافتراضية</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                                    {TERM_OPTIONS_MODAL.map(opt => {
                                        const cfg = PAYMENT_TERMS[opt.value];
                                        const active = form.paymentTerms === opt.value;
                                        return (
                                            <button key={opt.value} type="button" onClick={() => setForm({ ...form, paymentTerms: opt.value })}
                                                style={{
                                                    padding: '12px 8px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                                    border: active ? `2px solid ${cfg.color}` : '1px solid #e2e8f0',
                                                    background: active ? cfg.bg : 'white',
                                                    fontWeight: active ? 700 : 500, fontSize: '13px',
                                                    color: active ? cfg.color : '#374151',
                                                    fontFamily: 'inherit', transition: 'all 0.15s',
                                                }}>
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, padding: '12px' }}>
                                    {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة المورد'}
                                </button>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}
                                    style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }}>
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail / Audit Modals */}
            {detailsSupplier && (
                <SupplierDetails supplier={detailsSupplier} onClose={() => { setDetailsSupplier(null); loadSuppliers(); loadStats(); }} />
            )}
            {historySupplier && (
                <SupplierAuditHistory supplierId={historySupplier.id} supplierName={historySupplier.name} onClose={() => setHistorySupplier(null)} />
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}
