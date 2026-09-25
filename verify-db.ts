import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing database connection...');
  try {
    // Attempt to query the database's information schema for tables in the public schema
    const tables: any[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name;
    `;
    
    console.log('✅ Successfully connected to Supabase PostgreSQL!');
    console.log('\nFound the following tables in the public schema:');
    
    const tableNames = tables.map(t => t.table_name);
    tableNames.forEach(t => console.log(` - ${t}`));
    
    // Check against expected tables based on our Prisma schema
    const expectedTables = [
      'Member', 'ChitGroup', 'GroupMember', 'Auction', 
      'Bid', 'Installment', 'Payment', 'Payout', 
      'Expense', 'AuditLog'
    ];
    
    const missing = expectedTables.filter(t => !tableNames.includes(t));
    if (missing.length === 0) {
      console.log('\n✅ All expected Prisma models have matching tables in the database.');
    } else {
      console.log('\n❌ Missing expected tables:', missing);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
