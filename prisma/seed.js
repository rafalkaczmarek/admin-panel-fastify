import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'admin@dashstack.com';
const DEMO_PASSWORD = 'admin123';
const BCRYPT_ROUNDS = 10;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, roles: ['admin'] },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      roles: ['admin'],
    },
  });

  console.log(`Seeded user: ${user.email} (id=${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
