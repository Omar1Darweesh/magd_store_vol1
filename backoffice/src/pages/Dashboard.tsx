import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import {
    DollarSign, Package, ShoppingCart, TrendingUp, ArrowUpRight, ArrowDownRight,
    Clock, AlertTriangle, Plus, Truck, BarChart3, Users, ShoppingBag,
    Activity, TrendingDown, Target
} from 'lucide-react';

interface DashboardData {
    today: {
        sales: number;
        orders: number;
        profit: number;
        avgOrderValue: number;
    };
    yesterday: {
        sales: number;
        orders: number;
    };
    inventory: {
        totalProducts: number;
        lowStock: number;
        outOfStock: number;
        stockValue: number;
    };
    recentSales: any[];
    topProductsToday: any[];
    lowStockProducts: any[];
    totalCustomers: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchDashboardData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const branchId = user.branchId || 1;

            const response = await apiClient.get('/reports/dashboard-summary', {
                params: { branchId }
            });

            setData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            setData({
                today: { sales: 0, orders: 0, profit: 0, avgOrderValue: 0 },
                yesterday: { sales: 0, orders: 0 },
                inventory: { totalProducts: 0, lowStock: 0, outOfStock: 0, stockValue: 0 },
                recentSales: [],
                topProductsToday: [],
                lowStockProducts: [],
                totalCustomers: 0
            });
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'صباح الخير';
        if (hour < 18) return 'مساء الخير';
        return 'مساء الخير';
    };

    const getTimeOfDay = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return '☀️';
        if (hour < 18) return '🌤️';
        return '🌙';
    };

    const formatDate = () => {
        return currentTime.toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = () => {
        return currentTime.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    };

    const KPICard = ({ icon: Icon, title, value, subtitle, color, change }: any) => (
        <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '8px' }}>{title}</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{value}</div>
                    {subtitle && <div style={{ fontSize: '13px', color: '#94a3b8' }}>{subtitle}</div>}
                </div>
                <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: `${color}20`,
                }}>
                    <Icon size={24} color={color} strokeWidth={2.5} />
                </div>
            </div>
            {change !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: change >= 0 ? '#dcfce7' : '#fee2e2',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: change >= 0 ? '#16a34a' : '#dc2626'
                    }}>
                        {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(change).toFixed(1)}%
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>مقارنة بالأمس</span>
                </div>
            )}
        </div>
    );

    const QuickActionCard = ({ icon: Icon, title, description, color, onClick }: any) => (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: '2px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '12px'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 10px 15px -3px ${color}30`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={28} color={color} strokeWidth={2} />
            </div>
            <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{description}</div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <Activity size={48} color="#6366f1" className="spin" />
            </div>
        );
    }

    if (!data) return null;

    const salesChange = calculateChange(data.today.sales, data.yesterday.sales);
    const ordersChange = calculateChange(data.today.orders, data.yesterday.orders);

    return (
        <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '32px',
                color: 'white',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {getTimeOfDay()} {getGreeting()}
                        </h1>
                        <p style={{ fontSize: '16px', opacity: 0.9, margin: '0 0 16px 0' }}>
                            إليك نظرة شاملة على أداء عملك اليوم
                        </p>
                        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', opacity: 0.85, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={16} />
                                {formatTime()}
                            </div>
                            <div>{formatDate()}</div>
                        </div>
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        style={{
                            padding: '12px 24px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    >
                        <Activity size={18} />
                        تحديث البيانات
                    </button>
                </div>
            </div>

            {/* Today's Performance KPIs */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                    📊 أداء اليوم
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <KPICard
                        icon={DollarSign}
                        title="مبيعات اليوم"
                        value={`${data.today.sales.toFixed(2)} ج.م`}
                        subtitle={`${data.today.orders} فاتورة`}
                        color="#10b981"
                        change={salesChange}
                    />
                    <KPICard
                        icon={TrendingUp}
                        title="الربح اليوم"
                        value={`${data.today.profit.toFixed(2)} ج.م`}
                        subtitle="صافي الربح"
                        color="#6366f1"
                        change={15.3}
                    />
                    <KPICard
                        icon={Target}
                        title="متوسط الفاتورة"
                        value={`${data.today.avgOrderValue.toFixed(2)} ج.م`}
                        subtitle="لكل عملية بيع"
                        color="#8b5cf6"
                    />
                    <KPICard
                        icon={ShoppingCart}
                        title="عدد الطلبات"
                        value={data.today.orders.toString()}
                        subtitle="طلب اليوم"
                        color="#f59e0b"
                        change={ordersChange}
                    />
                </div>
            </div>

            {/* System Overview KPIs */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                    🏪 نظرة عامة على النظام
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <KPICard
                        icon={Package}
                        title="إجمالي المنتجات"
                        value={data.inventory.totalProducts.toString()}
                        subtitle="منتج نشط"
                        color="#3b82f6"
                    />
                    <KPICard
                        icon={AlertTriangle}
                        title="تنبيهات المخزون"
                        value={data.inventory.lowStock.toString()}
                        subtitle="منتج منخفض"
                        color="#f59e0b"
                    />
                    <KPICard
                        icon={TrendingDown}
                        title="نفذ من المخزون"
                        value={data.inventory.outOfStock.toString()}
                        subtitle="منتج غير متوفر"
                        color="#ef4444"
                    />
                    <KPICard
                        icon={Users}
                        title="العملاء"
                        value={data.totalCustomers.toString()}
                        subtitle="عميل مسجل"
                        color="#10b981"
                    />
                </div>
            </div>

            {/* Quick Actions 
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                    ⚡ إجراءات سريعة
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <QuickActionCard
                        icon={ShoppingBag}
                        title="مبيعة جديدة"
                        description="افتح نقطة البيع"
                        color="#10b981"
                        onClick={() => window.open('/pos', '_blank')}
                    />
                    <QuickActionCard
                        icon={Plus}
                        title="منتج جديد"
                        description="إضافة منتج"
                        color="#6366f1"
                        onClick={() => navigate('/products')}
                    />
                    <QuickActionCard
                        icon={Truck}
                        title="استلام بضاعة"
                        description="تسجيل وارد"
                        color="#f59e0b"
                        onClick={() => navigate('/receive-goods')}
                    />
                    <QuickActionCard
                        icon={BarChart3}
                        title="التقارير"
                        description="عرض التحليلات"
                        color="#8b5cf6"
                        onClick={() => navigate('/reports')}
                    />
                </div>
            </div>*/}

            {/* Activity Feed */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                {/* Recent Sales */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingCart size={20} color="#10b981" />
                        آخر المبيعات
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {data.recentSales.length > 0 ? data.recentSales.slice(0, 5).map((sale: any, i: number) => (
                            <div key={i} style={{
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '700', color: '#6366f1', fontSize: '14px' }}>#{sale.invoiceNo}</span>
                                    <span style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>{sale.total} ج.م</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} />
                                        {new Date(sale.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        background: sale.paymentMethod === 'CASH' ? '#dcfce7' : '#dbeafe',
                                        color: sale.paymentMethod === 'CASH' ? '#166534' : '#1e40af',
                                        fontWeight: '600'
                                    }}>
                                        {sale.paymentMethod === 'CASH' ? 'نقدي' : 'شبكة'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                لا توجد مبيعات اليوم
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Products */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={20} color="#3b82f6" />
                        الأكثر مبيعاً اليوم
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {data.topProductsToday.length > 0 ? data.topProductsToday.slice(0, 5).map((product: any, i: number) => (
                            <div key={i} style={{
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>
                                        {product.productName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        الكمية: {product.quantity}
                                    </div>
                                </div>
                                <div style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>
                                    {product.revenue.toFixed(2)} ج.م
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                لا توجد مبيعات اليوم
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0'
                }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={20} color="#f59e0b" />
                        تنبيهات المخزون
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {data.lowStockProducts.length > 0 ? data.lowStockProducts.slice(0, 5).map((product: any, i: number) => (
                            <div key={i} style={{
                                padding: '12px',
                                background: '#fef2f2',
                                borderRadius: '10px',
                                border: '1px solid #fecaca',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                                    {product.nameAr || product.nameEn}
                                </div>
                                <div style={{
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    background: product.stock <= 0 ? '#fee2e2' : '#fef3c7',
                                    color: product.stock <= 0 ? '#dc2626' : '#d97706',
                                    fontWeight: '700',
                                    fontSize: '13px'
                                }}>
                                    {product.stock <= 0 ? 'نفذ' : `${product.stock} متبقي`}
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                لا توجد تنبيهات
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
