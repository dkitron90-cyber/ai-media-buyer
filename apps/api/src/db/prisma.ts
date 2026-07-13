import { PrismaClient } from '@prisma/client';
import { config } from '../lib/env';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

