/**
 * create-test-admin.js
 * Run this on the server to add a temporary test admin user.
 * Usage: node scripts/create-test-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const TEST_USERNAME = 'testadmin';
const TEST_PASSWORD = 'TestAdmin@2025!';
const TEST_FULL_NAME = 'Test Administrator';

async function main() {
    console.log('\n🔧 Creating test admin user...\n');

    // 1. Check user doesn't already exist
    const existing = await prisma.user.findUnique({
        where: { username: TEST_USERNAME },
    });
    if (existing) {
        console.log(`⚠️  User "${TEST_USERNAME}" already exists (id=${existing.id}). Nothing to do.`);
        console.log(`   To reset the password, delete the user first via the admin panel or DB.`);
        return;
    }

    // 2. Find ADMIN role
    const adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN' },
    });
    if (!adminRole) {
        console.error('❌ ADMIN role not found in the database.');
        console.error('   Make sure the DB has been seeded: npx prisma db seed');
        process.exit(1);
    }

    // 3. Find first active branch
    const branch = await prisma.branch.findFirst({
        where: { active: true },
        orderBy: { id: 'asc' },
    });
    if (!branch) {
        console.error('❌ No active branch found in the database.');
        process.exit(1);
    }

    // 4. Hash password and create user
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    const user = await prisma.user.create({
        data: {
            username: TEST_USERNAME,
            fullName: TEST_FULL_NAME,
            passwordHash,
            branchId: branch.id,
            active: true,
            roles: {
                create: { roleId: adminRole.id },
            },
        },
        include: {
            roles: { include: { role: true } },
            branch: true,
        },
    });

    console.log('✅ Test admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Username : ${user.username}`);
    console.log(`   Password : ${TEST_PASSWORD}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Role     : ${user.roles[0]?.role?.name}`);
    console.log(`   Branch   : ${user.branch?.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  Remember to delete this user after testing!\n');
}

main()
    .catch((err) => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
