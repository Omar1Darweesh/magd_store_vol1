import { useState, useRef, useEffect } from 'react';
import { Search, Trash2, ShoppingCart, User, Building, Users, Printer, LogOut, CalendarDays, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '../api/client';
import { businessDayApi } from '../api/businessDay';
import type { BusinessDay } from '../api/businessDay';
import './POS.css';

const COLOR_MAP: Record<string, string> = {
    // Arabic
    'أبيض': '#FFFFFF', 'أسود': '#111827', 'رمادي': '#9ca3af', 'بيج': '#c9b99a',
    'كريمي': '#f5f0dc', 'أحمر': '#ef4444', 'وردي': '#f9a8d4', 'برتقالي': '#fb923c',
    'أصفر': '#fbbf24', 'أخضر': '#22c55e', 'أخضر زيتي': '#4a7c59', 'أزرق': '#3b82f6',
    'أزرق سماوي': '#38bdf8', 'أزرق كحلي': '#1e3a8a', 'بنفسجي': '#a855f7',
    'بني': '#92400e', 'كاكي': '#a1855f', 'ذهبي': '#d4a017', 'فضي': '#b0b7c3',
    'متعدد الألوان': 'multicolor',
    // English aliases
    'white': '#FFFFFF', 'black': '#111827', 'gray': '#9ca3af', 'grey': '#9ca3af',
    'beige': '#c9b99a', 'cream': '#f5f0dc', 'red': '#ef4444', 'pink': '#f9a8d4',
    'orange': '#fb923c', 'yellow': '#fbbf24', 'green': '#22c55e', 'olive': '#4a7c59',
    'blue': '#3b82f6', 'sky blue': '#38bdf8', 'navy': '#1e3a8a', 'purple': '#a855f7',
    'brown': '#92400e', 'khaki': '#a1855f', 'gold': '#d4a017', 'silver': '#b0b7c3',
    'multicolor': 'multicolor', 'multi': 'multicolor',
};
const LIGHT_COLORS = new Set(['أبيض', 'كريمي', 'أصفر', 'بيج', 'فضي', 'white', 'cream', 'yellow', 'beige', 'silver']);

function getColorHex(name: string): string {
    if (!name) return '#e2e8f0';
    return COLOR_MAP[name] ?? COLOR_MAP[name.toLowerCase()] ?? '#e2e8f0';
}

function SizeBadge({ size, large }: { size: string; large?: boolean }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: large ? '34px' : '28px', height: large ? '26px' : '22px', padding: '0 7px',
            background: '#1e293b', color: 'white', borderRadius: '4px',
            fontSize: large ? '12px' : '10px', fontWeight: 800, letterSpacing: '0.5px',
            fontFamily: 'monospace', userSelect: 'none', flexShrink: 0,
        }}>
            {size}
        </span>
    );
}

function ColorSwatch({ color, large }: { color: string; large?: boolean }) {
    const hex = getColorHex(color);
    const isMulti = hex === 'multicolor';
    const isLight = LIGHT_COLORS.has(color) || LIGHT_COLORS.has(color.toLowerCase());
    const swatchSize = large ? '18px' : '14px';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: large ? '3px 9px 3px 4px' : '2px 7px 2px 3px',
            background: 'white', border: '1px solid #e2e8f0', borderRadius: '5px', flexShrink: 0,
        }}>
            {isMulti ? (
                <span style={{
                    display: 'inline-block', width: swatchSize, height: swatchSize, borderRadius: '3px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 25%, #22c55e 50%, #3b82f6 75%, #a855f7 100%)',
                    border: '1px solid rgba(0,0,0,0.12)',
                }} />
            ) : (
                <span style={{
                    display: 'inline-block', width: swatchSize, height: swatchSize, borderRadius: '3px', flexShrink: 0,
                    background: hex,
                    border: isLight ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.15)',
                }} />
            )}
            <span style={{ fontSize: large ? '12px' : '11px', fontWeight: 600, color: '#374151' }}>{color}</span>
        </span>
    );
}

interface Product {
    id: number;
    barcode: string;
    nameEn: string;
    nameAr?: string;
    code?: string;
    size?: string;
    color?: string;
    priceRetail: number;
    priceWholesale?: number;
    taxRate?: number;
    cost: number;
    stock?: number;
    supplier?: { id: number; name: string } | null;
}

interface Customer {
    id: number;
    name: string;
    type: 'RETAIL' | 'WHOLESALE';
}

interface CartItem extends Product {
    qty: number;
    discount?: number;
    price: number;
    lineTotal: number;
    priceType?: 'RETAIL' | 'WHOLESALE' | 'CUSTOM';
    customPrice?: number;
}

interface PlatformConfig {
    id: string;
    code: string;
    name: string;
    icon: string;
    tax: number;
    platform: number;
    shippingFee: number;
    btnText: string;
    active: boolean;
}

function POS() {
    const [barcode, setBarcode] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [showProductBrowser, setShowProductBrowser] = useState(false);
    const [browserProducts, setBrowserProducts] = useState<Product[]>([]);
    const [allBrowserProducts, setAllBrowserProducts] = useState<Product[]>([]); // Store all products for filtering
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [browserSearchQuery, setBrowserSearchQuery] = useState('');

    // Business day
    const [businessDay, setBusinessDay] = useState<BusinessDay | null>(null);
    const [showBdPanel, setShowBdPanel] = useState(false);
    const [bdNotes, setBdNotes] = useState('');
    const [bdBusy, setBdBusy] = useState(false);
    const [bdMessage, setBdMessage] = useState('');

    const [editingPrice, setEditingPrice] = useState<{
        productId: number;
        currentPrice: number;
        cost: number;
    } | null>(null);

    // Payment tracking states
    const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL' | 'CREDIT'>('FULL');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [deliveredNow, setDeliveredNow] = useState<boolean>(true);

    // ✅ NEW: Create customer states
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        type: 'RETAIL' as 'RETAIL' | 'WHOLESALE'
    });

    const PAYMENT_METHODS = [
        { id: 'CASH', name: 'نقدي', icon: '💵' },
        { id: 'CARD', name: 'بطاقة', icon: '💳' },
        { id: 'TRANSFER', name: 'تحويل', icon: '🏦' },
        { id: 'INSTAPAY', name: 'InstaPay', icon: '📱' },
        { id: 'FAWRY', name: 'فوري', icon: '🏪' },
        { id: 'WALLET', name: 'محفظة', icon: '👛' },
    ];

    const [CHANNELS, setChannels] = useState<Record<string, PlatformConfig>>({});
    const [activeTab, setActiveTab] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
    const [message, setMessage] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const isPrintingRef = useRef(false); // Guard against double popup
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const user = JSON.parse(localStorage.getItem('user')!);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    // ✅ NEW: Receipt printing state
    const [receiptData, setReceiptData] = useState<any | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    // Auto-update paid amount when payment type or total changes
    useEffect(() => {
        const totals = calculateTotals();
        if (paymentType === 'FULL') {
            setPaidAmount(totals.finalTotal);
            setDeliveredNow(true);
        } else if (paymentType === 'CREDIT') {
            setPaidAmount(0);
            setDeliveredNow(true); // ✅ Changed to true so stock is deducted immediately
        }
    }, [paymentType, cart, appliedDiscount, activeTab]);

    // ✅ NEW: Auto-reset payment type to FULL when no customer selected (Cash Customer)
    useEffect(() => {
        if (!selectedCustomer) {
            setPaymentType('FULL');
        }
    }, [selectedCustomer]);

    const togglePriceType = (productId: number, newType: 'RETAIL' | 'WHOLESALE') => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                let newPrice = newType === 'RETAIL' ? Number(item.priceRetail) : Number(item.priceWholesale || item.priceRetail);
                return {
                    ...item,
                    priceType: newType,
                    price: newPrice,
                    lineTotal: newPrice * item.qty,
                    customPrice: undefined
                };
            }
            return item;
        }));
    };

    const updateCustomPrice = (productId: number, newPrice: number) => {
        const item = cart.find(i => i.id === productId);
        if (!item) return;

        setCart(cart.map(i => {
            if (i.id === productId) {
                return {
                    ...i,
                    price: newPrice,
                    priceType: 'CUSTOM',
                    customPrice: newPrice,
                    lineTotal: newPrice * i.qty
                };
            }
            return i;
        }));
        setEditingPrice(null);
        setMessage(`✅ تم تعديل السعر إلى ${newPrice.toFixed(2)} ر.س`);
    };

    const loadCategories = async () => {
        try {
            const data = await apiClient.get('/products/categories');
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load categories', e);
            setCategories([]);
        }
    };

    const applyBrowserFilters = (
        prods: Product[],
        query: string,
        color: string,
        size: string
    ): Product[] => {
        let result = prods;
        if (query) {
            const q = query.toLowerCase();
            result = result.filter(p =>
                p.nameAr?.toLowerCase().includes(q) ||
                p.nameEn?.toLowerCase().includes(q) ||
                p.code?.toLowerCase().includes(q) ||
                p.barcode?.toLowerCase().includes(q) ||
                (p.color || '').toLowerCase().includes(q) ||
                (p.size || '').toLowerCase().includes(q) ||
                (p.supplier?.name || '').toLowerCase().includes(q)
            );
        }
        if (color) result = result.filter(p => p.color === color);
        if (size) result = result.filter(p => p.size === size);
        return result;
    };

    const loadSuppliers = async () => {
        try {
            const data = await apiClient.get('/purchasing/suppliers?active=true&take=200');
            setSuppliers(data?.data || data || []);
        } catch (e) {
            console.error('Failed to load suppliers', e);
        }
    };

    const loadProductsForBrowser = async (categoryId?: string, supplierId?: string) => {
        try {
            setLoadingProducts(true);
            setSelectedColor('');
            setSelectedSize('');
            setBrowserSearchQuery('');
            const branchId = user.branchId || user.branch?.id || 1;
            const params = new URLSearchParams({ branchId: String(branchId), active: 'true', take: '2000' });
            if (categoryId) params.set('categoryId', categoryId);
            if (supplierId) params.set('supplierId', supplierId);
            const url = `/products?${params.toString()}`;
            const response = await apiClient.get(url);
            const products = (response.data || response).map((p: any) => ({
                ...p,
                priceRetail: Number(p.priceRetail) || 0,
                priceWholesale: p.priceWholesale ? Number(p.priceWholesale) : undefined,
                cost: Number(p.cost) || 0,
            }));
            setBrowserProducts(products);
            setAllBrowserProducts(products); // Store for filtering
        } catch (e) {
            console.error('Failed to load products', e);
            setBrowserProducts([]);
            setAllBrowserProducts([]);
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        if (showProductBrowser) {
            loadCategories();
            loadSuppliers();
            loadProductsForBrowser();
        }
    }, [showProductBrowser]);

    const loadPlatformSettings = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get('settings/platforms');

            if (!data || !Array.isArray(data) || data.length === 0) {
                setMessage('⚠️ لا توجد منصات نشطة');
                setLoading(false);
                return;
            }

            // ✅ FIXED: Get permissions from flat array
            const userData = JSON.parse(localStorage.getItem('user')!);
            const platformPermissions = (userData?.permissions as string[])?.filter((p: string) =>
                p.startsWith('platform:')
            ) || [];


            console.log('✅ Platform permissions:', platformPermissions);

            const loadedChannels: Record<string, PlatformConfig> = {};

            data.forEach((platform: any) => {
                if (platform.active) {
                    const platformPermission = `platform:${platform.platform}`;

                    // ✅ Case-insensitive check
                    const hasPermission = platformPermissions.some(p =>
                        p.toLowerCase() === platformPermission.toLowerCase()
                    );

                    // ✅ Roles is already ['CASHIER']
                    const userRoles = userData?.roles || [];
                    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN');

                    if (hasPermission || isAdmin) {
                        loadedChannels[platform.id.toString()] = {
                            id: platform.id.toString(),
                            code: platform.platform,
                            name: platform.name,
                            icon: platform.icon || '📦',
                            tax: Number(platform.taxRate) / 100,
                            platform: Number(platform.commission) / 100,
                            shippingFee: Number(platform.shippingFee) || 0,
                            btnText: platform.name,
                            active: platform.active,
                        };
                    }
                }
            });

            setChannels(loadedChannels);

            const firstChannel = Object.keys(loadedChannels)[0];
            if (firstChannel) {
                setActiveTab(firstChannel);
            } else {
                setMessage('❌ لا تملك صلاحيات لأي منصة');
            }

            setLoading(false);
        } catch (error) {
            console.error('Failed to load platforms:', error);
            setMessage('❌ فشل تحميل المنصات');
            setLoading(false);
        }
    };

    // Add this RIGHT AFTER loadPlatformSettings function (around line 240)
    const refreshUserPermissions = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            // Fetch fresh user profile from backend
            const response = await apiClient.get('auth/me'); // ✅ Changed to 'auth/me'

            if (response) {
                // Update localStorage with fresh permissions
                const currentUser = JSON.parse(localStorage.getItem('user')!);
                const updatedUser = {
                    ...currentUser,
                    permissions: response.permissions,
                    roles: response.roles
                };

                localStorage.setItem('user', JSON.stringify(updatedUser));

                console.log('✅ Permissions refreshed:', response.permissions);

                // Reload platforms with new permissions
                await loadPlatformSettings();
            }
        } catch (error) {
            console.error('Failed to refresh permissions:', error);
            // Don't logout on error - just use cached permissions
            await loadPlatformSettings();
        }
    };


    // Add this useEffect to refresh permissions on component mount
    useEffect(() => {
        refreshUserPermissions();
    }, []); // Run once when component mounts



    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, [cart]);

    useEffect(() => {
        if (!showSearch && !showCustomerModal && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [showSearch, showCustomerModal]);

    useEffect(() => {
        if (showCustomerModal) {
            apiClient.get('/customers').then(data => setCustomersList(data.data || []));
        }
    }, [showCustomerModal]);

    useEffect(() => {
        if (cart.length > 0) {
            const newCart = cart.map(item => {
                if (item.priceType === 'CUSTOM' && item.customPrice !== undefined) {
                    return item;
                }

                let price = Number(item.priceRetail);
                let priceType: 'RETAIL' | 'WHOLESALE' = 'RETAIL';

                if (selectedCustomer?.type === 'WHOLESALE' && item.priceWholesale) {
                    price = Number(item.priceWholesale);
                    priceType = 'WHOLESALE';
                }

                return {
                    ...item,
                    price,
                    priceType,
                    lineTotal: price * item.qty,
                    customPrice: undefined
                };
            });
            setCart(newCart);
        }
    }, [selectedCustomer]);

    const playBeep = (type: 'success' | 'error') => {
        const audio = new Audio(
            type === 'success'
                ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj2LDciUFLIHO8tiJNwgZaLvt459NEAxQpPwtmMcBjiR1LMeSwFJHfH8N2QQAoUXrTp66hVFApGnDyvmwhBjuO1OKczs='
                : 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
        );
        audio.play().catch(() => { });
    };

    const handleBarcodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcode.trim()) return;

        setLoading(true);
        setMessage('');
        try {
            const branchId = user.branchId || user.branch?.id || 1;
            const data = await apiClient.get(`products/find/${barcode}?branchId=${branchId}`);
            addToCart(data);
            setMessage(`✅ ${data.nameAr || data.nameEn}`);
            setBarcode('');
        } catch (err: any) {
            playBeep('error');
            setMessage(err.response?.data?.message || '❌ المنتج غير موجود');
            setBarcode('');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const branchId = user.branchId || user.branch?.id || 1;
            const data = await apiClient.get(`/products?search=${query}&branchId=${branchId}`);
            setSearchResults(Array.isArray(data) ? data : data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const addToCart = (product: Product) => {
        const availableStock = product.stock !== undefined ? product.stock : Infinity;
        if (availableStock <= 0) {
            playBeep('error');
            setMessage('❌ المنتج غير متوفر في المخزون');
            return;
        }

        let appliedPrice = Number(product.priceRetail);
        let priceType: 'RETAIL' | 'WHOLESALE' = 'RETAIL';

        if (selectedCustomer?.type === 'WHOLESALE' && product.priceWholesale) {
            appliedPrice = Number(product.priceWholesale);
            priceType = 'WHOLESALE';
        }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            const newQty = existingItem.qty + 1;
            if (newQty > availableStock) {
                playBeep('error');
                setMessage(`⚠️ الكمية المتاحة: ${availableStock}`);
                return;
            }
            setCart(cart.map(item =>
                item.id === product.id
                    ? { ...item, qty: newQty, lineTotal: newQty * item.price }
                    : item
            ));
        } else {
            setCart([
                ...cart,
                {
                    ...product,
                    price: appliedPrice,
                    priceType: priceType,
                    qty: 1,
                    lineTotal: appliedPrice,
                }
            ]);
        }

        playBeep('success');
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const updateQty = (productId: number, newQty: number) => {
        if (newQty <= 0) {
            setCart(cart.filter(item => item.id !== productId));
            return;
        }

        const cartItem = cart.find(item => item.id === productId);
        if (!cartItem) return;

        const availableStock = cartItem.stock !== undefined ? cartItem.stock : Infinity;
        if (newQty > availableStock) {
            playBeep('error');
            setMessage(`⚠️ الكمية المتاحة: ${availableStock}`);
            return;
        }

        setCart(cart.map(item =>
            item.id === productId
                ? { ...item, qty: newQty, lineTotal: newQty * item.price }
                : item
        ));
    };

    const calculateTotals = () => {
        if (!CHANNELS[activeTab]) {
            return {
                subtotal: 0,
                subtotalAfterDiscount: 0,
                discountAmount: 0,
                taxAmount: 0,
                platformAmount: 0,
                shippingFee: 0,
                finalTotal: 0
            };
        }

        const config = CHANNELS[activeTab];
        const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
        const discountAmount = (subtotal * appliedDiscount) / 100;
        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxAmount = subtotalAfterDiscount * config.tax;
        const platformAmount = subtotalAfterDiscount * config.platform;
        const shippingFee = config.shippingFee;
        const finalTotal = subtotalAfterDiscount + taxAmount + shippingFee;

        return {
            subtotal,
            subtotalAfterDiscount,
            discountAmount,
            taxAmount,
            platformAmount,
            shippingFee,
            finalTotal
        };
    };

    const handleApplyDiscount = () => {
        setAppliedDiscount(discountValue);
        setMessage(`✅ تم تطبيق خصم ${discountValue}%`);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            setMessage('❌ السلة فارغة');
            return;
        }

        if (!CHANNELS[activeTab]) {
            setMessage('❌ يرجى اختيار منصة');
            return;
        }

        // Validate payment type for cash-only customers
        if (!selectedCustomer && (paymentType === 'PARTIAL' || paymentType === 'CREDIT')) {
            setMessage('❌ العميل النقدي لا يمكنه الدفع آجل أو جزئي');
            playBeep('error');
            return;
        }

        setLoading(true);
        try {
            const totals = calculateTotals();
            const config = CHANNELS[activeTab];
            const paymentMethodName = PAYMENT_METHODS.find(p => p.id === paymentMethod)?.name;

            let actualPaidAmount = 0;
            if (paymentType === 'FULL') {
                actualPaidAmount = totals.finalTotal;
            } else if (paymentType === 'PARTIAL') {
                actualPaidAmount = paidAmount;
            } else if (paymentType === 'CREDIT') {
                actualPaidAmount = 0;
            }

            const saleData = {
                branchId: user.branchId || user.branch?.id || 1,
                channel: CHANNELS[activeTab].code,
                customerId: selectedCustomer?.id || null,
                lines: cart.map(item => ({
                    productId: item.id,
                    qty: item.qty,
                    unitPrice: parseFloat(item.price.toFixed(2)),
                    taxRate: parseFloat((config.tax * 100).toFixed(2)),
                    lineDiscount: 0,
                    priceType: item.priceType || 'RETAIL'  // ← ADD THIS LINE!

                })),
                paymentMethod: paymentMethod,
                totalDiscount: parseFloat(totals.discountAmount.toFixed(2)),
                platformCommission: parseFloat(totals.platformAmount.toFixed(2)),
                shippingFee: parseFloat(totals.shippingFee.toFixed(2)),
                notes: `${config.name} - ${paymentMethodName}`,
                paidAmount: actualPaidAmount,
                delivered: deliveredNow,
            };

            console.log('🔹 Sale Data:', saleData);

            const response = await apiClient.post('pos/sales', saleData);

            playBeep('success');
            setMessage(`✅ تم! رقم الفاتورة: ${response.invoiceNo}`);

            // Prepare receipt data
            const receiptDataObj = {
                invoiceNo: response.invoiceNo,
                createdAt: new Date().toISOString(),
                cart: [...cart],
                totals: totals,
                config: CHANNELS[activeTab],
                user: user,
                branch: user.branch,
                customer: selectedCustomer,
                paymentMethod: PAYMENT_METHODS.find(p => p.id === paymentMethod)?.name,
                paidAmount: actualPaidAmount,
                paymentType: paymentType,
            };

            // Set receipt data and show it
            setReceiptData(receiptDataObj);
            setShowReceipt(true);

            // Reset cart and form IMMEDIATELY (so user can start new sale)
            setCart([]);
            setPaymentMethod('CASH');
            setShowCustomerModal(false);
            setSelectedCustomer(null);
            setDiscountValue(0);
            setAppliedDiscount(0);
            setPaymentType('FULL');
            setPaidAmount(0);
            setDeliveredNow(true);

            // Print in popup (Arabic font, isolated from app CSS)
            printReceiptPopup(receiptDataObj);

        } catch (error: any) {
            console.error(error);
            playBeep('error');
            setMessage(error.response?.data?.message || '❌ فشل إتمام العملية');
        } finally {
            setLoading(false);
        }
    };


    // ✅ NEW: Create customer handler
    const handleCreateCustomer = async () => {
        if (!newCustomer.name.trim()) {
            setMessage('❌ يرجى إدخال اسم العميل');
            playBeep('error');
            return;
        }

        try {
            const response = await apiClient.post('/customers', newCustomer);
            playBeep('success');
            setMessage(`✅ تم إضافة العميل: ${newCustomer.name}`);
            setSelectedCustomer(response);
            setShowCreateCustomer(false);
            setNewCustomer({ name: '', phone: '', type: 'RETAIL' });
            setShowCustomerModal(false);
            // Reload customers list
            apiClient.get('/customers').then(data => setCustomersList(data.data || []));
        } catch (error: any) {
            playBeep('error');
            setMessage(error.response?.data?.message || '❌ فشل إضافة العميل');
        }
    };
    const printReceiptPopup = (data: any) => {
        // Prevent double-popup (StrictMode / rapid clicks)
        if (isPrintingRef.current) return;
        isPrintingRef.current = true;
        setTimeout(() => { isPrintingRef.current = false; }, 3000);

        const cart = data.cart as any[];
        const totals = data.totals;

        // Build product rows — fixed 4 columns
        const linesHTML = cart.map((line: any) => {
            const sub = (line.qty * Number(line.price)).toFixed(2);
            const name = (line.nameAr || line.nameEn || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const custom = line.priceType === 'CUSTOM' ? ' *' : '';
            return `<tr>
                <td class="n">${name}${custom}</td>
                <td class="q">${line.qty}</td>
                <td class="p">${Number(line.price).toFixed(0)}</td>
                <td class="t">${sub}</td>
              </tr>`;
        }).join('');

        const discountRow = Number(totals.discountAmount) > 0
            ? `<tr><td style="text-align:right;font-weight:800;font-size:11px;padding:2px 0">الخصم:</td><td style="text-align:left;font-weight:900;font-size:11px;padding:2px 0">-${Number(totals.discountAmount).toFixed(2)} ج.م</td></tr>` : '';
        const taxRow = Number(totals.taxAmount) > 0
            ? `<tr><td style="text-align:right;font-weight:800;font-size:11px;padding:2px 0">الضريبة:</td><td style="text-align:left;font-weight:900;font-size:11px;padding:2px 0">+${Number(totals.taxAmount).toFixed(2)} ج.م</td></tr>` : '';
        const shippingRow = Number(totals.shippingFee) > 0
            ? `<tr><td style="text-align:right;font-weight:800;font-size:11px;padding:2px 0">الشحن:</td><td style="text-align:left;font-weight:900;font-size:11px;padding:2px 0">${Number(totals.shippingFee).toFixed(2)} ج.م</td></tr>` : '';
        const customerRow = data.customer
            ? `<tr><td class="lbl">العميل:</td><td class="val">${(data.customer.name || '').replace(/</g, '&lt;')}</td></tr>` : '';
        const partialBlock = data.paymentType === 'PARTIAL' ? `
            <div class="partial">
              <table><tbody>
                <tr><td class="lbl">المدفوع:</td><td class="val">${Number(data.paidAmount).toFixed(2)} ج.م</td></tr>
                <tr><td class="lbl">المتبقي:</td><td class="val">${(Number(totals.finalTotal) - Number(data.paidAmount)).toFixed(2)} ج.م</td></tr>
              </tbody></table>
            </div>` : '';
        const creditBlock = data.paymentType === 'CREDIT'
            ? `<div class="credit">آجل — المبلغ الكامل: ${Number(totals.finalTotal).toFixed(2)} ج.م</div>` : '';

        const date = new Date(data.createdAt).toLocaleDateString('ar-EG');
        const time = new Date(data.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>Receipt</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&display=swap" rel="stylesheet">
<style>
/* ── Reset ── */
* { margin:0; padding:0; box-sizing:border-box; color:#000 !important; font-weight:900 !important; }

/* ── Body: fills popup exactly, @page controls paper ── */
body {
  font-family: 'Cairo', Tahoma, Arial, sans-serif;
  font-size: 11px;
  font-weight: 900 !important;
  color: #000 !important;
  direction: rtl;
  width: 100%;
  padding: 2mm 2mm 4mm;
  overflow: hidden;
}

/* ── Print: force 80mm paper, zero margins ── */
@media print {
  @page { size: 80mm auto; margin: 0; }
  body  { padding: 2mm 2mm 4mm; }
}

/* ── Tables: fixed layout so columns NEVER overflow ── */
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
td, th {
  overflow: hidden;
  word-break: break-word;
  padding: 0;
  font-weight: 900 !important;
  color: #000 !important;
}

/* ── Alignment helpers ── */
.lbl { text-align: right; font-weight: 800; }   /* RTL start = right */
.val { text-align: left;  font-weight: 700; }   /* RTL end   = left  */
.ctr { text-align: center; }

/* ── Dividers ── */
.thick { border: none; border-top: 2px solid #000; margin: 4px 0; }
.thin  { border: none; border-top: 1px solid #000; margin: 2px 0; }
.dash  { border: none; border-top: 1px dashed #000; margin: 5px 0; }

/* ── Header ── */
.logo      { text-align: center; padding: 3px 0 2px; }
.logo img  { width: 32mm; height: auto; }
.brand-sub { text-align: center; font-size: 9px; font-weight: 900; letter-spacing: 3px; margin-bottom: 2px; }
.branch    { text-align: center; font-size: 12px; font-weight: 900; margin-bottom: 4px; }

/* ── Info block ── */
.info td   { padding: 2px 0; font-size: 10px; }
.info .lbl { width: 42%; }
.info .val { width: 58%; }

/* ── Items table ── */
.items thead th { font-size: 10px; font-weight: 900; padding: 3px 1px; color: #000; }
.items tbody td { font-size: 10px; padding: 4px 1px; border-bottom: 1px dotted #000; color: #000; font-weight: 900 !important; }

/* Column widths — set on <th> with table-layout:fixed */
.col-n { width: 50%; text-align: right; font-weight: 800; }
.col-q { width: 14%; text-align: center; }
.col-p { width: 18%; text-align: center; }
.col-t { width: 18%; text-align: left;  font-weight: 900; }

/* Aliases for tbody td */
.n { text-align: right; font-weight: 800; }
.q { text-align: center; }
.p { text-align: center; }
.t { text-align: left;  font-weight: 900; }

/* ── Totals block ── */
.ttl td      { padding: 2px 0; font-size: 11px; }
.ttl .lbl    { width: 58%; font-weight: 800; }
.ttl .val    { width: 42%; font-weight: 900; }

/* ── Grand total bar ── */
.grand {
  background: #fff; color: #000 !important;
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 6px; margin: 5px 0;
  font-size: 15px; font-weight: 900 !important;
  border-top: 3px solid #000; border-bottom: 3px solid #000;
}

/* ── Partial / Credit ── */
.partial      { border: 2px solid #000; padding: 2px 5px; margin-bottom: 5px; }
.partial .lbl { width: 58%; }
.partial .val { width: 42%; }
.partial td   { padding: 3px 0; font-weight: 900; font-size: 11px; }
.credit       { background: #fff; color: #000 !important; text-align: center; padding: 5px; font-size: 11px; font-weight: 900 !important; margin-bottom: 5px; border: 2px solid #000; }

/* ── Footer ── */
.policy { text-align: center; font-size: 9px; line-height: 1.8; }
.footer { text-align: center; padding: 3px 0 5px; }
.footer .ty  { font-size: 13px; font-weight: 900; margin-bottom: 3px; }
.footer .sub { font-size: 9px; }
.footer .ph  { font-size: 12px; font-weight: 900; margin-top: 4px; letter-spacing: 1px; }
.footer .soc { font-size: 9px; margin-top: 2px; }
</style>
</head>
<body>

<div class="logo">
  <img src="/brand-logo.png" alt="AL MAGD" onerror="this.style.display='none'"/>
</div>
<div class="brand-sub">FASHION &amp; CLOTHING</div>
<div class="branch">${data.branch?.name || ''}</div>

<hr class="thick"/>

<!-- ══ Invoice Info ══ -->
<table class="info">
  <tr><td class="lbl">رقم الفاتورة:</td><td class="val" style="font-size:9px;letter-spacing:0.5px">${data.invoiceNo}</td></tr>
  <tr><td class="lbl">التاريخ:</td>      <td class="val">${date}</td></tr>
  <tr><td class="lbl">الوقت:</td>        <td class="val">${time}</td></tr>
  <tr><td class="lbl">البائع:</td>       <td class="val">${data.user?.fullName || ''}</td></tr>
  ${customerRow}
  <tr><td class="lbl">الدفع:</td>        <td class="val">${data.paymentMethod || ''}</td></tr>
</table>

<hr class="thick"/>

<!-- ══ Products ══ -->
<table class="items">
  <thead>
    <tr>
      <th class="col-n">الصنف</th>
      <th class="col-q">الكمية</th>
      <th class="col-p">السعر</th>
      <th class="col-t">المبلغ</th>
    </tr>
  </thead>
  <tbody>${linesHTML}</tbody>
</table>

<hr class="thick"/>

<!-- ══ Totals ══ -->
<table class="ttl">
  <tr>
    <td style="text-align:right;font-weight:800;font-size:11px;padding:2px 0;width:58%">المجموع الفرعي:</td>
    <td style="text-align:left;font-weight:900;font-size:13px;padding:2px 0;width:42%">${Number(totals.subtotal).toFixed(2)} ج.م</td>
  </tr>
  ${discountRow}${taxRow}${shippingRow}
</table>

<div class="grand">
  <span>الإجمالي</span>
  <span>${Number(totals.finalTotal).toFixed(2)} ج.م</span>
</div>

${partialBlock}${creditBlock}

<hr class="dash"/>
<div class="policy">
  <div>يمكن الاستبدال خلال 14 يوم بشرط وجود الفاتورة</div>
  <div>والمنتج بحالته الأصلية</div>
</div>
<hr class="dash"/>

<div class="footer">
  <div class="ty">شكراً لزيارتكم</div>
  <div class="sub">نتطلع لخدمتكم دائماً</div>
  <div class="ph">01090811974</div>
  <div class="soc">@magd.store</div>
</div>

<script>
  /* Wait for Cairo font to load, then print & close */
  document.fonts.ready.then(function() {
    setTimeout(function() { window.print(); window.close(); }, 400);
  });
</script>
</body>
</html>`;

        /* 80mm paper ≈ 302px at 96dpi, +scrollbar ≈ 320px */
        const popup = window.open('', '_blank', 'width=320,height=700,menubar=no,toolbar=no,location=no,scrollbars=yes');
        if (popup) {
            popup.document.write(html);
            popup.document.close();
        }
    };

    const handlePrintReceipt = () => {
        if (receiptData) {
            printReceiptPopup(receiptData);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.reload();
    };

    const refreshPlatformSettings = async () => {
        await refreshUserPermissions();
        setMessage('✅ تم تحديث المنصات');
    };

    // ── Business Day ───────────────────────────────────────────────
    const loadBusinessDay = async () => {
        try {
            const day = await businessDayApi.getCurrent();
            setBusinessDay(day);
        } catch {
            setBusinessDay(null);
        }
    };

    const handleOpenBd = async () => {
        setBdBusy(true);
        setBdMessage('');
        try {
            const day = await businessDayApi.open(bdNotes || undefined);
            setBusinessDay(day);
            setBdNotes('');
            setBdMessage('✅ تم فتح يوم العمل');
        } catch (e: any) {
            setBdMessage(e.response?.data?.message || '❌ فشل فتح يوم العمل');
        } finally {
            setBdBusy(false);
        }
    };

    const handleCloseBd = async () => {
        if (!window.confirm('هل تريد إغلاق يوم العمل الحالي؟')) return;
        setBdBusy(true);
        setBdMessage('');
        try {
            await businessDayApi.close(bdNotes || undefined);
            setBusinessDay(null);
            setBdNotes('');
            setBdMessage('✅ تم إغلاق يوم العمل');
        } catch (e: any) {
            setBdMessage(e.response?.data?.message || '❌ فشل إغلاق يوم العمل');
        } finally {
            setBdBusy(false);
        }
    };

    useEffect(() => {
        loadBusinessDay();
    }, []);

    if (loading && Object.keys(CHANNELS).length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <div style={{ fontSize: '18px', color: '#64748b' }}>جاري التحميل...</div>
            </div>
        );
    }

    if (Object.keys(CHANNELS).length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                {/* User Info at Top */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{
                        background: '#f1f5f9',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#334155'
                    }}>
                        <User size={16} style={{ display: 'inline', marginLeft: '5px' }} />
                        {user.fullName}
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '8px 16px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <LogOut size={16} />
                        تسجيل خروج
                    </button>
                </div>

                {/* Error Message */}
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>❌ لا تملك صلاحيات لأي منصة</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    يرجى التواصل مع المسؤول لمنحك صلاحيات الوصول
                </p>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                        onClick={() => window.location.href = '/settings'}
                        style={{
                            padding: '12px 24px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        الذهاب للإعدادات
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '12px 24px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        تسجيل خروج
                    </button>
                </div>
            </div>
        );
    }

    const totals = calculateTotals();

    const printStyles = `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 80mm !important;
      background: #fff !important;
    }

    body * {
      visibility: hidden !important;
    }

    .thermal-receipt-print,
    .thermal-receipt-print * {
      visibility: visible !important;
    }

    .thermal-receipt-print {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 74mm !important;
      margin: 0 !important;
      padding: 3mm !important;
    }
  }
`;








    return (
        <>
            <style>{printStyles}</style>
            <div className="pos-container" dir="rtl">
                {/* Header */}
                <div className="pos-header">
                    <div className="header-top">
                        <h1><ShoppingCart size={32} /> نقطة البيع</h1>
                        <div className="user-info">
                            <div className="user-tag"><User size={14} /> {user.fullName}</div>
                            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                                📦 {Object.keys(CHANNELS).length} منصات
                            </div>
                            <div className="branch-tag"><Building size={14} /> {user.branch?.name}</div>
                            {/* Business Day Badge */}
                            <button
                                onClick={() => { setBdMessage(''); setShowBdPanel(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 12px',
                                    background: businessDay ? '#dcfce7' : '#fee2e2',
                                    color: businessDay ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${businessDay ? '#86efac' : '#fca5a5'}`,
                                    borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 700, transition: 'all 0.2s'
                                }}
                                title="يوم العمل"
                            >
                                {businessDay ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                {businessDay
                                    ? `مفتوح • ${new Date(businessDay.openedAt).toLocaleDateString('ar-EG')}`
                                    : 'مغلق'
                                }
                                <CalendarDays size={13} />
                            </button>
                            <button onClick={handleLogout} className="logout-btn">تسجيل خروج</button>
                            <button
                                onClick={refreshPlatformSettings}
                                className="btn-secondary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                                title="تحديث المنصات"
                            >
                                🔄
                            </button>
                        </div>
                    </div>

                    {/* Platform Tabs */}
                    <div className="channel-tabs">
                        {Object.values(CHANNELS).map(channel => (
                            <button
                                key={channel.id}
                                className={`tab-btn ${activeTab === channel.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(channel.id)}
                            >
                                {channel.name}
                            </button>
                        ))}
                    </div>

                    {/* Channel Info Bar */}
                    {CHANNELS[activeTab] && (
                        <div className="channel-info-bar">
                            <div
                                className="info-item"
                                onClick={() => setShowCustomerModal(true)}
                                style={{
                                    cursor: 'pointer',
                                    background: selectedCustomer ? '#dbeafe' : 'transparent',
                                    padding: '5px 10px',
                                    borderRadius: '6px'
                                }}
                            >
                                <span className="info-label"><Users size={16} /></span>
                                <span className="info-value" style={{ marginRight: '5px', fontWeight: 'bold' }}>
                                    {selectedCustomer ? selectedCustomer.name : 'عميل نقدي (Retail)'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">المنصة:</span>
                                <span className="info-value">{CHANNELS[activeTab].name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">الضريبة:</span>
                                <span className="info-value">{(CHANNELS[activeTab].tax * 100).toFixed(0)}%</span>
                            </div>
                            {CHANNELS[activeTab].platform > 0 && (
                                <div className="info-item">
                                    <span className="info-label">العمولة:</span>
                                    <span className="info-value">{(CHANNELS[activeTab].platform * 100).toFixed(0)}%</span>
                                </div>
                            )}
                            {CHANNELS[activeTab].shippingFee > 0 && (
                                <div className="info-item">
                                    <span className="info-label">الشحن:</span>
                                    <span className="info-value">{CHANNELS[activeTab].shippingFee.toFixed(2)} ر.س</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pos-main">
                    {/* Scanner Section */}
                    <div className="scanner-section">
                        <h2 className="section-title">مسح الباركود</h2>
                        <form onSubmit={handleBarcodeSubmit}>
                            <div className="barcode-wrapper">
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    placeholder="امسح الباركود أو أدخله يدوياً..."
                                    className="barcode-input"
                                    disabled={loading}
                                    dir="ltr"
                                />
                            </div>
                        </form>

                        {message && (
                            <div className={`message ${message.startsWith('✅') ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button
                                onClick={() => setShowSearch(true)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                <Search size={18} />
                                بحث عن منتج
                            </button>
                            <button
                                onClick={() => setShowProductBrowser(true)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                <ShoppingCart size={18} />
                                تصفح المنتجات
                            </button>
                            <button
                                onClick={() => setCart([])}
                                style={{
                                    padding: '12px 20px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* Discount Card */}
                        <div className="discount-card">
                            <h3>الخصم (%)</h3>
                            <div className="discount-group">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={discountValue || ''}
                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    className="discount-field"
                                />
                                <button className="apply-btn" onClick={handleApplyDiscount}>تطبيق</button>
                            </div>
                        </div>
                    </div>

                    {/* Cart Section */}
                    <div className="cart-section">
                        <div className="cart-header">
                            <h2 className="cart-title">السلة ({cart.length})</h2>
                        </div>

                        {cart.length === 0 ? (
                            <div className="empty-cart" style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
                                <ShoppingCart size={80} style={{ marginBottom: '20px' }} />
                                <p>السلة بانتظار أول منتج...</p>
                            </div>
                        ) : (
                            <div className="cart-items-list">
                                {cart.map(item => (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            padding: '16px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            marginBottom: '12px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {/* Product Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <strong style={{ display: 'block', marginBottom: '6px', fontSize: '15px', color: '#1e293b' }}>
                                                {item.nameAr || item.nameEn}
                                            </strong>
                                            <small style={{ color: '#64748b', display: 'block', marginBottom: '10px', fontSize: '13px' }}>
                                                {item.barcode} • {item.price.toFixed(2)} ر.س
                                            </small>

                                            {(item.size || item.color) && (
                                                <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {item.size && <SizeBadge size={item.size} />}
                                                    {item.color && <ColorSwatch color={item.color} />}
                                                </div>
                                            )}

                                            {item.supplier && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '2px 8px',
                                                        background: '#eff6ff', color: '#1d4ed8',
                                                        borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                                        border: '1px solid #bfdbfe',
                                                    }}>
                                                        {item.supplier.name}
                                                    </span>
                                                </div>
                                            )}

                                            {item.stock !== undefined && (
                                                <small style={{
                                                    color: item.stock <= 10 ? '#f59e0b' : '#10b981',
                                                    fontWeight: 600,
                                                    fontSize: '12px',
                                                    display: 'block',
                                                    marginBottom: '10px'
                                                }}>
                                                    المخزون: {item.stock}
                                                </small>
                                            )}

                                            {/* Price Type Selector */}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    background: '#f1f5f9',
                                                    padding: '3px',
                                                    borderRadius: '8px',
                                                    gap: '3px'
                                                }}>
                                                    {/* Retail Button */}
                                                    <label style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 14px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        background: item.priceType === 'RETAIL' ? '#3b82f6' : 'transparent',
                                                        color: item.priceType === 'RETAIL' ? 'white' : '#64748b',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <input
                                                            type="radio"
                                                            checked={item.priceType === 'RETAIL'}
                                                            onChange={() => togglePriceType(item.id, 'RETAIL')}
                                                            style={{ display: 'none' }}
                                                        />
                                                        <span>قطاعي</span> {Number(item.priceRetail).toFixed(2)}
                                                    </label>

                                                    {/* Wholesale Button */}
                                                    {item.priceWholesale && (
                                                        <label style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 14px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            background: item.priceType === 'WHOLESALE' ? '#3b82f6' : 'transparent',
                                                            color: item.priceType === 'WHOLESALE' ? 'white' : '#64748b',
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            <input
                                                                type="radio"
                                                                checked={item.priceType === 'WHOLESALE'}
                                                                onChange={() => togglePriceType(item.id, 'WHOLESALE')}
                                                                style={{ display: 'none' }}
                                                            />
                                                            <span>جملة</span> {Number(item.priceWholesale).toFixed(2)}
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Custom Price Button */}
                                                <button
                                                    onClick={() => setEditingPrice({
                                                        productId: item.id,
                                                        currentPrice: item.price,
                                                        cost: Number(item.cost)
                                                    })}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 14px',
                                                        background: item.priceType === 'CUSTOM'
                                                            ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                                                            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        fontWeight: '500',
                                                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                                                    }}
                                                >
                                                    {item.priceType === 'CUSTOM' ? '✏️ تعديل السعر' : '💰 سعر مخصص'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quantity Controls */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            background: '#f8fafc',
                                            padding: '6px',
                                            borderRadius: '12px',
                                            border: '2px solid #e2e8f0',
                                            flexShrink: 0
                                        }}>
                                            <button
                                                onClick={() => updateQty(item.id, item.qty - 1)}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    fontSize: '20px',
                                                    fontWeight: '700',
                                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                                    transition: 'all 0.2s',
                                                    lineHeight: '1'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                                                }}
                                            >
                                                −
                                            </button>
                                            <span style={{
                                                minWidth: '45px',
                                                textAlign: 'center',
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                color: '#1e293b',
                                                padding: '0 8px'
                                            }}>
                                                {item.qty}
                                            </span>
                                            <button
                                                onClick={() => updateQty(item.id, item.qty + 1)}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    fontSize: '20px',
                                                    fontWeight: '700',
                                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                                    transition: 'all 0.2s',
                                                    lineHeight: '1'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Line Total */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center',
                                            minWidth: '100px',
                                            flexShrink: 0
                                        }}>
                                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', lineHeight: '1.2', marginBottom: '4px' }}>
                                                {item.lineTotal.toFixed(2)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                ر.س
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => updateQty(item.id, 0)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#fee2e2',
                                                color: '#ef4444',
                                                border: 'none',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#ef4444';
                                                e.currentTarget.style.color = 'white';
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#fee2e2';
                                                e.currentTarget.style.color = '#ef4444';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ✅ NEW: Detailed Totals Breakdown */}
                        {cart.length > 0 && (
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1e293b' }}>
                                    💰 تفاصيل المبلغ
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* Subtotal */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span style={{ color: '#64748b' }}>المجموع الفرعي:</span>
                                        <span style={{ fontWeight: '600' }}>{totals.subtotal.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* Discount */}
                                    {totals.discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span style={{ color: '#64748b' }}>الخصم ({appliedDiscount}%):</span>
                                            <span style={{ fontWeight: '600', color: '#ef4444' }}>- {totals.discountAmount.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* Subtotal After Discount */}
                                    {totals.discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
                                            <span style={{ color: '#64748b' }}>المجموع بعد الخصم:</span>
                                            <span style={{ fontWeight: '600' }}>{totals.subtotalAfterDiscount.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* Tax */}
                                    {totals.taxAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span style={{ color: '#64748b' }}>الضريبة ({(CHANNELS[activeTab].tax * 100).toFixed(0)}%):</span>
                                            <span style={{ fontWeight: '600', color: '#10b981' }}>+ {totals.taxAmount.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* Shipping Fee */}
                                    {totals.shippingFee > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span style={{ color: '#64748b' }}>رسوم الشحن:</span>
                                            <span style={{ fontWeight: '600', color: '#f59e0b' }}>+ {totals.shippingFee.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* Final Total */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '12px 0',
                                        borderTop: '2px solid #1e293b',
                                        marginTop: '8px'
                                    }}>
                                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>الإجمالي النهائي:</span>
                                        <span style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>{totals.finalTotal.toFixed(2)} ر.س</span>
                                    </div>

                                    {/* Payment Summary */}
                                    {paymentType === 'PARTIAL' && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#dbeafe', borderRadius: '8px', marginTop: '8px' }}>
                                                <span style={{ fontWeight: '600', color: '#1e40af' }}>المبلغ المدفوع الآن:</span>
                                                <span style={{ fontWeight: '700', color: '#1e40af' }}>{paidAmount.toFixed(2)} ر.س</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fee2e2', borderRadius: '8px' }}>
                                                <span style={{ fontWeight: '600', color: '#991b1b' }}>المبلغ المتبقي:</span>
                                                <span style={{ fontWeight: '700', color: '#991b1b' }}>{(totals.finalTotal - paidAmount).toFixed(2)} ر.س</span>
                                            </div>
                                        </>
                                    )}

                                    {paymentType === 'CREDIT' && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fee2e2', borderRadius: '8px', marginTop: '8px' }}>
                                            <span style={{ fontWeight: '600', color: '#991b1b' }}>كامل المبلغ آجل:</span>
                                            <span style={{ fontWeight: '700', color: '#991b1b' }}>{totals.finalTotal.toFixed(2)} ر.س</span>
                                        </div>
                                    )}

                                    {/* Platform Commission */}
                                    {totals.platformAmount > 0 && (
                                        <div style={{
                                            padding: '8px',
                                            background: '#fef3c7',
                                            borderRadius: '8px',
                                            marginTop: '8px',
                                            fontSize: '12px',
                                            color: '#92400e'
                                        }}>
                                            ℹ️ عمولة المنصة ({(CHANNELS[activeTab].platform * 100).toFixed(0)}%): {totals.platformAmount.toFixed(2)} ر.س (للمعلومات فقط)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Type Selection */}
                        {cart.length > 0 && (
                            <div style={{ marginBottom: '16px', marginTop: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                                    نوع الدفع
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentType('FULL');
                                            setPaidAmount(totals.finalTotal);
                                            setDeliveredNow(true);
                                        }}
                                        style={{
                                            padding: '12px',
                                            background: paymentType === 'FULL' ? '#10b981' : 'white',
                                            color: paymentType === 'FULL' ? 'white' : '#374151',
                                            border: `2px solid ${paymentType === 'FULL' ? '#10b981' : '#d1d5db'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        💰 دفع كامل
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentType('PARTIAL');
                                            setPaidAmount(0);
                                            setDeliveredNow(true);
                                        }}
                                        style={{
                                            padding: '12px',
                                            background: paymentType === 'PARTIAL' ? '#f59e0b' : 'white',
                                            color: paymentType === 'PARTIAL' ? 'white' : '#374151',
                                            border: `2px solid ${paymentType === 'PARTIAL' ? '#f59e0b' : '#d1d5db'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📊 دفع جزئي
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentType('CREDIT');
                                            setPaidAmount(0);
                                            setDeliveredNow(true);
                                        }}
                                        style={{
                                            padding: '12px',
                                            background: paymentType === 'CREDIT' ? '#ef4444' : 'white',
                                            color: paymentType === 'CREDIT' ? 'white' : '#374151',
                                            border: `2px solid ${paymentType === 'CREDIT' ? '#ef4444' : '#d1d5db'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📝 آجل
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Partial Payment Amount Input */}
                        {paymentType === 'PARTIAL' && cart.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                                    المبلغ المدفوع الآن
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paidAmount || ''}
                                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                    placeholder="أدخل المبلغ المدفوع"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                                    المتبقي: {(totals.finalTotal - (paidAmount || 0)).toFixed(2)} ر.س
                                </div>
                            </div>
                        )}

                        {/* Delivery Checkbox */}
                        {paymentType !== 'CREDIT' && cart.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={deliveredNow}
                                        onChange={(e) => setDeliveredNow(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                        🚚 تسليم البضاعة الآن
                                    </span>
                                </label>
                                {!deliveredNow && (
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc2626' }}>
                                        ⚠️ لن يتم خصم المخزون حتى يتم التسليم
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ✅ UPDATED: Payment Methods with restrictions */}
                        {/* Payment Methods - Always Available */}
                        <div className="payment-section">
                            <span className="section-subtitle">طريقة الدفع</span>
                            <div className="payment-methods-row">
                                {PAYMENT_METHODS.map(pm => (
                                    <button
                                        key={pm.id}
                                        className={`pm-btn ${paymentMethod === pm.id ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod(pm.id)}
                                        title={pm.name}
                                    >
                                        <span className="pm-icon">{pm.icon}</span>
                                        <span className="pm-name">{pm.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Final Total Column */}
                        <div className="final-checkout-column">
                            <div className="total-display">
                                <div className="total-label">المجموع النهائي</div>
                                <div className="total-val">{totals.finalTotal.toFixed(2)} ر.س</div>
                            </div>

                            <button
                                className="pay-btn"
                                onClick={handleCheckout}
                                disabled={loading || cart.length === 0}
                            >
                                {loading ? '⏳ جاري المعالجة...' : CHANNELS[activeTab].btnText}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Custom Price Edit Modal */}
                {editingPrice && (
                    <div className="modal-overlay" onClick={() => setEditingPrice(null)} style={{ zIndex: 1000 }}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '28px', borderRadius: '16px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #f1f5f9' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    fontSize: '28px'
                                }}>
                                    💰
                                </div>
                                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>تعديل السعر</h3>
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                                    السعر الحالي: <strong>{editingPrice.currentPrice.toFixed(2)} ر.س</strong>
                                </p>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target as HTMLFormElement;
                                const input = form.elements.namedItem('customPrice') as HTMLInputElement;
                                const newPrice = parseFloat(input.value);

                                if (newPrice) {
                                    updateCustomPrice(editingPrice.productId, newPrice);
                                }
                            }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                                        السعر الجديد (ر.س)
                                    </label>
                                    <input
                                        type="number"
                                        name="customPrice"
                                        step="0.01"
                                        min="0"
                                        defaultValue={editingPrice.currentPrice}
                                        autoFocus
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            border: '2px solid #e2e8f0',
                                            borderRadius: '10px',
                                            textAlign: 'center',
                                            outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#6366f1';
                                            e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e2e8f0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingPrice(null)}
                                        style={{
                                            flex: 1,
                                            padding: '13px',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '15px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: '13px',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontWeight: '700',
                                            fontSize: '15px',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>✓</span>
                                        حفظ
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Search Modal */}
                {showSearch && (
                    <div className="modal-overlay" onClick={() => setShowSearch(false)}>
                        <div className="search-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="search-header">
                                <Search size={20} />
                                <input
                                    autoFocus
                                    placeholder="ابحث بالاسم، الباركود، أو الكود..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                <button onClick={() => setShowSearch(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>
                                    ✕
                                </button>
                            </div>
                            <div className="search-results">
                                {searchResults.map(p => (
                                    <div
                                        key={p.id}
                                        style={{
                                            padding: '12px',
                                            borderBottom: '1px solid #e5e7eb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                                            opacity: p.stock === 0 ? 0.5 : 1,
                                            background: 'white',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (p.stock !== 0) e.currentTarget.style.background = '#f9fafb';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                        }}
                                    >
                                        <div style={{ flex: 1, textAlign: 'right' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{p.nameAr || p.nameEn}</div>
                                            <div style={{ fontSize: '14px', color: '#10b981' }}>
                                                {selectedCustomer?.type === 'WHOLESALE' && p.priceWholesale ? p.priceWholesale : p.priceRetail} ر.س
                                            </div>
                                            {(p.size || p.color) && (
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {p.size && <SizeBadge size={p.size} />}
                                                    {p.color && <ColorSwatch color={p.color} />}
                                                </div>
                                            )}
                                            {p.supplier && (
                                                <div style={{ marginTop: '4px' }}>
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, border: '1px solid #bfdbfe' }}>
                                                        {p.supplier.name}
                                                    </span>
                                                </div>
                                            )}
                                            {p.stock !== undefined && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: p.stock === 0 ? '#ef4444' : p.stock <= 10 ? '#f59e0b' : '#10b981',
                                                    fontWeight: 600,
                                                    marginTop: '4px'
                                                }}>
                                                    المخزون: {p.stock}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (p.stock !== 0) {
                                                    addToCart(p);
                                                    setShowProductBrowser(false); // ✅ ADD THIS LINE
                                                } else {
                                                    playBeep('error');
                                                    setMessage('❌ المنتج غير متوفر في المخزون');
                                                }
                                            }}
                                            disabled={p.stock === 0}
                                            style={{
                                                padding: '8px 16px',
                                                background: p.stock === 0 ? '#9ca3af' : '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                opacity: p.stock === 0 ? 0.6 : 1
                                            }}
                                        >
                                            {p.stock === 0 ? '❌ نفذ' : '✓ إضافة'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Product Browser Modal - keeping existing code */}
                {showProductBrowser && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            zIndex: 1000,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        dir="rtl"
                    >
                        <div style={{
                            padding: '20px 30px',
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(10px)',
                            borderBottom: '2px solid rgba(255,255,255,0.3)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#667eea' }}>
                                🛒 تصفح المنتجات
                            </h2>
                            <button
                                onClick={() => setShowProductBrowser(false)}
                                style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'white',
                                    fontSize: '24px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'  // ✅ Add shadow
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#dc2626';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '20px 30px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
                                <div style={{ flex: 1, minWidth: '250px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 ابحث عن منتج (اسم، باركود، لون، مقاس، مورد)..."
                                        value={browserSearchQuery}
                                        onChange={(e) => {
                                            const query = e.target.value;
                                            setBrowserSearchQuery(query);
                                            setBrowserProducts(applyBrowserFilters(allBrowserProducts, query, selectedColor, selectedSize));
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px 20px',
                                            fontSize: '15px',
                                            border: '2px solid #e5e7eb',
                                            borderRadius: '12px',
                                            outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                    />
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                    {browserProducts.length} منتج
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '5px' }}>
                                <button
                                    onClick={() => {
                                        setSelectedCategory('');
                                        loadProductsForBrowser(undefined, selectedSupplier || undefined);
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        background: !selectedCategory ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                                        color: !selectedCategory ? 'white' : '#4b5563',
                                        border: '2px solid',
                                        borderColor: !selectedCategory ? 'transparent' : '#e5e7eb',
                                        borderRadius: '25px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    الكل ({allBrowserProducts.length})
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedCategory(cat.id.toString());
                                            loadProductsForBrowser(cat.id.toString(), selectedSupplier || undefined);
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: selectedCategory === cat.id.toString() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                                            color: selectedCategory === cat.id.toString() ? 'white' : '#4b5563',
                                            border: '2px solid',
                                            borderColor: selectedCategory === cat.id.toString() ? 'transparent' : '#e5e7eb',
                                            borderRadius: '25px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {cat.nameAr || cat.name} ({cat._count?.products || 0})
                                    </button>
                                ))}
                            </div>

                            {/* Supplier filter */}
                            {suppliers.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
                                    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>المورد:</span>
                                    <button
                                        onClick={() => { setSelectedSupplier(''); loadProductsForBrowser(selectedCategory || undefined, undefined); }}
                                        style={{
                                            padding: '6px 14px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap',
                                            background: !selectedSupplier ? '#667eea' : 'white',
                                            color: !selectedSupplier ? 'white' : '#4b5563',
                                            borderColor: !selectedSupplier ? 'transparent' : '#e5e7eb',
                                        }}
                                    >الكل</button>
                                    {suppliers.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setSelectedSupplier(s.id.toString()); loadProductsForBrowser(selectedCategory || undefined, s.id.toString()); }}
                                            style={{
                                                padding: '6px 14px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap',
                                                background: selectedSupplier === s.id.toString() ? '#667eea' : 'white',
                                                color: selectedSupplier === s.id.toString() ? 'white' : '#4b5563',
                                                borderColor: selectedSupplier === s.id.toString() ? 'transparent' : '#e5e7eb',
                                            }}
                                        >{s.name}</button>
                                    ))}
                                </div>
                            )}

                            {/* Color filter chips */}
                            {(() => {
                                const uniqueColors = [...new Set(allBrowserProducts.map(p => p.color).filter(Boolean))] as string[];
                                if (!uniqueColors.length) return null;
                                return (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
                                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>اللون:</span>
                                        <button
                                            onClick={() => { setSelectedColor(''); setBrowserProducts(applyBrowserFilters(allBrowserProducts, browserSearchQuery, '', selectedSize)); }}
                                            style={{ padding: '4px 12px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', background: !selectedColor ? '#667eea' : 'white', color: !selectedColor ? 'white' : '#4b5563', borderColor: !selectedColor ? 'transparent' : '#e5e7eb' }}
                                        >الكل</button>
                                        {uniqueColors.map(color => {
                                            const hex = getColorHex(color);
                                            const isMulti = hex === 'multicolor';
                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => { const nc = selectedColor === color ? '' : color; setSelectedColor(nc); setBrowserProducts(applyBrowserFilters(allBrowserProducts, browserSearchQuery, nc, selectedSize)); }}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', border: `2px solid ${selectedColor === color ? '#667eea' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: selectedColor === color ? '#ede9fe' : 'white', transition: 'all 0.2s' }}
                                                >
                                                    <span style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: isMulti ? 'linear-gradient(135deg,#ef4444,#22c55e,#3b82f6)' : hex, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                                                    {color}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}

                            {/* Size filter chips */}
                            {(() => {
                                const uniqueSizes = [...new Set(allBrowserProducts.map(p => p.size).filter(Boolean))] as string[];
                                if (!uniqueSizes.length) return null;
                                return (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '4px' }}>
                                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>المقاس:</span>
                                        <button
                                            onClick={() => { setSelectedSize(''); setBrowserProducts(applyBrowserFilters(allBrowserProducts, browserSearchQuery, selectedColor, '')); }}
                                            style={{ padding: '4px 12px', borderRadius: '20px', border: '2px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', background: !selectedSize ? '#667eea' : 'white', color: !selectedSize ? 'white' : '#4b5563', borderColor: !selectedSize ? 'transparent' : '#e5e7eb' }}
                                        >الكل</button>
                                        {uniqueSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => { const ns = selectedSize === size ? '' : size; setSelectedSize(ns); setBrowserProducts(applyBrowserFilters(allBrowserProducts, browserSearchQuery, selectedColor, ns)); }}
                                                style={{ padding: '4px 10px', borderRadius: '20px', border: `2px solid ${selectedSize === size ? '#667eea' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 700, background: selectedSize === size ? '#1e293b' : 'white', color: selectedSize === size ? 'white' : '#1e293b', fontFamily: 'monospace', transition: 'all 0.2s' }}
                                            >{size}</button>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {loadingProducts ? (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#667eea',
                                fontSize: '18px',
                                fontWeight: '600'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                                    <p>جاري تحميل المنتجات...</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                flex: 1,
                                padding: '30px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '20px',
                                alignContent: 'start',
                                overflowY: 'auto'
                            }}>
                                {browserProducts.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.8)' }}>
                                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                                        <p style={{ fontSize: '18px', fontWeight: '500' }}>لا توجد منتجات</p>
                                    </div>
                                ) : (
                                    browserProducts.map(product => (
                                        <div
                                            key={product.id}
                                            style={{
                                                background: 'white',
                                                padding: '20px',
                                                borderRadius: '16px',
                                                border: '2px solid #e5e7eb',
                                                cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                position: 'relative',
                                                height: '420px',
                                                opacity: product.stock === 0 ? 0.6 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (product.stock !== 0) {
                                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.25)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                                            }}
                                        >
                                            {product.stock !== undefined && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    left: '12px',
                                                    padding: '6px 12px',
                                                    background: product.stock <= 10
                                                        ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                    zIndex: 1,
                                                    minWidth: '50px',
                                                    textAlign: 'center'
                                                }}>
                                                    {product.stock === 0 ? '❌ نفذ' : `📦 ${product.stock}`}
                                                </div>
                                            )}

                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                color: '#1e293b',
                                                marginBottom: '12px',
                                                height: '48px',
                                                overflow: 'hidden',
                                                textAlign: 'center',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                lineHeight: '1.4',
                                                direction: 'rtl'
                                            }}>
                                                {product.nameAr || product.nameEn}
                                            </div>

                                            <div style={{
                                                fontSize: '12px',
                                                color: '#64748b',
                                                marginBottom: '16px',
                                                textAlign: 'center',
                                                height: '36px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px'
                                            }}>
                                                <div style={{ fontWeight: '600' }}>{product.barcode}</div>
                                                {product.code && <div style={{ fontSize: '11px', color: '#94a3b8' }}>#{product.code}</div>}
                                            </div>

                                            {(product.size || product.color) && (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {product.size && <SizeBadge size={product.size} large />}
                                                    {product.color && <ColorSwatch color={product.color} large />}
                                                </div>
                                            )}

                                            {product.supplier && (
                                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '2px 10px',
                                                        background: '#eff6ff', color: '#1d4ed8',
                                                        borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                                        border: '1px solid #bfdbfe',
                                                    }}>
                                                        {product.supplier.name}
                                                    </span>
                                                </div>
                                            )}

                                            <div style={{
                                                fontSize: '22px',
                                                fontWeight: '800',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                textAlign: 'center',
                                                marginBottom: '12px',
                                                height: '28px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                direction: 'rtl'
                                            }}>
                                                {(() => {
                                                    const price = selectedCustomer?.type === 'WHOLESALE' && product.priceWholesale
                                                        ? Number(product.priceWholesale)
                                                        : Number(product.priceRetail);
                                                    return `${price.toFixed(2)} ر.س`;
                                                })()}
                                            </div>

                                            {selectedCustomer?.type === 'WHOLESALE' && product.priceWholesale && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#64748b',
                                                    textAlign: 'center',
                                                    marginBottom: '16px',
                                                    textDecoration: 'line-through',
                                                    opacity: 0.7
                                                }}>
                                                    قطاعي: {Number(product.priceRetail).toFixed(2)} ر.س
                                                </div>
                                            )}

                                            <div style={{ flex: 1 }}></div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (product.stock !== 0) {
                                                        addToCart(product);
                                                    } else {
                                                        playBeep('error');
                                                        setMessage('❌ المنتج غير متوفر في المخزون');
                                                    }
                                                }}
                                                disabled={product.stock === 0}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: product.stock === 0 ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '10px',
                                                    cursor: product.stock === 0 ? 'not-allowed' : 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    transition: 'all 0.2s',
                                                    boxShadow: product.stock === 0 ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    opacity: product.stock === 0 ? 0.6 : 1
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (product.stock !== 0) {
                                                        e.currentTarget.style.transform = 'scale(1.02)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (product.stock !== 0) {
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                                    }
                                                }}
                                            >
                                                {product.stock === 0 ? (
                                                    <>
                                                        <span style={{ fontSize: '18px' }}>❌</span>
                                                        غير متوفر
                                                    </>
                                                ) : (
                                                    <>
                                                        <span style={{ fontSize: '18px' }}>+</span>
                                                        إضافة للسلة
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ✅ UPDATED: Customer Modal with Create Button */}
                {showCustomerModal && (
                    <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                        <div className="search-modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px' }}>
                            <div className="search-header">
                                <Users size={20} />
                                <input
                                    autoFocus
                                    placeholder="ابحث عن عميل..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                                {/* ✅ NEW: Add Customer Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCreateCustomer(true);
                                    }}
                                    style={{
                                        background: '#10b981',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'white',
                                        fontSize: '14px',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="إضافة عميل جديد"
                                >
                                    <span>+</span>
                                    جديد
                                </button>
                                <button onClick={() => setShowCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}>
                                    ✕
                                </button>
                            </div>
                            <div className="search-results">
                                <div
                                    className="search-item"
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        setShowCustomerModal(false);
                                    }}
                                >
                                    <span className="font-bold">عميل نقدي (Retail)</span>
                                    <span className="text-gray-500">Retail</span>
                                </div>
                                {customersList
                                    .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                                    .map(c => (
                                        <div
                                            key={c.id}
                                            className="search-item"
                                            onClick={() => {
                                                setSelectedCustomer(c);
                                                setShowCustomerModal(false);
                                            }}
                                        >
                                            <span>{c.name}</span>
                                            <span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>
                                                {c.type}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ✅ NEW: Create Customer Modal */}
                {showCreateCustomer && (
                    <div className="modal-overlay" onClick={() => setShowCreateCustomer(false)} style={{ zIndex: 1001 }}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', padding: '24px' }}>
                            <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>➕ إضافة عميل جديد</h3>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>اسم العميل *</label>
                                <input
                                    type="text"
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                    placeholder="أدخل اسم العميل"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>رقم الهاتف</label>
                                <input
                                    type="text"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                    placeholder="اختياري"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px'
                                    }}
                                />
                            </div>



                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>نوع العميل</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => setNewCustomer({ ...newCustomer, type: 'RETAIL' })}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: newCustomer.type === 'RETAIL' ? '#3b82f6' : 'white',
                                            color: newCustomer.type === 'RETAIL' ? 'white' : '#374151',
                                            border: `2px solid ${newCustomer.type === 'RETAIL' ? '#3b82f6' : '#d1d5db'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        🛒 قطاعي (Retail)
                                    </button>
                                    <button
                                        onClick={() => setNewCustomer({ ...newCustomer, type: 'WHOLESALE' })}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: newCustomer.type === 'WHOLESALE' ? '#3b82f6' : 'white',
                                            color: newCustomer.type === 'WHOLESALE' ? 'white' : '#374151',
                                            border: `2px solid ${newCustomer.type === 'WHOLESALE' ? '#3b82f6' : '#d1d5db'}`,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        📦 جملة (Wholesale)
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowCreateCustomer(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleCreateCustomer}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    ✓ حفظ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {receiptData && showReceipt && (
                    <div
                        style={{
                            position: 'fixed',
                            bottom: '20px',
                            right: '20px',
                            zIndex: 9999,
                            display: 'flex',
                            gap: '10px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}
                        className="no-print"
                    >
                        {/* Print Again Button */}
                        <button
                            onClick={() => receiptData && printReceiptPopup(receiptData)}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                            <Printer size={20} />
                            <span>طباعة مرة أخرى</span>
                        </button>

                        {/* Close/New Sale Button */}
                        <button
                            onClick={() => {
                                setShowReceipt(false);
                                setReceiptData(null);
                                playBeep('success');
                            }}
                            style={{
                                background: '#10b981',
                                color: 'white',
                                padding: '12px 24px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                        >
                            <ShoppingCart size={20} />
                            <span>بيع جديد</span>
                        </button>
                    </div>
                )}

                {/* ══ Business Day Panel ══ */}
                {showBdPanel && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowBdPanel(false)}
                    >
                        <div
                            style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                            dir="rtl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CalendarDays size={24} color="#667eea" />
                                    يوم العمل
                                </h2>
                                <button onClick={() => setShowBdPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#64748b' }}>✕</button>
                            </div>

                            {/* Status card */}
                            <div style={{
                                padding: '16px 20px', borderRadius: '14px', marginBottom: '20px',
                                background: businessDay ? '#f0fdf4' : '#fff1f2',
                                border: `2px solid ${businessDay ? '#86efac' : '#fca5a5'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: businessDay ? '10px' : '0' }}>
                                    {businessDay
                                        ? <CheckCircle size={22} color="#16a34a" />
                                        : <XCircle size={22} color="#dc2626" />
                                    }
                                    <span style={{ fontWeight: 800, fontSize: '18px', color: businessDay ? '#16a34a' : '#dc2626' }}>
                                        {businessDay ? 'مفتوح' : 'مغلق'}
                                    </span>
                                </div>
                                {businessDay && (
                                    <div style={{ fontSize: '13px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div>📅 فُتح: {new Date(businessDay.openedAt).toLocaleString('ar-EG')}</div>
                                        <div>👤 بواسطة: {businessDay.opener.fullName}</div>
                                    </div>
                                )}
                            </div>

                            {/* Notes input */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                                    ملاحظات (اختياري)
                                </label>
                                <textarea
                                    value={bdNotes}
                                    onChange={e => setBdNotes(e.target.value)}
                                    placeholder="أضف ملاحظات ليوم العمل..."
                                    rows={2}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Message */}
                            {bdMessage && (
                                <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: bdMessage.startsWith('✅') ? '#f0fdf4' : '#fff1f2', color: bdMessage.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: '14px' }}>
                                    {bdMessage}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {!businessDay ? (
                                    <button
                                        onClick={handleOpenBd}
                                        disabled={bdBusy}
                                        style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: '12px', cursor: bdBusy ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '16px', opacity: bdBusy ? 0.7 : 1 }}
                                    >
                                        {bdBusy ? '⏳ جاري...' : '▶ فتح يوم العمل'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCloseBd}
                                        disabled={bdBusy}
                                        style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', border: 'none', borderRadius: '12px', cursor: bdBusy ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '16px', opacity: bdBusy ? 0.7 : 1 }}
                                    >
                                        {bdBusy ? '⏳ جاري...' : '■ إغلاق يوم العمل'}
                                    </button>
                                )}
                                <button
                                    onClick={() => { loadBusinessDay(); setBdMessage(''); }}
                                    style={{ padding: '14px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                                    title="تحديث"
                                >🔄</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

export default POS;

