import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { X, ChevronDown } from 'lucide-react';
import { COLORS_LIST, getColorHex, isLightColor } from '../utils/colors';

interface Category {
    id: number;
    name: string;
    nameAr: string;
    defaultRetailMargin?: number;
    defaultWholesaleMargin?: number;
}

interface Subcategory {
    id: number;
    name: string;
    nameAr: string;
    categoryId: number;
    defaultRetailMargin?: number;
    defaultWholesaleMargin?: number;
}

interface ItemType {
    id: number;
    name: string;
    nameAr: string;
    subcategoryId: number;
    defaultRetailMargin?: number;
    defaultWholesaleMargin?: number;
}

interface ProductFormProps {
    product?: any;
    onClose: () => void;
    onSave: () => void;
}

function ColorPickerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const selected = COLORS_LIST.find(c => c.value === value);
    const hex = selected ? getColorHex(selected.value) : null;
    const isMulti = hex === 'multicolor';
    const light = selected ? isLightColor(selected.value) : false;
    return (
        <div style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none',
                    border: '1px solid #d1d5db', borderRadius: '0.5rem',
                    background: 'white', fontSize: '1rem', minHeight: '50px',
                }}
            >
                {selected ? (
                    <>
                        {isMulti ? (
                            <span style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0, background: 'linear-gradient(135deg,#ef4444 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#a855f7 100%)', border: '1px solid rgba(0,0,0,0.12)' }} />
                        ) : (
                            <span style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0, background: hex!, border: light ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.18)' }} />
                        )}
                        <span style={{ flex: 1, fontWeight: 600 }}>{selected.labelAr}</span>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{selected.labelEn}</span>
                    </>
                ) : (
                    <span style={{ flex: 1, color: '#6b7280' }}>بدون لون</span>
                )}
                <ChevronDown size={16} color="#9ca3af" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                        background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', maxHeight: '320px', overflowY: 'auto',
                    }}>
                        <div
                            onClick={() => { onChange(''); setOpen(false); }}
                            style={{ padding: '11px 14px', cursor: 'pointer', fontSize: '0.9rem', color: '#6b7280', borderBottom: '1px solid #f3f4f6', background: !value ? '#f0f4ff' : 'white' }}
                            onMouseEnter={e => { if (value) e.currentTarget.style.background = '#f9fafb'; }}
                            onMouseLeave={e => { if (value) e.currentTarget.style.background = 'white'; }}
                        >
                            بدون لون
                        </div>
                        {COLORS_LIST.map(c => {
                            const cHex = getColorHex(c.value);
                            const cMulti = cHex === 'multicolor';
                            const cLight = isLightColor(c.value);
                            const isActive = value === c.value;
                            return (
                                <div
                                    key={c.value}
                                    onClick={() => { onChange(c.value); setOpen(false); }}
                                    style={{
                                        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                                        background: isActive ? '#f0f4ff' : 'white', fontSize: '0.9rem',
                                        borderBottom: '1px solid #f9fafb',
                                    }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'white'; }}
                                >
                                    {cMulti ? (
                                        <span style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0, background: 'linear-gradient(135deg,#ef4444 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#a855f7 100%)', border: '1px solid rgba(0,0,0,0.12)' }} />
                                    ) : (
                                        <span style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0, background: cHex, border: cLight ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.18)' }} />
                                    )}
                                    <span style={{ fontWeight: isActive ? 700 : 500, color: '#111827', flex: 1 }}>{c.labelAr}</span>
                                    <span style={{ fontSize: '13px', color: '#9ca3af' }}>{c.labelEn}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
    // Hierarchy data
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [itemTypes, setItemTypes] = useState<ItemType[]>([]);

    // Selected values
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
    const [selectedItemTypeId, setSelectedItemTypeId] = useState<number | null>(null);

    // ✅ Special category mode (Mixed or Defective)
    const [isSpecialCategory, setIsSpecialCategory] = useState(false);
    const [specialCategoryType, setSpecialCategoryType] = useState<'mixed' | 'defective' | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        code: '',
        barcode: '',
        nameEn: '',
        nameAr: '',
        brand: '',
        size: '',
        color: '',
        unit: 'PCS',
        cost: 0,
        costAvg: 0,
        costMethod: 'COST_AVG' as 'COST_AVG' | 'LAST_PRICE',
        priceRetail: 0,
        priceWholesale: 0,
        minQty: 3,
        maxQty: 15,
        initialStock: 0,
        active: true,
    });

    const [loading, setLoading] = useState(false);

    // Load categories on mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // Load existing product data
    useEffect(() => {
        if (product) {
            setFormData({
                code: product.code || '',
                barcode: product.barcode || '',
                nameEn: product.nameEn || '',
                nameAr: product.nameAr || '',
                brand: product.brand || '',
                size: product.size || '',
                color: product.color || '',
                unit: product.unit || 'PCS',
                cost: Number(product.cost) || 0,
                costAvg: Number(product.costAvg) || 0,
                costMethod: product.costMethod || 'COST_AVG',
                priceRetail: Number(product.priceRetail) || 0,
                priceWholesale: Number(product.priceWholesale) || 0,
                minQty: product.minQty || 3,
                maxQty: product.maxQty || 15,
                initialStock: product.stock || 0,
                active: product.active ?? true,
            });

            // Load hierarchy if product has itemType
            if (product.itemType) {
                const itemType = product.itemType;
                const subcategory = itemType.subcategory;
                const category = subcategory?.category;

                if (category) {
                    setSelectedCategoryId(category.id);
                    loadSubcategories(category.id);
                }

                if (subcategory) {
                    setSelectedSubcategoryId(subcategory.id);
                    loadItemTypes(subcategory.id);
                }

                if (itemType) {
                    setSelectedItemTypeId(itemType.id);
                }
                setIsSpecialCategory(false); // ✅ Fixed
                setSpecialCategoryType(null);  // ✅ Also set this

            }
            // ✅ Check if it's a special category product (Mixed or Defective)
            else if (product.category) {
                setSelectedCategoryId(product.category.id);
                const isMixed = product.category.name?.toLowerCase() === 'mixed' ||
                    product.category.nameAr === 'متنوع';
                const isDefective = product.category.name?.toLowerCase() === 'defective' ||
                    product.category.nameAr === 'تلافيات';

                setIsSpecialCategory(isMixed || isDefective);
                setSpecialCategoryType(isMixed ? 'mixed' : isDefective ? 'defective' : null);
            }

        }
    }, [product]);

    // ✅ AUTO-CALCULATE PRICES EFFECT
    useEffect(() => {
        // Only auto-calc if NOT editing an existing product (user intent might be to keep old prices)
        // OR if the user is actively changing cost/category on a new product.
        // Actually, even for existing products, if they change the cost, they MIGHT want auto-update?
        // Let's stick to: if Cost/CostAvg changes or Hierarchy changes, we update prices.

        recalculatePrices();
    }, [formData.cost, formData.costAvg, selectedCategoryId, selectedSubcategoryId, selectedItemTypeId, categories, subcategories, itemTypes]);

    const recalculatePrices = () => {
        // Use cost based on costMethod setting
        const costValue = product
            ? (formData.costMethod === 'LAST_PRICE' ? Number(formData.cost) : Number(formData.costAvg)) || 0
            : Number(formData.cost) || 0;
        if (costValue <= 0) return;

        let retailMargin = 0;
        let wholesaleMargin = 0;
        let foundMargin = false;

        // 1. Try Item Type
        if (selectedItemTypeId) {
            const it = itemTypes.find(t => t.id === selectedItemTypeId);
            if (it?.defaultRetailMargin != null) {
                retailMargin = it.defaultRetailMargin;
                wholesaleMargin = it.defaultWholesaleMargin || 0;
                foundMargin = true;
            }
        }

        // 2. Try Subcategory
        if (!foundMargin && selectedSubcategoryId) {
            const sub = subcategories.find(s => s.id === selectedSubcategoryId);
            if (sub?.defaultRetailMargin != null) {
                retailMargin = sub.defaultRetailMargin;
                wholesaleMargin = sub.defaultWholesaleMargin || 0;
                foundMargin = true;
            }
        }

        // 3. Try Category
        if (!foundMargin && selectedCategoryId) {
            const cat = categories.find(c => c.id === selectedCategoryId);
            if (cat?.defaultRetailMargin != null) {
                retailMargin = cat.defaultRetailMargin;
                wholesaleMargin = cat.defaultWholesaleMargin || 0;
                foundMargin = true;
            }
        }

        // Apply margins if found
        if (foundMargin) {
            const newRetail = costValue * (1 + retailMargin);
            const newWholesale = costValue * (1 + wholesaleMargin);

            // Only update if different to avoid infinite loops if we were also listening to price
            if (Math.abs(newRetail - formData.priceRetail) > 0.01 || Math.abs(newWholesale - formData.priceWholesale) > 0.01) {
                setFormData(prev => ({
                    ...prev,
                    priceRetail: parseFloat(newRetail.toFixed(2)),
                    priceWholesale: parseFloat(newWholesale.toFixed(2))
                }));
            }
        }
    };


    const fetchCategories = async () => {
        try {
            const { data } = await apiClient.get('/products/categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const loadSubcategories = async (categoryId: number) => {
        try {
            const { data } = await apiClient.get(`/products/subcategories?categoryId=${categoryId}`);
            setSubcategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch subcategories:', error);
        }
    };

    const loadItemTypes = async (subcategoryId: number) => {
        try {
            const { data } = await apiClient.get(`/products/item-types?subcategoryId=${subcategoryId}`);
            setItemTypes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch item types:', error);
        }
    };

    const handleCategoryChange = (categoryId: number | null) => {
        setSelectedCategoryId(categoryId);
        setSelectedSubcategoryId(null);
        setSelectedItemTypeId(null);
        setSubcategories([]);
        setItemTypes([]);

        if (categoryId) {
            const category = categories.find(c => c.id === categoryId);
            const isMixed = category?.name?.toLowerCase() === 'mixed' || category?.nameAr === 'متنوع';
            const isDefective = category?.name?.toLowerCase() === 'defective' || category?.nameAr === 'تلافيات';

            setIsSpecialCategory(isMixed || isDefective);
            setSpecialCategoryType(isMixed ? 'mixed' : isDefective ? 'defective' : null);

            // Only load subcategories if NOT special category
            if (!isMixed && !isDefective) {
                loadSubcategories(categoryId);
            }
        } else {
            setIsSpecialCategory(false);
            setSpecialCategoryType(null);
        }
        // Recalc will trigger via useEffect
    };


    const handleSubcategoryChange = (subcategoryId: number | null) => {
        setSelectedSubcategoryId(subcategoryId);
        setSelectedItemTypeId(null);
        setItemTypes([]);
        if (subcategoryId) {
            loadItemTypes(subcategoryId);
        }
        // Recalc will trigger via useEffect
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading) {
            console.log('⚠️ Already submitting, blocked duplicate request');
            return;
        }

        // ✅ UPDATED VALIDATION: Special categories only need categoryId
        if (!selectedCategoryId) {
            alert('الرجاء اختيار التصنيف');
            return;
        }

        if (!isSpecialCategory && !selectedItemTypeId) {
            alert('الرجاء اختيار التصنيف الكامل (التصنيف الرئيسي → الفرعي → نوع الصنف)');
            return;
        }


        setLoading(true);

        try {
            const { initialStock, costAvg, ...baseData } = formData;

            // ✅ UPDATED PAYLOAD: null itemTypeId for special categories
            let payload: any = {
                ...baseData,
                itemTypeId: isSpecialCategory ? null : selectedItemTypeId,
                categoryId: selectedCategoryId,
            };

            // ✅ For editing existing products, include costAvg
            if (product) {
                payload.costAvg = costAvg;
                delete payload.cost; // Remove cost field for updates
            }
            // For new products, cost is already in baseData


            console.log('✅ Submitting product:', payload);

            if (product) {
                await apiClient.patch(`/products/${product.id}`, payload);
            } else {
                await apiClient.post('/products', { ...payload, initialStock });
            }

            console.log('✅ Product saved successfully!');

            onSave();
            onClose();

        } catch (error: any) {
            console.error('❌ Error saving product:', error);

            let errorMessage = 'فشل حفظ المنتج';

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 409) {
                errorMessage = 'يوجد منتج بنفس الكود أو الباركود بالفعل';
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'خطأ في الاتصال بالخادم';
            }

            alert(errorMessage);
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        //onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    maxWidth: '900px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {product ? 'تعديل منتج' : 'إضافة منتج جديد'}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            color: '#6b7280',
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* ========================================== */}
                    {/* HIERARCHY SELECTION */}
                    {/* ========================================== */}
                    <div
                        style={{
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '0.5rem',
                            color: 'white',
                        }}
                    >
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
                            🏷️ التصنيف
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: isSpecialCategory ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
                            {/* Category */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    1️⃣ التصنيف الرئيسي *
                                </label>
                                <select
                                    value={selectedCategoryId || ''}
                                    onChange={(e) => handleCategoryChange(Number(e.target.value) || null)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#1f2937',
                                    }}
                                >
                                    <option value="">اختر التصنيف...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nameAr || cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ✅ Subcategory - Hidden for Mixed */}
                            {!isSpecialCategory && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                        2️⃣ التصنيف الفرعي *
                                    </label>
                                    <select
                                        value={selectedSubcategoryId || ''}
                                        onChange={(e) => handleSubcategoryChange(Number(e.target.value) || null)}
                                        required
                                        disabled={!selectedCategoryId || subcategories.length === 0}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.95rem',
                                            background: 'rgba(255,255,255,0.9)',
                                            color: '#1f2937',
                                            opacity: !selectedCategoryId ? 0.6 : 1,
                                        }}
                                    >
                                        <option value="">
                                            {!selectedCategoryId ? 'اختر التصنيف أولاً...' : 'اختر التصنيف الفرعي...'}
                                        </option>
                                        {subcategories.map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.nameAr || sub.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* ✅ Item Type - Hidden for Mixed */}
                            {!isSpecialCategory && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                        3️⃣ نوع الصنف *
                                    </label>
                                    <select
                                        value={selectedItemTypeId || ''}
                                        onChange={(e) => setSelectedItemTypeId(Number(e.target.value) || null)}
                                        required
                                        disabled={!selectedSubcategoryId || itemTypes.length === 0}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.95rem',
                                            background: 'rgba(255,255,255,0.9)',
                                            color: '#1f2937',
                                            opacity: !selectedSubcategoryId ? 0.6 : 1,
                                        }}
                                    >
                                        <option value="">
                                            {!selectedSubcategoryId ? 'اختر التصنيف الفرعي أولاً...' : 'اختر نوع الصنف...'}
                                        </option>
                                        {itemTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.nameAr || type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* ✅ Special Category Indicator */}
                        {isSpecialCategory && (
                            <div style={{
                                padding: '1rem',
                                background: specialCategoryType === 'defective'
                                    ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                borderRadius: '0.5rem',
                                marginTop: '1rem',
                            }}>
                                <div style={{
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    color: specialCategoryType === 'defective' ? '#7f1d1d' : '#92400e',
                                    marginBottom: '0.5rem'
                                }}>
                                    {specialCategoryType === 'defective' ? '⚠️ منتج تالف (Defective Product)' : '🔧 منتج متنوع (Mixed Product)'}
                                </div>
                                <div style={{
                                    fontSize: '0.9rem',
                                    color: specialCategoryType === 'defective' ? '#991b1b' : '#78350f'
                                }}>
                                    ✓ لا يحتاج إلى فئة فرعية أو نوع صنف - يمكنك الانتقال مباشرة لملء بيانات المنتج
                                </div>
                            </div>
                        )}


                        {/* Breadcrumb Preview - Only for hierarchical */}
                        {!isSpecialCategory && selectedCategoryId && (
                            <div
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    textAlign: 'center',
                                }}
                            >
                                <strong>المسار الكامل:</strong>{' '}
                                {categories.find((c) => c.id === selectedCategoryId)?.nameAr || 'التصنيف'}
                                {selectedSubcategoryId && (
                                    <>
                                        {' → '}
                                        {subcategories.find((s) => s.id === selectedSubcategoryId)?.nameAr || 'التصنيف الفرعي'}
                                    </>
                                )}
                                {selectedItemTypeId && (
                                    <>
                                        {' → '}
                                        {itemTypes.find((t) => t.id === selectedItemTypeId)?.nameAr || 'نوع الصنف'}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========================================== */}
                    {/* PRODUCT DETAILS */}
                    {/* ========================================== */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {/* English Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                الاسم (English) *
                            </label>
                            <input
                                type="text"
                                value={formData.nameEn}
                                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Arabic Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                الاسم (عربي)
                            </label>
                            <input
                                type="text"
                                value={formData.nameAr}
                                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                    textAlign: 'right',
                                }}
                            />
                        </div>

                        {/* Barcode */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الباركود *</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Code */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                الكود (اتركه فارغاً للإنشاء التلقائي)
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="سيتم توليده تلقائياً"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Brand */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الماركة</label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Size */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>المقاس (Size)</label>
                            <select
                                value={formData.size}
                                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            >
                                <option value="">بدون مقاس</option>
                                <optgroup label="مقاسات ملابس">
                                    <option value="XS">XS - صغير جداً</option>
                                    <option value="S">S - صغير</option>
                                    <option value="M">M - وسط</option>
                                    <option value="L">L - كبير</option>
                                    <option value="XL">XL - كبير جداً</option>
                                    <option value="XXL">XXL - كبير جداً ٢</option>
                                    <option value="XXXL">XXXL - كبير جداً ٣</option>
                                </optgroup>
                                <optgroup label="مقاسات أحذية">
                                    <option value="36">36</option>
                                    <option value="37">37</option>
                                    <option value="38">38</option>
                                    <option value="39">39</option>
                                    <option value="40">40</option>
                                    <option value="41">41</option>
                                    <option value="42">42</option>
                                    <option value="43">43</option>
                                    <option value="44">44</option>
                                    <option value="45">45</option>
                                    <option value="46">46</option>
                                </optgroup>
                                <optgroup label="مقاسات أطفال">
                                    <option value="2-3Y">2-3 سنوات</option>
                                    <option value="3-4Y">3-4 سنوات</option>
                                    <option value="4-5Y">4-5 سنوات</option>
                                    <option value="5-6Y">5-6 سنوات</option>
                                    <option value="6-8Y">6-8 سنوات</option>
                                    <option value="8-10Y">8-10 سنوات</option>
                                    <option value="10-12Y">10-12 سنوات</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Color */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>اللون (Color)</label>
                            <ColorPickerSelect
                                value={formData.color}
                                onChange={(v) => setFormData({ ...formData, color: v })}
                            />
                        </div>

                        {/* Unit */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الوحدة *</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            >
                                <option value="PCS">PCS - قطعة</option>
                                <option value="BOX">BOX - علبة</option>
                                <option value="KG">KG - كيلو</option>
                                <option value="L">L - لتر</option>
                                <option value="M">M - متر</option>
                            </select>
                        </div>

                        {/* Cost Method */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>طريقة احتساب التكلفة</label>
                            <select
                                value={formData.costMethod}
                                onChange={(e) => setFormData({ ...formData, costMethod: e.target.value as 'COST_AVG' | 'LAST_PRICE' })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            >
                                <option value="COST_AVG">متوسط التكلفة (Cost Average)</option>
                                <option value="LAST_PRICE">آخر سعر شراء (Last Price)</option>
                            </select>
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                {formData.costMethod === 'LAST_PRICE'
                                    ? '💡 سيتم احتساب سعر البيع بناءً على آخر سعر شراء'
                                    : '💡 سيتم احتساب سعر البيع بناءً على متوسط التكلفة'}
                            </p>
                        </div>

                        {/* Cost (Last Purchase) - Only for new products */}
                        {!product && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    سعر التكلفة (Cost) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                    }}
                                />
                            </div>
                        )}

                        {/* Cost Average - Only for editing existing products */}
                        {product && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    متوسط التكلفة (Cost Average) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.costAvg}
                                    onChange={(e) => setFormData({ ...formData, costAvg: Number(e.target.value) })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                    }}
                                />
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    آخر تكلفة شراء: {formData.cost.toFixed(2)} ج.م
                                </div>
                            </div>
                        )}

                        {/* Retail Price */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                سعر البيع (قطاعي) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.priceRetail}
                                onChange={(e) => setFormData({ ...formData, priceRetail: Number(e.target.value) })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Wholesale Price */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                سعر البيع (جملة)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.priceWholesale}
                                onChange={(e) => setFormData({ ...formData, priceWholesale: Number(e.target.value) })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Min Qty */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الحد الأدنى</label>
                            <input
                                type="number"
                                value={formData.minQty}
                                onChange={(e) => setFormData({ ...formData, minQty: Number(e.target.value) })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Max Qty */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الحد الأقصى</label>
                            <input
                                type="number"
                                value={formData.maxQty}
                                onChange={(e) => setFormData({ ...formData, maxQty: Number(e.target.value) })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                }}
                            />
                        </div>

                        {/* Initial Stock */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                📦 {product ? 'الكمية الحالية في المخزون' : 'الكمية الابتدائية (عند الإنشاء فقط)'}
                            </label>
                            <input
                                type="number"
                                value={formData.initialStock}
                                onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                                min="0"
                                disabled={!!product}
                                placeholder={product ? 'للتعديل استخدم صفحة جرد المخزون' : 'أدخل الكمية الابتدائية'}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                    background: product ? '#f3f4f6' : 'white',
                                    cursor: product ? 'not-allowed' : 'text',
                                    opacity: product ? 0.6 : 1,
                                    fontWeight: product ? 600 : 400,
                                    color: product ? '#374151' : 'inherit',
                                }}
                            />
                            {!product && (
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    💡 سيتم إضافة هذه الكمية تلقائياً إلى المخزون
                                </p>
                            )}
                            {product && (
                                <p style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.25rem', fontWeight: 500 }}>
                                    ℹ️ هذا هو الرصيد الحالي - للتعديل اذهب إلى صفحة "جرد المخزون"
                                </p>
                            )}
                        </div>

                        {/* Active Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                id="active"
                                checked={formData.active}
                                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                            />
                            <label htmlFor="active" style={{ fontWeight: '600', cursor: 'pointer' }}>
                                منتج نشط
                            </label>
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* ACTION BUTTONS */}
                    {/* ========================================== */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: loading ? '#9ca3af' : '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '1rem',
                                opacity: loading ? 0.6 : 1,
                                pointerEvents: loading ? 'none' : 'auto',
                            }}
                        >
                            {loading ? 'جاري الحفظ...' : product ? 'تحديث المنتج' : 'حفظ المنتج'}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                background: '#e5e7eb',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                            }}
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
