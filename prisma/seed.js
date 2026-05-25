import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'admin@dashstack.com';
const DEMO_PASSWORD = 'admin123';
const BCRYPT_ROUNDS = 10;

const SEED_PRODUCTS = [
  {
    image: 'https://placehold.co/48x48/4880ff/fff?text=AW',
    name: 'Apple Watch Series 4',
    category: 'Digital Product',
    price: 690.0,
    piece: 63,
    availableColors: ['#333333', '#4880ff', '#00b69b'],
  },
  {
    image: 'https://placehold.co/48x48/ff9f43/fff?text=MS',
    name: 'Microsoft Headsquare',
    category: 'Digital Product',
    price: 190.0,
    piece: 13,
    availableColors: ['#f93c65', '#ff9f43'],
  },
  {
    image: 'https://placehold.co/48x48/00b69b/fff?text=WC',
    name: "Women's Casual Wear",
    category: 'Fashion',
    price: 640.0,
    piece: 635,
    availableColors: ['#4880ff', '#00b69b', '#ff9f43', '#333333'],
  },
  {
    image: 'https://placehold.co/48x48/f93c65/fff?text=SM',
    name: 'Samsung A50',
    category: 'Mobile',
    price: 400.0,
    piece: 0,
    availableColors: ['#333333', '#4880ff'],
  },
  {
    image: 'https://placehold.co/48x48/333/fff?text=CA',
    name: 'Camera Nikon',
    category: 'Electronic',
    price: 420.0,
    piece: 468,
    availableColors: ['#333333'],
  },
  {
    image: 'https://placehold.co/48x48/4880ff/fff?text=SE',
    name: 'Sennheiser Case',
    category: 'Electronic',
    price: 180.0,
    piece: 249,
    availableColors: ['#333333', '#f93c65', '#4880ff'],
  },
  {
    image: 'https://placehold.co/48x48/ff9f43/fff?text=AP',
    name: 'Apple Airpods',
    category: 'Electronic',
    price: 120.0,
    piece: 0,
    availableColors: ['#333333'],
  },
  {
    image: 'https://placehold.co/48x48/00b69b/fff?text=JB',
    name: 'JBL Headphones',
    category: 'Electronic',
    price: 250.0,
    piece: 102,
    availableColors: ['#333333', '#00b69b', '#4880ff'],
  },
];

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

  const existingCount = await prisma.product.count();
  if (existingCount === 0) {
    await prisma.product.createMany({ data: SEED_PRODUCTS });
    console.log(`Seeded ${SEED_PRODUCTS.length} products`);
  } else {
    console.log(`Skipped product seed (${existingCount} products already in DB)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
