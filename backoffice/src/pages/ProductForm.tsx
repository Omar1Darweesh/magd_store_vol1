import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { X } from 'lucide-react';
import { COLORS_LIST, getColorHex, isLightColor } from '../utils/colors';
import JsBarcode from 'jsbarcode';

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

interface Supplier {
    id: number;
    name: string;
}

interface ProductFormProps {
    product?: any;
    onClose: () => void;
    onSave: () => void;
}

function ColorFreeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const hex = getColorHex(value);
    const isKnown = value.trim() !== '' && hex !== '#e2e8f0';
    const isMulti = hex === 'multicolor';
    const light = isLightColor(value);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', background: 'white', minHeight: '50px' }}>
            {/* Live color swatch */}
            <div style={{
                width: '30px', height: '30px', borderRadius: '6px', flexShrink: 0,
                background: isMulti
                    ? 'linear-gradient(135deg,#ef4444 0%,#f59e0b 25%,#22c55e 50%,#3b82f6 75%,#a855f7 100%)'
                    : (isKnown ? hex : '#f1f5f9'),
                border: isKnown ? (light ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.2)') : '2px dashed #cbd5e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {!isKnown && !isMulti && (
                    <span style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1 }}>?</span>
                )}
            </div>
            <input
                list="color-datalist"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="اكتب اسم اللون (مثال: أحمر، أزرق، Blue...)"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', background: 'transparent', minWidth: 0 }}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', flexShrink: 0, lineHeight: 1 }}
                    title="مسح"
                >✕</button>
            )}
            <datalist id="color-datalist">
                {COLORS_LIST.map(c => (
                    <option key={c.value} value={c.value}>{c.labelEn}</option>
                ))}
            </datalist>
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
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

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
    const barcodeRef = useRef<SVGSVGElement>(null);

    // Generate EAN-13 barcode (prefix 200 = internal/in-store use)
    const generateEAN13 = (): string => {
        const prefix = '200';
        const randomPart = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
        const withoutCheck = prefix + randomPart;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(withoutCheck[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return withoutCheck + checkDigit;
    };

    const printLabel = () => {
        const barcodeValue = formData.barcode;
        if (!barcodeValue) return;
        const svgData = barcodeRef.current ? barcodeRef.current.outerHTML : '';
        const productName = formData.nameAr || formData.nameEn || 'منتج';
        const price = formData.priceRetail;
        const code = formData.code || '';
        const printWindow = window.open('', '_blank', 'width=500,height=350');
        if (!printWindow) return;
        printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تسمية منتج</title>
  <style>
    body { margin: 0; padding: 8px; font-family: Arial, sans-serif; }
    .label { width: 58mm; min-height: 38mm; padding: 4px; border: 1px solid #000; display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .product-name { font-size: 10pt; font-weight: bold; text-align: center; }
    .price { font-size: 13pt; font-weight: bold; }
    .code { font-size: 8pt; color: #555; }
    .barcode-wrap svg { width: 52mm !important; height: auto; }
    @media print { body { margin: 0; padding: 0; } @page { margin: 5mm; size: 62mm 45mm; } }
  </style>
</head>
<body>
  <div class="label">
    <div class="product-name">${productName}</div>
    ${price ? `<div class="price">${price.toFixed(2)} ج.م</div>` : ''}
    ${code ? `<div class="code">${code}</div>` : ''}
    <div class="barcode-wrap">${svgData}</div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
        printWindow.document.close();
    };

    // Load categories on mount
    useEffect(() => {
        fetchCategories();
        apiClient.get('/purchasing/suppliers?active=true&take=200').then(r => {
            setSuppliers(r.data?.data || r.data || []);
        }).catch(() => { });
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

            // Load supplier
            if (product.supplierId) {
                setSelectedSupplierId(product.supplierId);
            } else if (product.supplier?.id) {
                setSelectedSupplierId(product.supplier.id);
            } else {
                setSelectedSupplierId(null);
            }

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

            }
            // Product only has a direct category (no itemType hierarchy)
            else if (product.category) {
                setSelectedCategoryId(product.category.id);
                loadSubcategories(product.category.id);
            }

        }
    }, [product]);

    // Render barcode SVG whenever barcode value changes
    useEffect(() => {
        if (formData.barcode && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, formData.barcode, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 12,
                    margin: 8,
                });
            } catch (_) {
                // invalid barcode value
            }
        }
    }, [formData.barcode]);

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
            loadSubcategories(categoryId);
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

        // Validation: at least a category must be selected
        if (!selectedCategoryId) {
            alert('الرجاء اختيار التصنيف');
            return;
        }


        setLoading(true);

        try {
            const { initialStock, costAvg, ...baseData } = formData;

            let payload: any = {
                ...baseData,
                itemTypeId: selectedItemTypeId || null,
                categoryId: selectedCategoryId,
                supplierId: selectedSupplierId || null,
            };

            // For editing existing products, send the relevant cost field
            if (product) {
                if (formData.costMethod === 'COST_AVG') {
                    payload.costAvg = costAvg;
                    delete payload.cost;
                } else {
                    // LAST_PRICE: send cost (last purchase price)
                    payload.cost = formData.cost;
                    payload.costAvg = costAvg;
                }
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

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
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

                            {/* Subcategory - always shown, optional */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    2️⃣ التصنيف الفرعي
                                    <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.8 }}> (اختياري)</span>
                                </label>
                                <select
                                    value={selectedSubcategoryId || ''}
                                    onChange={(e) => handleSubcategoryChange(Number(e.target.value) || null)}
                                    disabled={!selectedCategoryId || subcategories.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#1f2937',
                                        opacity: !selectedCategoryId ? 0.5 : 1,
                                    }}
                                >
                                    <option value="">
                                        {!selectedCategoryId ? 'اختر التصنيف أولاً...'
                                            : subcategories.length === 0 ? 'لا توجد تصنيفات فرعية'
                                            : 'بدون تصنيف فرعي'}
                                    </option>
                                    {subcategories.map((sub) => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.nameAr || sub.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Item Type - always shown, optional */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                                    3️⃣ نوع الصنف
                                    <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.8 }}> (اختياري)</span>
                                </label>
                                <select
                                    value={selectedItemTypeId || ''}
                                    onChange={(e) => setSelectedItemTypeId(Number(e.target.value) || null)}
                                    disabled={!selectedSubcategoryId || itemTypes.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        background: 'rgba(255,255,255,0.9)',
                                        color: '#1f2937',
                                        opacity: !selectedSubcategoryId ? 0.5 : 1,
                                    }}
                                >
                                    <option value="">
                                        {!selectedSubcategoryId ? 'اختر الفرعي أولاً...'
                                            : itemTypes.length === 0 ? 'لا توجد أنواع'
                                            : 'بدون نوع صنف'}
                                    </option>
                                    {itemTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.nameAr || type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Breadcrumb Preview */}
                        {selectedCategoryId && (
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
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>الباركود *</label>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    required
                                    placeholder="أدخل الباركود أو اضغط توليد"
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        letterSpacing: '0.05em',
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, barcode: generateEAN13() })}
                                    style={{
                                        padding: '0.75rem 1.1rem',
                                        background: '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title="توليد باركود EAN-13 تلقائياً"
                                >
                                    🔁 توليد باركود
                                </button>
                                {formData.barcode && (
                                    <button
                                        type="button"
                                        onClick={printLabel}
                                        style={{
                                            padding: '0.75rem 1.1rem',
                                            background: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                        }}
                                        title="طباعة تسمية المنتج"
                                    >
                                        🖨️ طباعة تسمية
                                    </button>
                                )}
                            </div>
                            {/* Live barcode preview */}
                            {formData.barcode && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    padding: '1rem',
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                }}>
                                    <svg ref={barcodeRef} />
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>✅ معاينة الباركود — قابل للمسح بالقارئ</span>
                                </div>
                            )}
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

                        {/* Supplier */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>المورد</label>
                            <select
                                value={selectedSupplierId || ''}
                                onChange={(e) => setSelectedSupplierId(Number(e.target.value) || null)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                    background: 'white',
                                }}
                            >
                                <option value="">بدون مورد</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Size */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>المقاس (Size)</label>
                            <input
                                list="size-datalist"
                                value={formData.size}
                                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                placeholder="اكتب المقاس أو اختر من القائمة (مثال: XL، 42، 6-8Y...)"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.5rem',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <datalist id="size-datalist">
                                <option value="XS" />
                                <option value="S" />
                                <option value="M" />
                                <option value="L" />
                                <option value="XL" />
                                <option value="XXL" />
                                <option value="XXXL" />
                                <option value="36" />
                                <option value="37" />
                                <option value="38" />
                                <option value="39" />
                                <option value="40" />
                                <option value="41" />
                                <option value="42" />
                                <option value="43" />
                                <option value="44" />
                                <option value="45" />
                                <option value="46" />
                                <option value="2-3Y" />
                                <option value="3-4Y" />
                                <option value="4-5Y" />
                                <option value="5-6Y" />
                                <option value="6-8Y" />
                                <option value="8-10Y" />
                                <option value="10-12Y" />
                            </datalist>
                        </div>

                        {/* Color */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>اللون (Color)</label>
                            <ColorFreeInput
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

                        {/* Cost - For new products */}
                        {!product && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    سعر التكلفة *
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

                        {/* Cost editing - Show based on costMethod */}
                        {product && formData.costMethod === 'COST_AVG' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    💰 متوسط التكلفة (Cost Average) *
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
                                        border: '2px solid #6366f1',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        background: '#f0f0ff',
                                    }}
                                />
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    آخر تكلفة شراء: <strong>{formData.cost.toFixed(2)} ج.م</strong>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6366f1', marginTop: '0.15rem', fontWeight: 500 }}>
                                    📊 يتم حساب سعر البيع بناءً على متوسط التكلفة
                                </div>
                            </div>
                        )}

                        {product && formData.costMethod === 'LAST_PRICE' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    💰 آخر سعر شراء (Last Price) *
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
                                        border: '2px solid #f59e0b',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        background: '#fffbeb',
                                    }}
                                />
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    متوسط التكلفة: <strong>{formData.costAvg.toFixed(2)} ج.م</strong>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.15rem', fontWeight: 500 }}>
                                    📊 يتم حساب سعر البيع بناءً على آخر سعر شراء
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
