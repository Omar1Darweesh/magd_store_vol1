const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const page = await prisma.page.upsert({
        where: { key: 'day-cash-sheet' },
        create: {
            key: 'day-cash-sheet',
            nameAr: 'يومية الصندوق',
            nameEn: 'Day Cash Sheet',
            route: '/day-cash-sheet',
            category: 'admin',
            icon: 'BookOpen',
            sortOrder: 18,
            active: true,
        },
        update: {
            nameAr: 'يومية الصندوق',
            nameEn: 'Day Cash Sheet',
            route: '/day-cash-sheet',
            icon: 'BookOpen',
            sortOrder: 18,
        },
    });
    console.log('Page upserted:', page.id, page.key);

    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    if (adminRole) {
        await prisma.rolePage.upsert({
            where: { roleId_pageId: { roleId: adminRole.id, pageId: page.id } },
            create: { roleId: adminRole.id, pageId: page.id },
            update: {},
        });
        console.log('Assigned to ADMIN role (id=' + adminRole.id + ')');
    } else {
        console.log('ADMIN role not found, skipping assignment');
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
