// test-db.ts at project root (backend/)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  try {
    const result = await prisma.$queryRaw`SELECT current_user, current_database()`;
    console.log('DB OK:', result);
  } catch (err) {
    console.error('DB ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('Done.');
  })
  .catch((e) => {
    console.error('Unexpected error:', e);
    process.exit(1);
  });