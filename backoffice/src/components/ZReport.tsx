import { Printer, Download, X } from 'lucide-react';
import type { ZReport } from '../api/businessDay';

const PAY: Record<string, string> = {
    CASH: 'نقدي', CARD: 'بطاقة', TRANSFER: 'تحويل',
    MIXED: 'متعدد', INSTAPAY: 'InstaPay', FAWRY: 'فوري', WALLET: 'محفظة',
};

function fd(iso: string) {
    return new Date(iso).toLocaleString('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

function dur(start: string, end?: string | null) {
    const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
    return `${Math.floor(ms / 3600000)}س ${Math.floor((ms % 3600000) / 60000)}د`;
}

function money(n: number) {
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
}

/* ─────────────────────────────────────────────
   buildReceiptHtml — receipt HTML (UTF-8 Blob)
   ───────────────────────────────────────────── */
export function buildReceiptHtml(report: ZReport): string {
    const { day, sales, returns: rtn, expenses, summary } = report;

    const dash = '--------------------------------';
    const eq = '================================';

    const row = (label: string, val: string, cls = '') =>
        `<div class="row${cls ? ' ' + cls : ''}"><span>${label}</span><span>${val}</span></div>`;

    const sec = (t: string) =>
        `<div class="sep">${dash}</div><div class="sec-title">${t}</div>`;

    const payRows = Object.entries(sales.paymentBreakdown)
        .map(([m, v]) => row(PAY[m] ?? m, money(v))).join('');

    const expRows = Object.entries(expenses.byCategory)
        .map(([c, v]) => row(c, money(v))).join('');

    return `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8"/>
<title>Z Report - يوم #${day.id}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; color: #000 !important; font-weight: 900 !important; }
body { font-family: 'Courier New', Courier, monospace; font-size: 13px; background: #fff; color: #000; direction: rtl; font-weight: 900; }
.receipt { width: 302px; margin: 0 auto; padding: 14px 10px; }
.center { text-align: center; }
.store { font-size: 18px; font-weight: 900; letter-spacing: 2px; margin-bottom: 2px; }
.subtitle { font-size: 12px; color: #000; margin-bottom: 2px; font-weight: 900; }
.title { font-size: 15px; font-weight: 900; margin: 4px 0; }
.sep { color: #000; font-size: 11px; margin: 5px 0; letter-spacing: 0.5px; text-align: center; word-break: break-all; font-weight: 900; }
.row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; font-weight: 900; }
.row.bold { font-weight: 900; font-size: 13px; }
.row.green span:last-child { color: #000; }
.row.red span:last-child { color: #000; }
.sec-title { font-weight: 900; font-size: 13px; text-align: center; margin: 4px 0 2px; }
.net { display: flex; justify-content: space-between; font-weight: 900; font-size: 15px; border-top: 2px solid #000; margin-top: 6px; padding-top: 8px; }
.meta { font-size: 11px; color: #000; text-align: center; margin-top: 10px; line-height: 1.8; font-weight: 900; }
@media print { @page { margin: 0; size: 80mm auto; } body { padding: 0; } .receipt { width: 100%; padding: 6px 4px; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="center">
    <div class="store">MAGD STORE</div>
    <div class="subtitle">تقرير إغلاق اليوم</div>
    <div class="title">Z — Report</div>
  </div>
  <div class="sep">${eq}</div>
  ${row('رقم اليوم', '#' + day.id)}
  ${row('فتح', fd(day.openedAt))}
  ${row('إغلاق', day.closedAt ? fd(day.closedAt) : '—')}
  ${row('المدة', dur(day.openedAt, day.closedAt))}
  ${row('فُتح بواسطة', day.opener.fullName)}
  ${day.closer ? row('أُغلق بواسطة', day.closer.fullName) : ''}
  ${sec('المبيعات')}
  ${row('عدد الفواتير', String(sales.count))}
  ${row('الإجمالي', money(sales.total))}
  ${row('الخصومات', money(sales.discounts))}
  ${row('الضريبة', money(sales.tax))}
  ${row('إجمالي التكلفة', money(sales.costOfGoods))}
  ${row('إجمالي الربح', money(sales.grossProfit), 'bold')}
  <div class="sep">${dash}</div>
  <div class="sec-title" style="font-size:10px">— توزيع الدفع —</div>
  ${payRows || row('—', '')}
  ${sec('المرتجعات')}
  ${row('عدد المرتجعات', String(rtn.count))}
  ${row('إجمالي الاسترداد', money(rtn.total), 'bold red')}
  ${sec('المصروفات')}
  ${row('عدد المصروفات', String(expenses.count))}
  ${expRows}
  ${row('إجمالي المصروفات', money(expenses.total), 'bold red')}
  <div class="sep">${eq}</div>
  <div class="sec-title">ملخص اليوم</div>
  ${row('إجمالي المحصّل', money(summary.totalIncome), 'green')}
  ${row('المرتجعات', '- ' + money(summary.totalReturns), 'red')}
  ${row('المصروفات', '- ' + money(summary.totalExpenses), 'red')}
  <div class="net">
    <span>صافي النقدية</span>
    <span style="color:#000">${money(summary.netCash)}</span>
  </div>
  <div class="sep">${eq}</div>
  <div class="meta">
    تم الإصدار: ${new Date().toLocaleString('ar-EG')}<br/>
    شكراً لتعاملكم معنا
  </div>
</div>
</body>
</html>`;
}

function openBlob(html: string) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    return URL.createObjectURL(blob);
}

export function printReceipt(report: ZReport) {
    const url = openBlob(buildReceiptHtml(report));
    const w = window.open(url, '_blank', 'width=440,height=820');
    if (!w) { URL.revokeObjectURL(url); return; }
    w.addEventListener('load', () => {
        w.print();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
}

export function downloadReceipt(report: ZReport) {
    const url = openBlob(buildReceiptHtml(report));
    const a = document.createElement('a');
    a.href = url;
    a.download = `z-report-day-${report.day.id}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ────────────────────────────────────────────────
   Receipt-preview modal (narrow thermal style)
   ──────────────────────────────────────────────── */
interface Props { report: ZReport; onClose: () => void; }

export default function ZReportModal({ report, onClose }: Props) {
    const { day, sales, returns: rtn, expenses, summary } = report;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                zIndex: 1100, padding: '24px 16px', overflowY: 'auto',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#f5f5f0', borderRadius: 16, width: 360,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden',
                    fontFamily: '"Courier New", Courier, monospace', marginTop: 10,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* action bar */}
                <div style={{ background: '#1e293b', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
                        تقرير Z — يوم #{day.id}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <Btn bg="#2563eb" onClick={() => printReceipt(report)}><Printer size={13} /><span>طباعة</span></Btn>
                        <Btn bg="#0f766e" onClick={() => downloadReceipt(report)}><Download size={13} /><span>تنزيل</span></Btn>
                        <Btn bg="#475569" onClick={onClose} icon><X size={14} /></Btn>
                    </div>
                </div>

                {/* receipt paper */}
                <div style={{ padding: '18px 20px', direction: 'rtl', maxHeight: '82vh', overflowY: 'auto' }}>
                    {/* header */}
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed #aaa', paddingBottom: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2 }}>MAGD STORE</div>
                        <div style={{ fontSize: 12, color: '#555' }}>تقرير إغلاق اليوم</div>
                        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>Z — Report</div>
                    </div>

                    <RRow label="رقم اليوم" val={`#${day.id}`} />
                    <RRow label="فتح" val={fd(day.openedAt)} />
                    <RRow label="إغلاق" val={day.closedAt ? fd(day.closedAt) : '—'} />
                    <RRow label="المدة" val={dur(day.openedAt, day.closedAt)} />
                    <RRow label="فُتح بواسطة" val={day.opener.fullName} />
                    {day.closer && <RRow label="أُغلق بواسطة" val={day.closer.fullName} />}

                    <Dash />

                    <SecTitle>المبيعات</SecTitle>
                    <RRow label="عدد الفواتير" val={String(sales.count)} />
                    <RRow label="الإجمالي" val={money(sales.total)} />
                    <RRow label="الخصومات" val={money(sales.discounts)} />
                    <RRow label="الضريبة" val={money(sales.tax)} />
                    <RRow label="إجمالي التكلفة" val={money(sales.costOfGoods)} />
                    <RRow label="إجمالي الربح" val={money(sales.grossProfit)} bold />

                    {Object.keys(sales.paymentBreakdown).length > 0 && (
                        <>
                            <div style={{ fontSize: 10, color: '#888', textAlign: 'center', margin: '6px 0 3px' }}>— توزيع الدفع —</div>
                            {Object.entries(sales.paymentBreakdown).map(([m, v]) => (
                                <RRow key={m} label={PAY[m] ?? m} val={money(v)} />
                            ))}
                        </>
                    )}

                    <Dash />

                    <SecTitle>المرتجعات</SecTitle>
                    <RRow label="عدد المرتجعات" val={String(rtn.count)} />
                    <RRow label="إجمالي الاسترداد" val={money(rtn.total)} bold color="#c00" />

                    <Dash />

                    <SecTitle>المصروفات</SecTitle>
                    <RRow label="عدد المصروفات" val={String(expenses.count)} />
                    {Object.entries(expenses.byCategory).map(([c, v]) => (
                        <RRow key={c} label={c} val={money(v)} />
                    ))}
                    <RRow label="إجمالي المصروفات" val={money(expenses.total)} bold color="#b45309" />

                    <Dash double />

                    <SecTitle>ملخص اليوم</SecTitle>
                    <RRow label="إجمالي المحصّل" val={money(summary.totalIncome)} color="#059669" />
                    <RRow label="المرتجعات" val={'- ' + money(summary.totalReturns)} color="#c00" />
                    <RRow label="المصروفات" val={'- ' + money(summary.totalExpenses)} color="#b45309" />

                    <div style={{ borderTop: '2px solid #111', marginTop: 6, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 15 }}>
                        <span>صافي النقدية</span>
                        <span style={{ color: summary.netCash >= 0 ? '#059669' : '#c00' }}>{money(summary.netCash)}</span>
                    </div>

                    <Dash double />

                    <div style={{ textAlign: 'center', fontSize: 10, color: '#888', marginTop: 6, lineHeight: 1.8 }}>
                        {new Date().toLocaleString('ar-EG')}<br />شكراً لتعاملكم معنا
                    </div>
                </div>
            </div>
        </div>
    );
}

function Btn({ bg, onClick, icon, children }: { bg: string; onClick: () => void; icon?: boolean; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: icon ? '5px 7px' : '5px 10px',
                background: bg, border: 'none', borderRadius: 6,
                color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                fontFamily: 'Cairo, sans-serif',
            }}
        >
            {children}
        </button>
    );
}

function RRow({ label, val, bold, color }: { label: string; val: string; bold?: boolean; color?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12 }}>
            <span style={{ color: '#444' }}>{label}</span>
            <span style={{ fontWeight: bold ? 800 : 500, color: color ?? '#111' }}>{val}</span>
        </div>
    );
}

function SecTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontWeight: 800, fontSize: 13, textAlign: 'center', margin: '4px 0 3px' }}>
            {children}
        </div>
    );
}

function Dash({ double }: { double?: boolean }) {
    return (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 11, margin: '7px 0', letterSpacing: 0.5, wordBreak: 'break-all' }}>
            {double ? '================================' : '--------------------------------'}
        </div>
    );
}
