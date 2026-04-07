import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { X, Clock, ShoppingCart, Banknote, FileText } from 'lucide-react';

type EventType = 'FIELD_CHANGE' | 'GRN' | 'PAYMENT';

interface FieldChange { field: string; oldValue: any; newValue: any; }
interface TimelineEvent {
    type: EventType; id: string; action: string;
    changes?: FieldChange[];
    grnNumber?: string; paymentTerm?: string; totalAmount?: number;
    taxAmount?: number; netAmount?: number;
    items?: { productName: string; quantity: number; unitCost: number }[];
    amount?: number; method?: string; notes?: string;
    user?: { id: number; username: string; fullName: string };
    timestamp: string;
}

const fieldLabels: Record<string, string> = {
    name: 'اسم المورد', contact: 'جهة الاتصال', phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني', address: 'العنوان', paymentTerms: 'شروط الدفع', active: 'الحالة',
};

const paymentTermLabels: Record<string, { label: string; color: string; bg: string }> = {
    CASH:    { label: 'كاش',        color: '#16a34a', bg: '#f0fdf4' },
    DAYS_15: { label: 'آجل 15 يوم', color: '#d97706', bg: '#fffbeb' },
    DAYS_30: { label: 'آجل 30 يوم', color: '#ea580c', bg: '#fff7ed' },
    DAYS_60: { label: 'آجل 60 يوم', color: '#dc2626', bg: '#fef2f2' },
};

function formatValue(field: string, value: any): string {
    if (value === null || value === undefined || value === '') return '(فارغ)';
    if (field === 'active') return value ? 'نشط' : 'غير نشط';
    return String(value);
}

function formatAmount(n: number): string {
    return (n ?? 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 }) + ' ر.س';
}

function TimelineDot({ color, icon }: { color: string; icon: React.ReactNode }) {
    return (
        <div style={{
            width: '28px', height: '28px', borderRadius: '50%', background: color,
            flexShrink: 0, marginTop: '2px', border: '3px solid white',
            boxShadow: `0 0 0 2px ${color}`, zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
    );
}

function EventMeta({ user, timestamp }: { user?: { fullName?: string; username?: string }; timestamp: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                بواسطة: <strong style={{ color: '#374151' }}>{user?.fullName || user?.username || 'غير محدد'}</strong>
            </span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                {new Date(timestamp).toLocaleString('ar-SA')}
            </span>
        </div>
    );
}

function GRNEventCard({ event }: { event: TimelineEvent }) {
    const [expanded, setExpanded] = useState(false);
    const term = paymentTermLabels[event.paymentTerm ?? ''] || { label: event.paymentTerm ?? '', color: '#6b7280', bg: '#f9fafb' };
    return (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', position: 'relative' }}>
            <TimelineDot color="#6366f1" icon={<ShoppingCart size={13} color="white" />} />
            <div style={{ flex: 1, background: '#eef2ff', borderRadius: '10px', padding: '14px 16px', border: '1px solid #c7d2fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>📦 فاتورة شراء</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', background: '#e0e7ff', padding: '2px 8px', borderRadius: '9999px' }}>
                            {event.grnNumber}
                        </span>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: term.bg, color: term.color, fontWeight: 700 }}>
                        {term.label}
                    </span>
                </div>
                <EventMeta user={event.user} timestamp={event.timestamp} />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>إجمالي الفاتورة</div>
                        <div style={{ fontWeight: 700, color: '#374151', fontSize: '15px' }}>{formatAmount(event.totalAmount ?? 0)}</div>
                    </div>
                    {(event.taxAmount ?? 0) > 0 && (
                        <div style={{ background: 'white', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>الضريبة</div>
                            <div style={{ fontWeight: 600, color: '#d97706', fontSize: '14px' }}>{formatAmount(event.taxAmount ?? 0)}</div>
                        </div>
                    )}
                    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 12px', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>الصافي</div>
                        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '15px' }}>{formatAmount(event.netAmount ?? 0)}</div>
                    </div>
                </div>
                {event.items && event.items.length > 0 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{ background: 'none', border: '1px solid #a5b4fc', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#6366f1', cursor: 'pointer', width: '100%' }}
                    >
                        {expanded ? '▲ إخفاء' : `▼ عرض ${event.items.length} صنف`}
                    </button>
                )}
                {expanded && event.items && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {event.items.map((item, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{item.productName || 'منتج غير محدد'}</span>
                                <span style={{ color: '#6b7280' }}>{item.quantity} × {formatAmount(item.unitCost)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentEventCard({ event }: { event: TimelineEvent }) {
    return (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', position: 'relative' }}>
            <TimelineDot color="#16a34a" icon={<Banknote size={13} color="white" />} />
            <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '10px', padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>💰 دفعة مسددة</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{formatAmount(event.amount ?? 0)}</span>
                </div>
                <EventMeta user={event.user} timestamp={event.timestamp} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {event.method && (
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: '#dcfce7', color: '#15803d' }}>
                            طريقة: {event.method}
                        </span>
                    )}
                    {event.grnNumber && (
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: '#e0e7ff', color: '#4f46e5' }}>
                            فاتورة: {event.grnNumber}
                        </span>
                    )}
                </div>
                {event.notes && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{event.notes}</div>
                )}
            </div>
        </div>
    );
}

function FieldChangeCard({ event }: { event: TimelineEvent }) {
    const actionConfig: Record<string, { dot: string; bg: string; border: string; label: string }> = {
        CREATE: { dot: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'إنشاء المورد' },
        UPDATE: { dot: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'تعديل بيانات' },
        DELETE: { dot: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'حذف المورد' },
    };
    const ac = actionConfig[event.action] || actionConfig.UPDATE;
    return (
        <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', position: 'relative' }}>
            <TimelineDot color={ac.dot} icon={<FileText size={13} color="white" />} />
            <div style={{ flex: 1, background: ac.bg, borderRadius: '10px', padding: '14px 16px', border: `1px solid ${ac.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: ac.dot }}>✏️ {ac.label}</span>
                </div>
                <EventMeta user={event.user} timestamp={event.timestamp} />
                {event.changes && event.changes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {event.changes.map((ch, i) => (
                            <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '13px' }}>
                                <span style={{ fontWeight: 700, color: '#374151' }}>{fieldLabels[ch.field] || ch.field}: </span>
                                <span style={{ color: '#dc2626', textDecoration: 'line-through' }}>{formatValue(ch.field, ch.oldValue)}</span>
                                <span style={{ color: '#9ca3af', margin: '0 6px' }}>→</span>
                                <span style={{ color: '#16a34a' }}>{formatValue(ch.field, ch.newValue)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface Props { supplierId: number; supplierName: string; onClose: () => void; }

export default function SupplierAuditHistory({ supplierId, supplierName, onClose }: Props) {
    const [history, setHistory] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get(`/purchasing/suppliers/${supplierId}/audit-history`)
            .then(({ data }) => setHistory(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [supplierId]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 1100 }}>
            <div style={{ width: '560px', maxWidth: '100vw', height: '100vh', background: 'white', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <Clock size={20} color="#6366f1" />
                            <span style={{ fontSize: '18px', fontWeight: 700 }}>سجل النشاط الكامل</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>{supplierName}</div>
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { color: '#d97706', label: '✏️ تعديلات البيانات' },
                                { color: '#6366f1', label: '📦 فواتير الشراء' },
                                { color: '#16a34a', label: '💰 مدفوعات' },
                            ].map((b) => (
                                <span key={b.label} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '9999px',
                                    background: `${b.color}18`, color: b.color, fontWeight: 600,
                                }}>{b.label}</span>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>جاري التحميل...</div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>لا يوجد سجل نشاط</div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', right: '11px', top: '16px', bottom: '16px', width: '2px', background: '#e5e7eb' }} />
                            {history.map((event) => {
                                if (event.type === 'GRN') return <GRNEventCard key={event.id} event={event} />;
                                if (event.type === 'PAYMENT') return <PaymentEventCard key={event.id} event={event} />;
                                return <FieldChangeCard key={event.id} event={event} />;
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
