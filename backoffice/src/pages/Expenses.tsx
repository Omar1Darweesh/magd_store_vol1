import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';
import {
    Plus, Edit2, Trash2, Search, Download, Filter,
    Wallet, TrendingUp, ChevronLeft, ChevronRight, RefreshCw,
    ArrowUpDown, X, Calendar, DollarSign, BarChart3, PieChart,
    Receipt, CreditCard, Banknote, Tag, Clock, Repeat, FileText
} from 'lucide-react';

// Types
interface ExpenseStats {
    totalExpenses: number;
    totalCount: number;
    todayExpenses: number;
    todayCount: number;
    monthExpenses: number;
    monthCount: number;
    recurringCount: number;
    byCategory: Array<{
        categoryId: number;
        categoryName: string;
        categoryNameAr: string;
        color: string;
        total: number;
        count: number;
    }>;
    byPaymentMethod: Array<{
        method: string;
        total: number;
        count: number;
    }>;
}

interface ExpenseCategory {
    id: number;
    name: string;
    nameAr: string | null;
    description: string | null;
    color: string | null;
    icon: string | null;
    active: boolean;
    _count: { expenses: number };
}

interface Expense {
    id: number;
    expenseNo: string;
    categoryId: number;
    amount: number;
    description: string | null;
    expenseDate: string;
    paymentMethod: string;
    reference: string | null;
    notes: string | null;
    isRecurring: boolean;
    recurringDay: number | null;
    createdAt: string;
    category: {
        id: number;
        name: string;
        nameAr: string | null;
        color: string | null;
    };
    user: {
        id: number;
        fullName: string;
    };
}

interface Filters {
    search: string;
    categoryId: string;
    paymentMethod: string;
    dateFrom: string;
    dateTo: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

// Constants
const PAYMENT_METHODS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    CASH: { label: 'كاش', color: '#16a34a', bg: '#dcfce7', icon: Banknote },
    CARD: { label: 'بطاقة', color: '#3b82f6', bg: '#dbeafe', icon: CreditCard },
    TRANSFER: { label: 'تحويل', color: '#8b5cf6', bg: '#ede9fe', icon: DollarSign },
    INSTAPAY: { label: 'انستاباي', color: '#ec4899', bg: '#fce7f3', icon: Wallet },
    FAWRY: { label: 'فوري', color: '#f97316', bg: '#ffedd5', icon: Receipt },
    WALLET: { label: 'محفظة', color: '#14b8a6', bg: '#ccfbf1', icon: Wallet },
    MIXED: { label: 'مختلط', color: '#6b7280', bg: '#f3f4f6', icon: DollarSign },
};

const PAYMENT_OPTIONS = [
    { value: '', label: 'الكل' },
    { value: 'CASH', label: 'كاش' },
    { value: 'CARD', label: 'بطاقة' },
    { value: 'TRANSFER', label: 'تحويل' },
    { value: 'INSTAPAY', label: 'انستاباي' },
    { value: 'FAWRY', label: 'فوري' },
    { value: 'WALLET', label: 'محفظة' },
];

const SORT_OPTIONS = [
    { value: 'createdAt', label: 'تاريخ الإنشاء' },
    { value: 'expenseDate', label: 'تاريخ المصروف' },
    { value: 'amount', label: 'المبلغ' },
];

const PAGE_SIZE = 20;

const emptyExpenseForm = {
    categoryId: '',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    reference: '',
    notes: '',
    isRecurring: false,
    recurringDay: '',
};

const emptyCategoryForm = {
    name: '',
    nameAr: '',
    description: '',
    color: '#6366f1',
    icon: 'Wallet',
};

// Helper functions
const fmt = (n: number) => n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-SA');

// Stats Card Component
function StatCard({ icon, label, value, subValue, bg, iconColor, valueColor }: {
    icon: React.ReactNode; label: string; value: string | number; subValue?: string;
    bg: string; iconColor: string; valueColor?: string;
}) {
    return (
        <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px'
        }}>
            <div style={{
                background: bg, borderRadius: '12px', padding: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{ color: iconColor }}>{icon}</span>
            </div>
            <div>
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '4px' }}>{label}</p>
                <p style={{ color: valueColor || '#1e293b', fontSize: '24px', fontWeight: '700', margin: 0 }}>{value}</p>
                {subValue && <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{subValue}</p>}
            </div>
        </div>
    );
}

// Category Chip Component
function CategoryChip({ category }: { category: { name: string; nameAr: string | null; color: string | null } }) {
    return (
        <span style={{
            background: category.color ? `${category.color}20` : '#e0e7ff',
            color: category.color || '#4f46e5',
            padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
            <Tag size={12} />
            {category.nameAr || category.name}
        </span>
    );
}

// Payment Method Badge
function PaymentBadge({ method }: { method: string }) {
    const config = PAYMENT_METHODS[method] || PAYMENT_METHODS.CASH;
    const Icon = config.icon;
    return (
        <span style={{
            background: config.bg, color: config.color,
            padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
            <Icon size={12} />
            {config.label}
        </span>
    );
}

export default function Expenses() {
    // State
    const [stats, setStats] = useState<ExpenseStats | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>({
        search: '', categoryId: '', paymentMethod: '',
        dateFrom: '', dateTo: '', sortBy: 'createdAt', sortOrder: 'desc'
    });
    const [showFilters, setShowFilters] = useState(false);

    // Modals
    const [expenseModal, setExpenseModal] = useState(false);
    const [categoryModal, setCategoryModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ type: 'expense' | 'category'; id: number } | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
    const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
    const [saving, setSaving] = useState(false);

    // Fetch Data
    const fetchStats = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/expenses/stats');
            setStats(data);
        } catch (e) { console.error('Error fetching stats', e); }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/expenses/categories');
            setCategories(data);
        } catch (e) { console.error('Error fetching categories', e); }
    }, []);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('skip', String((page - 1) * PAGE_SIZE));
            params.set('take', String(PAGE_SIZE));
            if (filters.search) params.set('search', filters.search);
            if (filters.categoryId) params.set('categoryId', filters.categoryId);
            if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
            if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.set('dateTo', filters.dateTo);
            params.set('sortBy', filters.sortBy);
            params.set('sortOrder', filters.sortOrder);

            const { data } = await apiClient.get(`/expenses?${params}`);
            setExpenses(data.data);
            setTotal(data.total);
        } catch (e) { console.error('Error fetching expenses', e); }
        setLoading(false);
    }, [page, filters]);

    useEffect(() => { fetchStats(); fetchCategories(); }, [fetchStats, fetchCategories]);
    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    // Handlers
    const resetFilters = () => {
        setFilters({ search: '', categoryId: '', paymentMethod: '', dateFrom: '', dateTo: '', sortBy: 'createdAt', sortOrder: 'desc' });
        setPage(1);
    };

    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.categoryId) params.set('categoryId', filters.categoryId);
            if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.set('dateTo', filters.dateTo);

            const { data } = await apiClient.get(`/expenses/export?${params}`);
            const exportData = data.map((exp: any) => ({
                'رقم المصروف': exp.expenseNo,
                'التصنيف': exp.category?.nameAr || exp.category?.name || '',
                'المبلغ': Number(exp.amount),
                'الوصف': exp.description || '',
                'تاريخ المصروف': formatDate(exp.expenseDate),
                'طريقة الدفع': PAYMENT_METHODS[exp.paymentMethod]?.label || exp.paymentMethod,
                'المرجع': exp.reference || '',
                'ملاحظات': exp.notes || '',
                'متكرر': exp.isRecurring ? 'نعم' : 'لا',
                'أضافه': exp.user?.fullName || '',
                'تاريخ الإنشاء': formatDate(exp.createdAt),
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
            XLSX.writeFile(wb, `المصروفات-${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) { console.error('Export error', e); }
    };

    const openExpenseModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpense(expense);
            setExpenseForm({
                categoryId: String(expense.categoryId),
                amount: String(expense.amount),
                description: expense.description || '',
                expenseDate: expense.expenseDate.split('T')[0],
                paymentMethod: expense.paymentMethod,
                reference: expense.reference || '',
                notes: expense.notes || '',
                isRecurring: expense.isRecurring,
                recurringDay: expense.recurringDay ? String(expense.recurringDay) : '',
            });
        } else {
            setEditingExpense(null);
            setExpenseForm({ ...emptyExpenseForm, expenseDate: new Date().toISOString().split('T')[0] });
        }
        setExpenseModal(true);
    };

    const openCategoryModal = (category?: ExpenseCategory) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({
                name: category.name,
                nameAr: category.nameAr || '',
                description: category.description || '',
                color: category.color || '#6366f1',
                icon: category.icon || 'Wallet',
            });
        } else {
            setEditingCategory(null);
            setCategoryForm(emptyCategoryForm);
        }
        setCategoryModal(true);
    };

    const saveExpense = async () => {
        if (!expenseForm.categoryId || !expenseForm.amount || !expenseForm.expenseDate) return;
        setSaving(true);
        try {
            const payload = {
                categoryId: parseInt(expenseForm.categoryId),
                amount: parseFloat(expenseForm.amount),
                description: expenseForm.description || null,
                expenseDate: expenseForm.expenseDate,
                paymentMethod: expenseForm.paymentMethod,
                reference: expenseForm.reference || null,
                notes: expenseForm.notes || null,
                isRecurring: expenseForm.isRecurring,
                recurringDay: expenseForm.recurringDay ? parseInt(expenseForm.recurringDay) : null,
            };

            if (editingExpense) {
                await apiClient.patch(`/expenses/${editingExpense.id}`, payload);
            } else {
                await apiClient.post('/expenses', payload);
            }
            setExpenseModal(false);
            fetchExpenses();
            fetchStats();
        } catch (e) { console.error('Save error', e); }
        setSaving(false);
    };

    const saveCategory = async () => {
        if (!categoryForm.name) return;
        setSaving(true);
        try {
            if (editingCategory) {
                await apiClient.patch(`/expenses/categories/${editingCategory.id}`, categoryForm);
            } else {
                await apiClient.post('/expenses/categories', categoryForm);
            }
            setCategoryModal(false);
            fetchCategories();
            fetchStats();
        } catch (e) { console.error('Save error', e); }
        setSaving(false);
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;
        try {
            if (deleteModal.type === 'expense') {
                await apiClient.delete(`/expenses/${deleteModal.id}`);
                fetchExpenses();
            } else {
                await apiClient.delete(`/expenses/categories/${deleteModal.id}`);
                fetchCategories();
            }
            fetchStats();
            setDeleteModal(null);
        } catch (e: any) {
            alert(e.response?.data?.message || 'حدث خطأ أثناء الحذف');
        }
    };

    const toggleCategoryActive = async (id: number) => {
        try {
            await apiClient.patch(`/expenses/categories/${id}/toggle-active`);
            fetchCategories();
        } catch (e) { console.error('Toggle error', e); }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const activeCategories = categories.filter(c => c.active);

    return (
        <div style={{ padding: '24px', direction: 'rtl', fontFamily: 'Cairo, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        <Wallet size={32} style={{ marginLeft: '12px', verticalAlign: 'middle', color: '#6366f1' }} />
                        إدارة المصروفات
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>تتبع وإدارة جميع مصروفات المتجر</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => openCategoryModal()} style={{
                        background: 'white', color: '#6366f1', border: '2px solid #6366f1',
                        padding: '12px 24px', borderRadius: '12px', cursor: 'pointer',
                        fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '14px', transition: 'all 0.2s'
                    }}>
                        <Tag size={18} /> إضافة تصنيف
                    </button>
                    <button onClick={() => openExpenseModal()} style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none',
                        padding: '12px 24px', borderRadius: '12px', cursor: 'pointer',
                        fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)'
                    }}>
                        <Plus size={18} /> إضافة مصروف
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <StatCard
                    icon={<DollarSign size={24} />}
                    label="إجمالي المصروفات"
                    value={stats ? fmt(stats.totalExpenses) + ' ج.م' : '...'}
                    subValue={stats ? `${stats.totalCount} مصروف` : ''}
                    bg="#fee2e2" iconColor="#dc2626" valueColor="#dc2626"
                />
                <StatCard
                    icon={<Calendar size={24} />}
                    label="مصروفات اليوم"
                    value={stats ? fmt(stats.todayExpenses) + ' ج.م' : '...'}
                    subValue={stats ? `${stats.todayCount} مصروف` : ''}
                    bg="#dcfce7" iconColor="#16a34a"
                />
                <StatCard
                    icon={<BarChart3 size={24} />}
                    label="مصروفات الشهر"
                    value={stats ? fmt(stats.monthExpenses) + ' ج.م' : '...'}
                    subValue={stats ? `${stats.monthCount} مصروف` : ''}
                    bg="#dbeafe" iconColor="#3b82f6"
                />
                <StatCard
                    icon={<Repeat size={24} />}
                    label="مصروفات متكررة"
                    value={stats?.recurringCount || 0}
                    bg="#fef3c7" iconColor="#d97706"
                />
            </div>

            {/* Category Distribution */}
            {stats && stats.byCategory.length > 0 && (
                <div style={{
                    background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '600' }}>
                        <PieChart size={18} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                        توزيع المصروفات حسب التصنيف
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {stats.byCategory.map(cat => (
                            <div key={cat.categoryId} style={{
                                background: `${cat.color}10`, border: `1px solid ${cat.color}30`,
                                borderRadius: '12px', padding: '12px 16px', minWidth: '160px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                                    <span style={{ fontWeight: '600', color: '#374151' }}>{cat.categoryNameAr || cat.categoryName}</span>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '700', color: cat.color }}>{fmt(cat.total)} ج.م</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{cat.count} مصروف</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Categories Management */}
            <div style={{
                background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0'
            }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '600' }}>
                    <Tag size={18} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                    تصنيفات المصروفات ({categories.length})
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                        <div key={cat.id} style={{
                            background: cat.active ? 'white' : '#f8fafc',
                            border: `2px solid ${cat.active ? cat.color || '#6366f1' : '#e2e8f0'}`,
                            borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                            opacity: cat.active ? 1 : 0.6
                        }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: cat.color || '#6366f1', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}>
                                <Wallet size={16} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', color: '#374151' }}>{cat.nameAr || cat.name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{cat._count.expenses} مصروف</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => openCategoryModal(cat)} style={{
                                    background: '#f1f5f9', border: 'none', borderRadius: '6px',
                                    padding: '6px', cursor: 'pointer', color: '#64748b'
                                }}><Edit2 size={14} /></button>
                                <button onClick={() => toggleCategoryActive(cat.id)} style={{
                                    background: cat.active ? '#dcfce7' : '#fee2e2', border: 'none', borderRadius: '6px',
                                    padding: '6px', cursor: 'pointer', color: cat.active ? '#16a34a' : '#dc2626'
                                }}>{cat.active ? '✓' : '✗'}</button>
                                {cat._count.expenses === 0 && (
                                    <button onClick={() => setDeleteModal({ type: 'category', id: cat.id })} style={{
                                        background: '#fee2e2', border: 'none', borderRadius: '6px',
                                        padding: '6px', cursor: 'pointer', color: '#dc2626'
                                    }}><Trash2 size={14} /></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters & Search */}
            <div style={{
                background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text" placeholder="بحث برقم المصروف أو الوصف..."
                                value={filters.search}
                                onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
                                style={{
                                    width: '100%', padding: '12px 44px 12px 16px', borderRadius: '10px',
                                    border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none'
                                }}
                            />
                        </div>
                        <button onClick={() => setShowFilters(!showFilters)} style={{
                            background: showFilters ? '#6366f1' : '#f1f5f9', color: showFilters ? 'white' : '#64748b',
                            border: 'none', padding: '12px', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            <Filter size={18} /> فلترة
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleExportExcel} style={{
                            background: '#16a34a', color: 'white', border: 'none',
                            padding: '12px 20px', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500'
                        }}>
                            <Download size={18} /> تصدير Excel
                        </button>
                        <button onClick={() => { fetchExpenses(); fetchStats(); }} style={{
                            background: '#f1f5f9', color: '#64748b', border: 'none',
                            padding: '12px', borderRadius: '10px', cursor: 'pointer'
                        }}>
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px'
                    }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontSize: '13px', fontWeight: '500' }}>التصنيف</label>
                            <select
                                value={filters.categoryId}
                                onChange={e => { setFilters(p => ({ ...p, categoryId: e.target.value })); setPage(1); }}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            >
                                <option value="">الكل</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontSize: '13px', fontWeight: '500' }}>طريقة الدفع</label>
                            <select
                                value={filters.paymentMethod}
                                onChange={e => { setFilters(p => ({ ...p, paymentMethod: e.target.value })); setPage(1); }}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            >
                                {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontSize: '13px', fontWeight: '500' }}>من تاريخ</label>
                            <input
                                type="date" value={filters.dateFrom}
                                onChange={e => { setFilters(p => ({ ...p, dateFrom: e.target.value })); setPage(1); }}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontSize: '13px', fontWeight: '500' }}>إلى تاريخ</label>
                            <input
                                type="date" value={filters.dateTo}
                                onChange={e => { setFilters(p => ({ ...p, dateTo: e.target.value })); setPage(1); }}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontSize: '13px', fontWeight: '500' }}>ترتيب حسب</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={filters.sortBy}
                                    onChange={e => setFilters(p => ({ ...p, sortBy: e.target.value }))}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                >
                                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <button
                                    onClick={() => setFilters(p => ({ ...p, sortOrder: p.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                                    style={{
                                        background: '#e0e7ff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer'
                                    }}
                                >
                                    <ArrowUpDown size={16} style={{ transform: filters.sortOrder === 'asc' ? 'rotate(180deg)' : 'none' }} />
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button onClick={resetFilters} style={{
                                background: '#fee2e2', color: '#dc2626', border: 'none',
                                padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500'
                            }}>
                                <X size={16} /> مسح الفلاتر
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Expenses Table */}
            <div style={{
                background: 'white', borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0'
            }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                        <RefreshCw size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
                        <p>جاري التحميل...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                        <Receipt size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>لا توجد مصروفات</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>رقم المصروف</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>التصنيف</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>المبلغ</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>الوصف</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>التاريخ</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>طريقة الدفع</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>المستخدم</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(exp => (
                                <tr key={exp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={16} style={{ color: '#6366f1' }} />
                                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{exp.expenseNo}</span>
                                            {exp.isRecurring && <Repeat size={14} style={{ color: '#d97706' }} title="متكرر" />}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <CategoryChip category={exp.category} />
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '700', color: '#dc2626' }}>
                                        {fmt(exp.amount)} ج.م
                                    </td>
                                    <td style={{ padding: '16px', color: '#475569', maxWidth: '200px' }}>
                                        {exp.description || '-'}
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} />
                                            {formatDate(exp.expenseDate)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <PaymentBadge method={exp.paymentMethod} />
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>
                                        {exp.user.fullName}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button onClick={() => openExpenseModal(exp)} style={{
                                                background: '#e0e7ff', color: '#4f46e5', border: 'none',
                                                padding: '8px', borderRadius: '8px', cursor: 'pointer'
                                            }}><Edit2 size={16} /></button>
                                            <button onClick={() => setDeleteModal({ type: 'expense', id: exp.id })} style={{
                                                background: '#fee2e2', color: '#dc2626', border: 'none',
                                                padding: '8px', borderRadius: '8px', cursor: 'pointer'
                                            }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc'
                    }}>
                        <span style={{ color: '#64748b', fontSize: '14px' }}>
                            عرض {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, total)} من {total}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{
                                    background: page === 1 ? '#e2e8f0' : '#6366f1', color: page === 1 ? '#94a3b8' : 'white',
                                    border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: page === 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <ChevronRight size={18} /> السابق
                            </button>
                            <span style={{ padding: '8px 16px', color: '#475569', fontWeight: '600' }}>
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={{
                                    background: page === totalPages ? '#e2e8f0' : '#6366f1', color: page === totalPages ? '#94a3b8' : 'white',
                                    border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                التالي <ChevronLeft size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Expense Modal */}
            {expenseModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', padding: '32px',
                        width: '95%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                {editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
                            </h2>
                            <button onClick={() => setExpenseModal(false)} style={{
                                background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer'
                            }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>التصنيف *</label>
                                <select
                                    value={expenseForm.categoryId}
                                    onChange={e => setExpenseForm(p => ({ ...p, categoryId: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                >
                                    <option value="">اختر التصنيف</option>
                                    {activeCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>المبلغ *</label>
                                <input
                                    type="number" step="0.01" min="0.01"
                                    value={expenseForm.amount}
                                    onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                                    placeholder="0.00"
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>تاريخ المصروف *</label>
                                <input
                                    type="date"
                                    value={expenseForm.expenseDate}
                                    onChange={e => setExpenseForm(p => ({ ...p, expenseDate: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>الوصف</label>
                                <textarea
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="وصف المصروف..."
                                    rows={2}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px', resize: 'none'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>طريقة الدفع</label>
                                <select
                                    value={expenseForm.paymentMethod}
                                    onChange={e => setExpenseForm(p => ({ ...p, paymentMethod: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                >
                                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>المرجع</label>
                                <input
                                    type="text"
                                    value={expenseForm.reference}
                                    onChange={e => setExpenseForm(p => ({ ...p, reference: e.target.value }))}
                                    placeholder="رقم الفاتورة أو المرجع"
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>ملاحظات</label>
                                <textarea
                                    value={expenseForm.notes}
                                    onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="ملاحظات إضافية..."
                                    rows={2}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px', resize: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={expenseForm.isRecurring}
                                        onChange={e => setExpenseForm(p => ({ ...p, isRecurring: e.target.checked }))}
                                        style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                                    />
                                    <span style={{ color: '#374151', fontWeight: '500' }}>مصروف متكرر شهرياً</span>
                                </label>
                                {expenseForm.isRecurring && (
                                    <input
                                        type="number" min="1" max="31"
                                        value={expenseForm.recurringDay}
                                        onChange={e => setExpenseForm(p => ({ ...p, recurringDay: e.target.value }))}
                                        placeholder="يوم الشهر"
                                        style={{
                                            width: '100px', padding: '8px', borderRadius: '8px',
                                            border: '2px solid #e2e8f0', fontSize: '14px'
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={saveExpense} disabled={saving || !expenseForm.categoryId || !expenseForm.amount} style={{
                                flex: 1, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none',
                                padding: '14px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: '600', fontSize: '15px', opacity: saving ? 0.7 : 1
                            }}>
                                {saving ? 'جاري الحفظ...' : (editingExpense ? 'تحديث' : 'حفظ')}
                            </button>
                            <button onClick={() => setExpenseModal(false)} style={{
                                flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none',
                                padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '15px'
                            }}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {categoryModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', padding: '32px',
                        width: '95%', maxWidth: '450px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                {editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
                            </h2>
                            <button onClick={() => setCategoryModal(false)} style={{
                                background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer'
                            }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>الاسم (إنجليزي) *</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Rent, Utilities, Salaries..."
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>الاسم (عربي)</label>
                                <input
                                    type="text"
                                    value={categoryForm.nameAr}
                                    onChange={e => setCategoryForm(p => ({ ...p, nameAr: e.target.value }))}
                                    placeholder="إيجار، مرافق، رواتب..."
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>الوصف</label>
                                <input
                                    type="text"
                                    value={categoryForm.description}
                                    onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="وصف التصنيف..."
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '10px',
                                        border: '2px solid #e2e8f0', fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#374151', fontWeight: '500' }}>اللون</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['#6366f1', '#3b82f6', '#14b8a6', '#16a34a', '#d97706', '#dc2626', '#ec4899', '#8b5cf6'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setCategoryForm(p => ({ ...p, color }))}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '8px',
                                                background: color, border: categoryForm.color === color ? '3px solid #1e293b' : '2px solid #e2e8f0',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={saveCategory} disabled={saving || !categoryForm.name} style={{
                                flex: 1, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none',
                                padding: '14px', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: '600', fontSize: '15px', opacity: saving ? 0.7 : 1
                            }}>
                                {saving ? 'جاري الحفظ...' : (editingCategory ? 'تحديث' : 'حفظ')}
                            </button>
                            <button onClick={() => setCategoryModal(false)} style={{
                                flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none',
                                padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '15px'
                            }}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'white', borderRadius: '20px', padding: '32px',
                        width: '95%', maxWidth: '400px', textAlign: 'center'
                    }}>
                        <div style={{
                            background: '#fee2e2', width: '64px', height: '64px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                        }}>
                            <Trash2 size={28} color="#dc2626" />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                            تأكيد الحذف
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>
                            {deleteModal.type === 'expense'
                                ? 'هل أنت متأكد من حذف هذا المصروف؟'
                                : 'هل أنت متأكد من حذف هذا التصنيف؟'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={confirmDelete} style={{
                                flex: 1, background: '#dc2626', color: 'white', border: 'none',
                                padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
                            }}>
                                نعم، احذف
                            </button>
                            <button onClick={() => setDeleteModal(null)} style={{
                                flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none',
                                padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
                            }}>
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
