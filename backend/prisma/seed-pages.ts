import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pages = [
    // Transactions Category (المعاملات)
    {
        key: 'sales',
        nameEn: 'Sales',
        nameAr: 'المبيعات',
        category: 'transactions',
        icon: 'ShoppingCart',
        route: '/sales',
        sortOrder: 1,
    },
    {
        key: 'returns',
        nameEn: 'Returns',
        nameAr: 'المرتجعات',
        category: 'transactions',
        icon: 'RotateCcw',
        route: '/returns',
        sortOrder: 2,
    },
    {
        key: 'customer-accounts',
        nameEn: 'Customer Accounts',
        nameAr: 'حسابات العملاء',
        category: 'transactions',
        icon: 'DollarSign',
        route: '/customer-accounts',
        sortOrder: 3,
    },
    {
        key: 'receive-goods',
        nameEn: 'Receive Goods',
        nameAr: 'استلام بضاعة',
        category: 'transactions',
        icon: 'Package',
        route: '/goods-receipts',
        sortOrder: 4,
    },
    {
        key: 'expenses',
        nameEn: 'Expenses',
        nameAr: 'المصروفات',
        category: 'transactions',
        icon: 'Wallet',
        route: '/expenses',
        sortOrder: 5,
    },
    {
        key: 'treasury',
        nameEn: 'Treasury',
        nameAr: 'الخزينة',
        category: 'transactions',
        icon: 'Landmark',
        route: '/treasury',
        sortOrder: 6,
    },

    // Inventory Category (المخزون)
    {
        key: 'products',
        nameEn: 'Products',
        nameAr: 'المنتجات',
        category: 'inventory',
        icon: 'Box',
        route: '/products',
        sortOrder: 5,
    },
    {
        key: 'stock',
        nameEn: 'Stock',
        nameAr: 'المخزون',
        category: 'inventory',
        icon: 'Warehouse',
        route: '/stock',
        sortOrder: 6,
    },
    {
        key: 'stock-adjustment',
        nameEn: 'Stock Adjustment',
        nameAr: 'تسوية المخزون',
        category: 'inventory',
        icon: 'ClipboardList',
        route: '/stock-adjustment',
        sortOrder: 7,
    },

    // People Category (الأشخاص)
    {
        key: 'customers',
        nameEn: 'Customers',
        nameAr: 'العملاء',
        category: 'people',
        icon: 'Users',
        route: '/customers',
        sortOrder: 8,
    },
    {
        key: 'suppliers',
        nameEn: 'Suppliers',
        nameAr: 'الموردين',
        category: 'people',
        icon: 'Truck',
        route: '/suppliers',
        sortOrder: 9,
    },

    // Admin Category (الإدارة)
    {
        key: 'users',
        nameEn: 'Users',
        nameAr: 'المستخدمين',
        category: 'admin',
        icon: 'UserCog',
        route: '/users',
        sortOrder: 10,
    },
    {
        key: 'roles',
        nameEn: 'Roles & Permissions',
        nameAr: 'الأدوار والصلاحيات',
        category: 'admin',
        icon: 'Shield',
        route: '/roles',
        sortOrder: 11,
    },
    {
        key: 'reports',
        nameEn: 'Reports',
        nameAr: 'التقارير',
        category: 'admin',
        icon: 'BarChart',
        route: '/reports',
        sortOrder: 12,
    },
];

async function main() {
    console.log('🚀 Seeding pages...');

    for (const page of pages) {
        const existing = await prisma.page.findUnique({
            where: { key: page.key },
        });

        if (!existing) {
            await prisma.page.create({ data: page });
            console.log(`✅ Created page: ${page.nameAr} (${page.key})`);
        } else {
            await prisma.page.update({
                where: { key: page.key },
                data: page,
            });
            console.log(`🔄 Updated page: ${page.nameAr} (${page.key})`);
        }
    }

    console.log('✅ Pages seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
