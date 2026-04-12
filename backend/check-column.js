const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='manual_pricing'`
  .then(r => { console.log('manual_pricing exists:', r.length > 0, JSON.stringify(r)); })
  .catch(e => { console.error('Error:', e.message); })
  .finally(() => p.$disconnect());
