import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { initAdmin } from '../server/database/initAdmin';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING CLEAN DATABASE SEEDING ---');

  // Seed default configuration settings with empty clean production values
  const settings = [
    { key: 'companyName', value: 'BKT Yonetim' },
    { key: 'smsProvider', value: '' },
    { key: 'smsApiKey', value: '' },
    { key: 'mailHost', value: '' },
    { key: 'mailPort', value: '' },
    { key: 'mailUser', value: '' },
    { key: 'mailPass', value: '' },
    { key: 'googleDriveFolderId', value: '' }
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
  }
  console.log('✔ Clean Settings seeded');

  // Seed secure administrator user
  await initAdmin();

  console.log('✔ Secure system administrator user seeded via initAdmin');
  console.log('--- DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
