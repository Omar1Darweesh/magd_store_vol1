import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Plus, Edit, Trash, Shield, Check, Database, Download, RefreshCw } from 'lucide-react';

interface BackupInfo {
    exists: boolean;
    size?: number;
    createdAt?: string;
}

interface Page {
    id: number;
    key: string;
    nameEn: string;
    nameAr: string;
    category: string;
    icon: string;
    route: string;
}

interface Permission {
    id: number;
    name: string;
    description: string;
}

export default function Roles() {
    const [roles, setRoles] = useState<any[]>([]);
    const [pages, setPages] = useState<Record<string, Page[]>>({});
    const [platformPermissions, setPlatformPermissions] = useState<Permission[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pageIds: [] as number[],
        platformPermissionIds: [] as number[]
    });
    const [backupInfo, setBackupInfo] = useState<{ manual: BackupInfo; automatic: BackupInfo } | null>(null);
    const [backupLoading, setBackupLoading] = useState(false);
    const [showBackupPanel, setShowBackupPanel] = useState(false);

    useEffect(() => {
        fetchRoles();
        fetchPages();
        fetchPlatformPermissions();
        fetchBackupInfo();
    }, []);

    const fetchBackupInfo = async () => {
        try {
            const { data } = await apiClient.get('/database/backup/info');
            setBackupInfo(data);
        } catch (e) {
            console.error('Failed to fetch backup info', e);
        }
    };

    const formatDate = (iso?: string) => {
        if (!iso) return '-';
        return new Date(iso).toLocaleString('ar-EG', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        return bytes > 1024 * 1024
            ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
            : `${(bytes / 1024).toFixed(1)} KB`;
    };

    /** Trigger browser download of a backup file */
    const downloadFile = async (type: 'manual' | 'automatic') => {
        const response = await apiClient.get(`/database/backup/download?type=${type}`, {
            responseType: 'blob',
        });
        const url = URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `magd_backup_${type}_${date}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const fetchRoles = async () => {
        try {
            const { data } = await apiClient.get('/roles');
            setRoles(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPages = async () => {
        try {
            const { data } = await apiClient.get('/roles/pages');
            setPages(data || {});
        } catch (e) {
            console.error(e);
        }
    };

    const fetchPlatformPermissions = async () => {
        try {
            const { data } = await apiClient.get('/roles/platform-permissions');
            setPlatformPermissions(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    /** Create a manual backup on the server then immediately download it */
    const handleCreateAndDownload = async () => {
        const confirmed = confirm('سيتم إنشاء نسخة احتياطية وتحميلها على جهازك. هل تريد المتابعة؟');
        if (!confirmed) return;
        setBackupLoading(true);
        try {
            await apiClient.post('/database/backup');
            await downloadFile('manual');
            await fetchBackupInfo();
        } catch (e: any) {
            alert(e.response?.data?.message || 'فشل في إنشاء النسخة الاحتياطية');
            console.error(e);
        } finally {
            setBackupLoading(false);
        }
    };

    /** Download the latest existing backup without creating a new one */
    const handleDownloadLatest = async (type: 'manual' | 'automatic') => {
        setBackupLoading(true);
        try {
            await downloadFile(type);
        } catch (e: any) {
            alert(e.response?.data?.message || 'لا توجد نسخة احتياطية للتحميل');
            console.error(e);
        } finally {
            setBackupLoading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await apiClient.patch(`/roles/${editingRole.id}`, formData);
            } else {
                await apiClient.post('/roles', formData);
            }
            setShowModal(false);
            setEditingRole(null);
            setFormData({ name: '', description: '', pageIds: [], platformPermissionIds: [] });
            fetchRoles();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to save role');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا الدور؟')) return;
        try {
            await apiClient.delete(`/roles/${id}`);
            fetchRoles();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to delete role');
        }
    };

    const openEditModal = (role: any) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description,
            pageIds: role.pages?.map((p: any) => p.page.id) || [],
            platformPermissionIds: role.permissions?.map((p: any) => p.permission.id) || []
        });
        setShowModal(true);
    };

    const togglePage = (id: number) => {
        const current = formData.pageIds;
        if (current.includes(id)) {
            setFormData({ ...formData, pageIds: current.filter(pid => pid !== id) });
        } else {
            setFormData({ ...formData, pageIds: [...current, id] });
        }
    };

    const togglePlatformPermission = (id: number) => {
        const current = formData.platformPermissionIds;
        if (current.includes(id)) {
            setFormData({ ...formData, platformPermissionIds: current.filter(pid => pid !== id) });
        } else {
            setFormData({ ...formData, platformPermissionIds: [...current, id] });
        }
    };

    const categoryNames: Record<string, string> = {
        transactions: 'المعاملات',
        inventory: 'المخزون',
        people: 'الأشخاص',
        admin: 'الإدارة'
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={32} />
                        الأدوار والصلاحيات
                    </h1>
                    <p style={{ color: '#64748b' }}>إدارة أدوار المستخدمين وصلاحياتهم في النظام</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Backup Panel Toggle */}
                    <button
                        onClick={() => setShowBackupPanel(v => !v)}
                        style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '15px',
                            fontWeight: '500',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Database size={20} />
                        النسخ الاحتياطية
                    </button>

                    {/* New Role Button */}
                    <button
                        onClick={() => {
                            setEditingRole(null);
                            setFormData({ name: '', description: '', pageIds: [], platformPermissionIds: [] });
                            setShowModal(true);
                        }}
                        style={{
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '15px',
                            fontWeight: '500'
                        }}
                    >
                        <Plus size={20} />
                        دور جديد
                    </button>
                </div>
            </div>

            {/* ====== BACKUP PANEL ====== */}
            {showBackupPanel && (
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '28px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    direction: 'rtl'
                }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={18} /> نسخة يدوية
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                            آخر نسخة: <strong>{backupInfo?.manual?.exists ? formatDate(backupInfo.manual.createdAt) : 'لا توجد'}</strong>
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                            الحجم: <strong>{backupInfo?.manual?.exists ? formatSize(backupInfo.manual.size) : '-'}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleCreateAndDownload}
                                disabled={backupLoading}
                                style={{
                                    background: '#10b981', color: 'white', border: 'none',
                                    padding: '10px 18px', borderRadius: '8px', cursor: backupLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600',
                                    opacity: backupLoading ? 0.7 : 1
                                }}
                            >
                                <RefreshCw size={16} />
                                {backupLoading ? 'جاري...' : 'إنشاء وتحميل'}
                            </button>
                            {backupInfo?.manual?.exists && (
                                <button
                                    onClick={() => handleDownloadLatest('manual')}
                                    disabled={backupLoading}
                                    style={{
                                        background: '#065f46', color: 'white', border: 'none',
                                        padding: '10px 18px', borderRadius: '8px', cursor: backupLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600',
                                        opacity: backupLoading ? 0.7 : 1
                                    }}
                                >
                                    <Download size={16} />
                                    تحميل الأخيرة
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={18} /> نسخة تلقائية (يومية 9م)
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                            آخر نسخة: <strong>{backupInfo?.automatic?.exists ? formatDate(backupInfo.automatic.createdAt) : 'لم تُنشأ بعد'}</strong>
                        </p>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                            الحجم: <strong>{backupInfo?.automatic?.exists ? formatSize(backupInfo.automatic.size) : '-'}</strong>
                        </p>
                        {backupInfo?.automatic?.exists ? (
                            <button
                                onClick={() => handleDownloadLatest('automatic')}
                                disabled={backupLoading}
                                style={{
                                    background: '#1d4ed8', color: 'white', border: 'none',
                                    padding: '10px 18px', borderRadius: '8px', cursor: backupLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600',
                                    opacity: backupLoading ? 0.7 : 1
                                }}
                            >
                                <Download size={16} />
                                تحميل النسخة التلقائية
                            </button>
                        ) : (
                            <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                                ستُنشأ تلقائياً في الساعة 9:00 مساءً
                            </p>
                        )}
                    </div>
                </div>
            )}


            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {roles.map(role => (
                    <div key={role.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>{role.name}</h3>
                                <p style={{ fontSize: '14px', color: '#64748b' }}>{role.description || 'لا يوجد وصف'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => openEditModal(role)} style={{ background: '#eff6ff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#2563eb' }}>
                                    <Edit size={16} />
                                </button>
                                {role.name.toUpperCase() !== 'ADMIN' && (
                                    <button onClick={() => handleDelete(role.id)} style={{ background: '#fef2f2', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}>
                                        <Trash size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                                الصفحات المتاحة ({role.pages?.length || 0})
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {role.pages?.slice(0, 4).map((p: any) => (
                                    <span key={p.page.id} style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                        {p.page.nameAr}
                                    </span>
                                ))}
                                {role.pages?.length > 4 && (
                                    <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                        +{role.pages.length - 4} أخرى
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                                منصات البيع ({role.permissions?.length || 0})
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {role.permissions?.slice(0, 3).map((p: any) => (
                                    <span key={p.permission.id} style={{ background: '#fef3c7', color: '#ca8a04', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                        {p.permission.name.split(':')[1]?.toUpperCase()}
                                    </span>
                                ))}
                                {role.permissions?.length > 3 && (
                                    <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                                        +{role.permissions.length - 3} أخرى
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{editingRole ? 'تعديل الدور' : 'دور جديد'}</h2>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                            {/* Basic Info */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>اسم الدور</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>الوصف</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '80px' }}
                                />
                            </div>

                            {/* Page-Based Permissions */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
                                    الصفحات المتاحة
                                </h3>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {Object.entries(pages).map(([category, categoryPages]) => (
                                        <div key={category} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                                                {categoryNames[category] || category}
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                {categoryPages.map(page => (
                                                    <div
                                                        key={page.id}
                                                        onClick={() => togglePage(page.id)}
                                                        style={{
                                                            padding: '12px',
                                                            border: formData.pageIds.includes(page.id) ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            background: formData.pageIds.includes(page.id) ? '#eff6ff' : 'white',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            border: formData.pageIds.includes(page.id) ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            background: formData.pageIds.includes(page.id) ? '#3b82f6' : 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {formData.pageIds.includes(page.id) && <Check size={14} color="white" />}
                                                        </div>
                                                        <span style={{ fontWeight: '500', fontSize: '14px' }}>{page.nameAr}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Platform Permissions */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>
                                    منصات البيع
                                </h3>
                                <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                                        {platformPermissions.map(perm => (
                                            <div
                                                key={perm.id}
                                                onClick={() => togglePlatformPermission(perm.id)}
                                                style={{
                                                    padding: '12px',
                                                    border: formData.platformPermissionIds.includes(perm.id) ? '2px solid #f59e0b' : '2px solid #fde68a',
                                                    borderRadius: '8px',
                                                    background: formData.platformPermissionIds.includes(perm.id) ? '#fef3c7' : 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    border: formData.platformPermissionIds.includes(perm.id) ? '2px solid #f59e0b' : '2px solid #fde68a',
                                                    borderRadius: '4px',
                                                    background: formData.platformPermissionIds.includes(perm.id) ? '#f59e0b' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {formData.platformPermissionIds.includes(perm.id) && <Check size={14} color="white" />}
                                                </div>
                                                <span style={{ fontWeight: '600', fontSize: '13px' }}>
                                                    {perm.name.split(':')[1]?.toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button type="submit" style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                                    حفظ التغييرات
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
