import { useState } from 'react';
import { CalendarDays, Play, Square, Clock } from 'lucide-react';
import { useBusinessDay } from '../context/BusinessDayContext';

export default function BusinessDayBar() {
  const { currentDay, loading, openDay, closeDay } = useBusinessDay();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState<'open' | 'close' | null>(null);
  const [notes, setNotes] = useState('');

  const handleOpen = async () => {
    setBusy(true);
    setError('');
    try {
      await openDay(notes || undefined);
      setShowConfirm(null);
      setNotes('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    setBusy(true);
    setError('');
    try {
      await closeDay(notes || undefined);
      setShowConfirm(null);
      setNotes('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  if (loading) return null;

  return (
    <>
      {/* Business Day Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 20px',
          background: currentDay ? '#ecfdf5' : '#fef9c3',
          borderBottom: `2px solid ${currentDay ? '#6ee7b7' : '#fde047'}`,
          fontSize: '13px',
          direction: 'rtl',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {/* Left: status info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={16} color={currentDay ? '#059669' : '#b45309'} />
          {currentDay ? (
            <span style={{ color: '#065f46', fontWeight: 600 }}>
              يوم عمل مفتوح &nbsp;|&nbsp;
              <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              &nbsp;{formatTime(currentDay.openedAt)}
              &nbsp;|&nbsp;بواسطة: {currentDay.opener.fullName}
            </span>
          ) : (
            <span style={{ color: '#92400e', fontWeight: 600 }}>لم يُفتح يوم العمل بعد</span>
          )}
        </div>

        {/* Right: action button */}
        <div>
          {currentDay ? (
            <button
              onClick={() => { setShowConfirm('close'); setError(''); setNotes(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 14px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Square size={14} />
              إغلاق يوم العمل
            </button>
          ) : (
            <button
              onClick={() => { setShowConfirm('open'); setError(''); setNotes(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 14px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Play size={14} />
              فتح يوم العمل
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowConfirm(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 28,
              minWidth: 340,
              direction: 'rtl',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              {showConfirm === 'open' ? '🟢 فتح يوم عمل جديد' : '🔴 إغلاق يوم العمل'}
            </h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
              {showConfirm === 'open'
                ? 'سيبدأ يوم العمل من الآن وستُحسب جميع المبيعات ضمنه.'
                : 'سيتم إغلاق يوم العمل وتثبيت وقت الإغلاق الآن.'}
            </p>

            <textarea
              placeholder="ملاحظات اختيارية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                minHeight: 72,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: 12,
                direction: 'rtl',
              }}
            />

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
              <button
                disabled={busy}
                onClick={showConfirm === 'open' ? handleOpen : handleClose}
                style={{
                  padding: '8px 22px',
                  background: showConfirm === 'open' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                  fontSize: 14,
                }}
              >
                {busy ? 'جاري...' : showConfirm === 'open' ? 'تأكيد الفتح' : 'تأكيد الإغلاق'}
              </button>
              <button
                onClick={() => setShowConfirm(null)}
                style={{
                  padding: '8px 18px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
