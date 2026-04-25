/**
 * seed-store-women.js
 * Seeds categories, subcategories, suppliers, products and initial stock
 * from seed-data.json (exported from STORE_FOR_WOMEN_SeedData.xlsx)
 *
 * Run on the server:
 *   cd /opt/magd-store/backend
 *   node seed-store-women.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_FILE = path.join(__dirname, 'seed-data.json');

function slugCode(idx) {
    return `SW-${String(idx).padStart(4, '0')}`;
}

async function getOrCreate(model, where, create, cache, label) {
    const key = JSON.stringify(where);
    if (cache[key]) return cache[key];
    let record = await model.findFirst({ where });
    if (!record) {
        record = await model.create({ data: create });
        console.log(`  ✚ ${label} created: ${record.name}`);
    }
    cache[key] = record;
    return record;
}

async function main() {
    console.log('\n🌱 Starting STORE FOR WOMEN seed...\n');

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`❌ seed-data.json not found at: ${DATA_FILE}`);
        process.exit(1);
    }

    const records = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`📦 Records to seed: ${records.length}\n`);

    const adminUser = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { id: 'asc' },
    });
    if (!adminUser) { console.error('❌ No active user found.'); process.exit(1); }

    const stockLocation = await prisma.stockLocation.findFirst({
        where: { active: true },
        orderBy: { id: 'asc' },
    });
    if (!stockLocation) { console.error('❌ No active stock location found.'); process.exit(1); }

    console.log(`👤 Using user     : ${adminUser.username}`);
    console.log(`📍 Using location : ${stockLocation.name}\n`);

    const catCache = {};
    const subCache = {};
    const itemTypeCache = {};
    const supCache = {};

    let created = 0, skipped = 0, errors = 0;

    for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        const code = slugCode(i + 1);

        try {
            // Skip if product with same name+color+supplier already exists
            const existing = await prisma.product.findFirst({
                where: {
                    nameAr: rec.name,
                    color: rec.color || null,
                    supplier: rec.supplier ? { name: rec.supplier } : undefined,
                },
            });
            if (existing) { skipped++; continue; }

            // Level 1: Category
            const category = await getOrCreate(
                prisma.category,
                { name: rec.category },
                { name: rec.category, nameAr: rec.category, active: true },
                catCache,
                'Category'
            );

            // Level 2: Subcategory (linked to category)
            let itemType = null;
            if (rec.subcategory) {
                const subcategory = await getOrCreate(
                    prisma.subcategory,
                    { categoryId: category.id, name: rec.subcategory },
                    { categoryId: category.id, name: rec.subcategory, nameAr: rec.subcategory, active: true },
                    subCache,
                    'Subcategory'
                );

                // Level 3: ItemType — one default per subcategory (same name), required for product→subcategory link
                itemType = await getOrCreate(
                    prisma.itemType,
                    { subcategoryId: subcategory.id, name: rec.subcategory },
                    { subcategoryId: subcategory.id, name: rec.subcategory, nameAr: rec.subcategory, active: true },
                    itemTypeCache,
                    'ItemType'
                );
            }

            // Supplier
            const supplier = rec.supplier
                ? await getOrCreate(
                    prisma.supplier,
                    { name: rec.supplier },
                    { name: rec.supplier, active: true },
                    supCache,
                    'Supplier'
                )
                : null;

            // Product — costMethod: LAST_PRICE, itemTypeId links product to subcategory for filtering
            const product = await prisma.product.create({
                data: {
                    code,
                    nameEn: rec.name,
                    nameAr: rec.name,
                    color: rec.color || null,
                    cost: rec.cost,
                    costAvg: rec.cost,
                    costMethod: 'LAST_PRICE',
                    priceRetail: rec.retail,
                    priceWholesale: rec.wholesale,
                    manualPricing: true,
                    active: true,
                    unit: 'PCS',
                    categoryId: category.id,
                    itemTypeId: itemType ? itemType.id : null,
                    supplierId: supplier ? supplier.id : null,
                },
            });

            // Initial stock movement
            if (rec.qty > 0) {
                await prisma.stockMovement.create({
                    data: {
                        productId: product.id,
                        stockLocationId: stockLocation.id,
                        qtyChange: rec.qty,
                        movementType: 'ADJUSTMENT',
                        notes: 'إدخال أولي - متجر الحريمي',
                        createdBy: adminUser.id,
                    },
                });
            }

            created++;
            if (created % 50 === 0) {
                console.log(`  ⏳ Progress: ${created} created, ${skipped} skipped...`);
            }
        } catch (err) {
            console.error(`  ❌ Row ${i + 1} (${rec.name}): ${err.message}`);
            errors++;
        }
    }

    // Fix costMethod and costAvg for ALL products
    console.log('\n🔧 Setting costMethod = LAST_PRICE and costAvg = cost for all products...');
    const fixResult = await prisma.$executeRaw`UPDATE products SET cost_method = 'LAST_PRICE', cost_avg = cost`;
    console.log(`   ✅ Updated ${fixResult} product(s)\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Seed complete!');
    console.log(`   Created       : ${created} products`);
    console.log(`   Skipped       : ${skipped} (already existed)`);
    console.log(`   Errors        : ${errors}`);
    console.log(`   Categories    : ${Object.keys(catCache).length}`);
    console.log(`   Subcategories : ${Object.keys(subCache).length}`);
    console.log(`   ItemTypes     : ${Object.keys(itemTypeCache).length}`);
    console.log(`   Suppliers     : ${Object.keys(supCache).length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
    .catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
