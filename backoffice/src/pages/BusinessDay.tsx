import { useState, useEffect } from 'react';
import {
    CalendarDays, Play, Square, Clock, History,
    CheckCircle, XCircle, User, RefreshCw, FileText, Eye, X, Printer
} from 'lucide-react';
import { useBusinessDay } from '../context/BusinessDayContext';
import { businessDayApi } from '../api/businessDay';
import type { BusinessDay as BusinessDayType, ZReport } from '../api/businessDay';
import ZReportModal, { printReceipt, downloadReceipt } from '../components/ZReport';

type Tab = 'status' | 'history';

export default function BusinessDayPage() {
    const { currentDay, loading, refresh, openDay, closeDay } = useBusinessDay();
    const [activeTab, setActiveTab] = useState<Tab>('status');
    const [busy, setBusy] = useState(false);
    const [zReport, setZReport] = useState<ZReport | null>(null);
    const [zLoading, setZLoading] = useState(false);
    const [loadingRowId, setLoadingRowId] = useState<number | null>(null);

    const openZReport = async (id: number) => {
        setZLoading(true);
        try {
            const data = await businessDayApi.getZReport(id);
            setZReport(data);
        } catch { /* ignore */ } finally {
            setZLoading(false);
        }
    };

    const handleRowPrint = async (id: number) => {
        setLoadingRowId(id);
        try {
            const data = await businessDayApi.getZReport(id);
            printReceipt(data);
        } catch { /* ignore */ } finally {
            setLoadingRowId(null);
        }
    };

    const handleRowDownload = async (id: number) => {
        setLoadingRowId(id);
        try {
            const data = await businessDayApi.getZReport(id);
            downloadReceipt(data);
        } catch { /* ignore */ } finally {
            setLoadingRowId(null);
        }
    };
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState<BusinessDayType[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<BusinessDayType | null>(null);
    const PAGE_SIZE = 15;

    useEffect(() => {
        if (activeTab === 'history') loadHistory(0);
    }, [activeTab]);

    const loadHistory = async (page: number) => {
        setHistoryLoading(true);
        try {
            const res = await businessDayApi.getHistory(page * PAGE_SIZE, PAGE_SIZE);
            setHistory(res.data);
            setHistoryTotal(res.total);
            setHistoryPage(page);
        } catch {/* ignore */ } finally {
            setHistoryLoading(false);
        }
    };

    const handleOpen = async () => {
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            await openDay(notes || undefined);
            setSuccess('تم فتح يوم العمل بنجاح');
            setNotes('');
        } catch (e: any) {
            setError(e?.response?.data?.message || 'حدث خطأ أثناء الفتح');
        } finally {
            setBusy(false);
        }
    };

    const handleClose = async () => {
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            const closed = await closeDay(notes || undefined);
            setSuccess('تم إغلاق يوم العمل بنجاح');
            setNotes('');
            loadHistory(0);
            // Auto-print Z report after close
            if (closed?.id) {
                openZReport(closed.id);
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || 'حدث خطأ أثناء الإغلاق');
        } finally {
            setBusy(false);
        }
    };

    const fmt = (iso: string) =>
        new Date(iso).toLocaleString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const fmtShort = (iso: string) =>
        new Date(iso).toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });

    const duration = (start: string, end?: string | null) => {
        const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h}س ${m}د`;
    };

    const tabStyle = (t: Tab): React.CSSProperties => ({
        padding: '10px 24px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        border: 'none',
        borderBottom: activeTab === t ? '3px solid #2563eb' : '3px solid transparent',
        background: 'transparent',
        color: activeTab === t ? '#2563eb' : '#64748b',
        transition: 'all 0.2s',
    });

    return (
        <div style={{ padding: 24, maxWidth: 860, margin: '0 auto', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CalendarDays size={32} color="#2563eb" />
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>إدارة يوم العمل</h1>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>فتح وإغلاق أيام العمل ومتابعة السجل</p>
                    </div>
                </div>
                <button
                    onClick={() => { refresh(); if (activeTab === 'history') loadHistory(0); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}
                >
                    <RefreshCw size={15} /> تحديث
                </button>
            </div>

            {/* Status Badge */}
            {!loading && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 20px',
                    borderRadius: 12,
                    marginBottom: 24,
                    background: currentDay ? '#ecfdf5' : '#fef9c3',
                    border: `1px solid ${currentDay ? '#a7f3d0' : '#fde047'}`,
                }}>
                    {currentDay
                        ? <CheckCircle size={20} color="#059669" />
                        : <XCircle size={20} color="#b45309" />}
                    <span style={{ fontWeight: 700, fontSize: 15, color: currentDay ? '#065f46' : '#92400e' }}>
                        {currentDay ? 'يوم العمل مفتوح الآن' : 'لا يوجد يوم عمل مفتوح'}
                    </span>
                    {currentDay && (
                        <span style={{ fontSize: 13, color: '#047857', marginRight: 8 }}>
                            ⏱ منذ {duration(currentDay.openedAt)} | بواسطة {currentDay.opener.fullName}
                        </span>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 24, display: 'flex', gap: 4 }}>
                <button style={tabStyle('status')} onClick={() => setActiveTab('status')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={15} /> الحالة والتحكم
                    </span>
                </button>
                <button style={tabStyle('history')} onClick={() => setActiveTab('history')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <History size={15} /> السجل التاريخي
                    </span>
                </button>
            </div>

            {/* ── TAB: STATUS / CONTROL ── */}
            {activeTab === 'status' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                    {/* Current day info card */}
                    {currentDay && (
                        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={18} color="#2563eb" /> تفاصيل اليوم الحالي
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <Row label="رقم اليوم" value={`#${currentDay.id}`} />
                                <Row label="وقت الفتح" value={fmt(currentDay.openedAt)} />
                                <Row label="المدة حتى الآن" value={duration(currentDay.openedAt)} highlight />
                                <Row label="فُتح بواسطة" value={currentDay.opener.fullName} />
                                {currentDay.notes && <Row label="ملاحظات" value={currentDay.notes} />}
                            </div>
                        </div>
                    )}

                    {/* Open / Close card */}
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {currentDay
                                ? <><Square size={18} color="#ef4444" /> إغلاق يوم العمل</>
                                : <><Play size={18} color="#10b981" /> فتح يوم عمل جديد</>}
                        </h3>

                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            ملاحظات (اختياري)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="أضف ملاحظات على هذا اليوم..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                fontSize: 14,
                                resize: 'vertical',
                                direction: 'rtl',
                                boxSizing: 'border-box',
                                marginBottom: 16,
                                fontFamily: 'Cairo, sans-serif',
                            }}
                        />

                        {error && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#15803d', fontSize: 13, marginBottom: 12 }}>
                                {success}
                            </div>
                        )}

                        {currentDay ? (
                            <button
                                disabled={busy}
                                onClick={handleClose}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: busy ? '#fca5a5' : '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontFamily: 'Cairo, sans-serif',
                                }}
                            >
                                <Square size={18} />
                                {busy ? 'جاري الإغلاق...' : 'إغلاق يوم العمل'}
                            </button>
                        ) : (
                            <button
                                disabled={busy}
                                onClick={handleOpen}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: busy ? '#6ee7b7' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 10,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: busy ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    fontFamily: 'Cairo, sans-serif',
                                }}
                            >
                                <Play size={18} />
                                {busy ? 'جاري الفتح...' : 'فتح يوم عمل جديد'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: HISTORY ── */}
            {activeTab === 'history' && (
                <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                    {historyLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>جاري التحميل...</div>
                    ) : history.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                            <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p>لا توجد أيام عمل مسجلة بعد</p>
                        </div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        {['#', 'وقت الفتح', 'وقت الإغلاق', 'المدة', 'فُتح بواسطة', 'أُغلق بواسطة', 'الحالة', 'ملاحظات', 'إجراءات'].map(h => (
                                            <th key={h} style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((d, i) => (
                                        <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#64748b' }}>#{d.id}</td>
                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{fmtShort(d.openedAt)}</td>
                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: d.closedAt ? '#374151' : '#94a3b8' }}>
                                                {d.closedAt ? fmtShort(d.closedAt) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#6366f1', fontWeight: 600 }}>
                                                {duration(d.openedAt, d.closedAt)}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <User size={13} color="#94a3b8" /> {d.opener.fullName}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                {d.closer
                                                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={13} color="#94a3b8" /> {d.closer.fullName}</span>
                                                    : <span style={{ color: '#94a3b8' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '12px 14px' }}>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: 20,
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    background: d.status === 'OPEN' ? '#dcfce7' : '#f1f5f9',
                                                    color: d.status === 'OPEN' ? '#15803d' : '#64748b',
                                                }}>
                                                    {d.status === 'OPEN' ? 'مفتوح' : 'مغلق'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {d.notes ?? '—'}
                                            </td>
                                            <td style={{ padding: '10px 10px' }}>
                                                <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => setSelectedDay(d)}
                                                        title="تفاصيل اليوم"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 3,
                                                            padding: '5px 9px', background: '#eef2ff', border: 'none',
                                                            borderRadius: 6, cursor: 'pointer', color: '#4f46e5',
                                                            fontSize: 11, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        <Eye size={12} /> عرض
                                                    </button>
                                                    <button
                                                        disabled={loadingRowId === d.id}
                                                        onClick={() => handleRowPrint(d.id)}
                                                        title="طباعة تقرير Z"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 3,
                                                            padding: '5px 9px', background: '#f0fdf4', border: 'none',
                                                            borderRadius: 6, cursor: loadingRowId === d.id ? 'not-allowed' : 'pointer', color: '#059669',
                                                            fontSize: 11, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
                                                            whiteSpace: 'nowrap', opacity: loadingRowId === d.id ? 0.5 : 1,
                                                        }}
                                                    >
                                                        <Printer size={12} /> طباعة
                                                    </button>
                                                    <button
                                                        disabled={loadingRowId === d.id}
                                                        onClick={() => handleRowDownload(d.id)}
                                                        title="تنزيل تقرير Z"
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 3,
                                                            padding: '5px 9px', background: '#fef9c3', border: 'none',
                                                            borderRadius: 6, cursor: loadingRowId === d.id ? 'not-allowed' : 'pointer', color: '#92400e',
                                                            fontSize: 11, fontWeight: 600, fontFamily: 'Cairo, sans-serif',
                                                            whiteSpace: 'nowrap', opacity: loadingRowId === d.id ? 0.5 : 1,
                                                        }}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                        تنزيل
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {historyTotal > PAGE_SIZE && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb' }}>
                                    <span style={{ fontSize: 13, color: '#64748b' }}>
                                        {historyPage * PAGE_SIZE + 1}–{Math.min((historyPage + 1) * PAGE_SIZE, historyTotal)} من {historyTotal}
                                    </span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            disabled={historyPage === 0}
                                            onClick={() => loadHistory(historyPage - 1)}
                                            style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: historyPage === 0 ? 'not-allowed' : 'pointer', opacity: historyPage === 0 ? 0.4 : 1 }}
                                        >
                                            السابق
                                        </button>
                                        <button
                                            disabled={(historyPage + 1) * PAGE_SIZE >= historyTotal}
                                            onClick={() => loadHistory(historyPage + 1)}
                                            style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: (historyPage + 1) * PAGE_SIZE >= historyTotal ? 'not-allowed' : 'pointer', opacity: (historyPage + 1) * PAGE_SIZE >= historyTotal ? 0.4 : 1 }}
                                        >
                                            التالي
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── Day Details Modal ── */}
            {selectedDay && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
                    onClick={() => setSelectedDay(null)}
                >
                    <div
                        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            background: selectedDay.status === 'OPEN' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                            padding: '24px 28px',
                            position: 'relative',
                        }}>
                            <button
                                onClick={() => setSelectedDay(null)}
                                style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white', padding: '5px 8px', display: 'flex', alignItems: 'center' }}
                            >
                                <X size={16} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CalendarDays size={28} color="white" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>يوم العمل #{selectedDay.id}</div>
                                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>
                                        {selectedDay.status === 'OPEN' ? '🟢 مفتوح حالياً' : '⚪ مغلق'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px 28px' }}>
                            {/* Duration badge */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                <div style={{ background: '#eef2ff', borderRadius: 12, padding: '10px 24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginBottom: 2 }}>مدة يوم العمل</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{duration(selectedDay.openedAt, selectedDay.closedAt)}</div>
                                </div>
                            </div>

                            {/* Info rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                                <ModalRow
                                    icon={<Clock size={15} color="#10b981" />}
                                    label="وقت الفتح"
                                    value={fmt(selectedDay.openedAt)}
                                    bg="#f0fdf4"
                                />
                                <ModalRow
                                    icon={<Clock size={15} color={selectedDay.closedAt ? '#6366f1' : '#94a3b8'} />}
                                    label="وقت الإغلاق"
                                    value={selectedDay.closedAt ? fmt(selectedDay.closedAt) : '—  (لا يزال مفتوحاً)'}
                                    bg={selectedDay.closedAt ? '#eef2ff' : '#f8fafc'}
                                />
                                <ModalRow
                                    icon={<User size={15} color="#f59e0b" />}
                                    label="فُتح بواسطة"
                                    value={selectedDay.opener.fullName}
                                    bg="#fffbeb"
                                />
                                {selectedDay.closer && (
                                    <ModalRow
                                        icon={<User size={15} color="#ef4444" />}
                                        label="أُغلق بواسطة"
                                        value={selectedDay.closer.fullName}
                                        bg="#fff1f2"
                                    />
                                )}
                                {selectedDay.notes && (
                                    <ModalRow
                                        icon={<FileText size={15} color="#64748b" />}
                                        label="ملاحظات"
                                        value={selectedDay.notes}
                                        bg="#f8fafc"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '16px 28px', background: '#f8fafc', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <button
                                disabled={zLoading}
                                onClick={() => { openZReport(selectedDay.id); setSelectedDay(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: zLoading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', opacity: zLoading ? 0.6 : 1 }}
                            >
                                <Printer size={15} /> عرض تقرير Z
                            </button>
                            <button
                                onClick={() => setSelectedDay(null)}
                                style={{ padding: '9px 24px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Z Report Modal ── */}
            {zReport && <ZReportModal report={zReport} onClose={() => setZReport(null)} />}
        </div>
    );
}

function ModalRow({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: bg, borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ flexShrink: 0 }}>{icon}</div>
            <span style={{ fontSize: 13, color: '#64748b', minWidth: 110, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', flex: 1, textAlign: 'left' }}>{value}</span>
        </div>
    );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 500, color: highlight ? '#2563eb' : '#1e293b' }}>{value}</span>
        </div>
    );
}
