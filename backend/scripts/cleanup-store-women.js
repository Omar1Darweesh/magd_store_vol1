/**
 * cleanup-store-women.js
 * Removes all products seeded from the STORE FOR WOMEN data (code prefix SW-)
 * and cleans up orphaned suppliers / categories / subcategories.
 *
 * Run on server:
 *   cd /opt/magd-store/backend
 *   node cleanup-store-women.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n🧹 Starting cleanup of STORE FOR WOMEN seed data...\n');

    // 1. Find all SW- products
    const products = await prisma.product.findMany({
        where: { code: { startsWith: 'SW-' } },
        select: { id: true, code: true },
    });

    if (products.length === 0) {
        console.log('ℹ️  No SW- products found. Nothing to clean up.');
        return;
    }

    const productIds = products.map(p => p.id);
    console.log(`Found ${productIds.length} SW- products to remove.`);

    // 2. Delete related records in order (no cascade on these)
    console.log('  Deleting stock movements...');
    const sm = await prisma.stockMovement.deleteMany({
        where: { productId: { in: productIds } },
    });
    console.log(`  ✓ ${sm.count} stock movements deleted`);

    console.log('  Deleting price history...');
    const ph = await prisma.priceHistory.deleteMany({
        where: { productId: { in: productIds } },
    });
    console.log(`  ✓ ${ph.count} price history records deleted`);

    console.log('  Deleting product audits...');
    const pa = await prisma.productAudit.deleteMany({
        where: { productId: { in: productIds } },
    });
    console.log(`  ✓ ${pa.count} product audits deleted`);

    // 3. Delete the products
    console.log('  Deleting products...');
    const pd = await prisma.product.deleteMany({
        where: { id: { in: productIds } },
    });
    console.log(`  ✓ ${pd.count} products deleted`);

    // 4. Remove orphaned suppliers (no remaining products)
    console.log('  Removing orphaned suppliers...');
    const suppliersWithProducts = await prisma.supplier.findMany({
        where: { products: { some: {} } },
        select: { id: true },
    });
    const usedSupplierIds = suppliersWithProducts.map(s => s.id);
    const orphanSuppliers = await prisma.supplier.deleteMany({
        where: {
            id: { notIn: usedSupplierIds },
            goodsReceipts: { none: {} },
            purchaseOrders: { none: {} },
            payments: { none: {} },
        },
    });
    console.log(`  ✓ ${orphanSuppliers.count} orphaned suppliers removed`);

    // 5. Remove orphaned categories (no remaining products)
    console.log('  Removing orphaned categories...');
    const catsWithProducts = await prisma.category.findMany({
        where: { products: { some: {} } },
        select: { id: true },
    });
    const usedCatIds = catsWithProducts.map(c => c.id);
    const orphanCats = await prisma.category.deleteMany({
        where: {
            id: { notIn: usedCatIds },
            name: { in: ['حريمي', 'بناتي'] }, // only remove the ones we created
        },
    });
    console.log(`  ✓ ${orphanCats.count} orphaned categories removed`);

    // 6. Remove orphaned itemTypes then subcategories
    console.log('  Removing orphaned itemTypes...');
    const orphanItemTypes = await prisma.itemType.deleteMany({
        where: { products: { none: {} } },
    });
    console.log(`  ✓ ${orphanItemTypes.count} orphaned itemTypes removed`);

    console.log('  Removing orphaned subcategories...');
    const orphanSubs = await prisma.subcategory.deleteMany({
        where: { itemTypes: { none: {} } },
    });
    console.log(`  ✓ ${orphanSubs.count} orphaned subcategories removed`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Cleanup complete! Ready for fresh seed.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
